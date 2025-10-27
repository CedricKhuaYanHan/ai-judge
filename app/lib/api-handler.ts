/**
 * Shared API handler utility for React Router API routes
 * Eliminates boilerplate code and provides consistent error handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class ApiHandler {
  /**
   * Handle form-based actions with consistent error handling
   */
  static async handleFormAction<T>(
    request: Request,
    actions: Record<string, (formData: FormData) => Promise<T>>
  ): Promise<Response> {
    try {
      const formData = await request.formData();
      const action = formData.get("action") as string;

      if (!action || !actions[action]) {
        return this.errorResponse("Invalid action", 400);
      }

      const result = await actions[action](formData);
      return this.successResponse(result);
    } catch (error) {
      console.error("API action error:", error);
      return this.errorResponse(
        error instanceof Error ? error.message : "An unexpected error occurred",
        500
      );
    }
  }

  /**
   * Handle JSON-based actions with consistent error handling
   */
  static async handleJsonAction<T>(
    request: Request,
    actions: Record<string, (body: any) => Promise<T>>
  ): Promise<Response> {
    try {
      const body = await request.json();
      const action = body.action as string;

      if (!action || !actions[action]) {
        return this.errorResponse("Invalid action", 400);
      }

      const result = await actions[action](body);
      return this.successResponse(result);
    } catch (error) {
      console.error("API action error:", error);
      return this.errorResponse(
        error instanceof Error ? error.message : "An unexpected error occurred",
        500
      );
    }
  }

  /**
   * Handle loader functions with consistent error handling
   */
  static async handleLoader<T>(
    loaderFn: () => Promise<T>
  ): Promise<Response> {
    try {
      const data = await loaderFn();
      return this.successResponse(data);
    } catch (error) {
      console.error("API loader error:", error);
      return this.errorResponse(
        error instanceof Error ? error.message : "Unknown error",
        500
      );
    }
  }

  /**
   * Create a success response
   */
  static successResponse<T>(data: T): Response {
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Create an error response
   */
  static errorResponse(message: string, status: number = 500): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Create a validation error response
   */
  static validationErrorResponse(errors: string[]): Response {
    return new Response(JSON.stringify({ success: false, errors }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Extract form data with type safety
   */
  static extractFormData<T extends Record<string, any>>(
    formData: FormData,
    schema: any
  ): T {
    const rawData: Record<string, any> = {};
    
    // Extract all form fields
    for (const [key, value] of formData.entries()) {
      rawData[key] = value;
    }

    // Parse boolean fields
    Object.keys(rawData).forEach(key => {
      if (rawData[key] === "true") rawData[key] = true;
      if (rawData[key] === "false") rawData[key] = false;
    });

    return schema.parse(rawData);
  }

  /**
   * Check if request method is allowed
   */
  static checkMethod(request: Request, allowedMethods: string[]): Response | null {
    if (!allowedMethods.includes(request.method)) {
      return this.errorResponse("Method not allowed", 405);
    }
    return null;
  }
}
