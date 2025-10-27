import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import type { Judge, LLMProvider } from "~/lib/types/database-types";
import { LLM_PROVIDERS } from "~/lib/types/api-types";

interface JudgeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingJudge?: Judge | null;
}

interface FormData {
  judge_id: string;
  name: string;
  provider: LLMProvider;
  model: string;
  prompt: string;
  is_active: boolean;
}

// Generate a UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
}

const defaultFormData: FormData = {
  judge_id: generateUUID(),
  name: "",
  provider: "openai",
  model: "",
  prompt: "",
  is_active: true,
};

export function JudgeForm({
  isOpen,
  onClose,
  onSuccess,
  editingJudge,
}: JudgeFormProps) {
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state === "submitting";

  // Initialize form data when modal opens
  useEffect(() => {
    if (editingJudge) {
      // Editing existing judge
      setFormData({
        judge_id: editingJudge.judge_id,
        name: editingJudge.name,
        provider: editingJudge.provider,
        model: editingJudge.model,
        prompt: editingJudge.prompt,
        is_active: editingJudge.is_active ?? true,
      });
    } else {
      // Creating new judge
      setFormData({
        ...defaultFormData,
        judge_id: generateUUID(),
      });
    }
    setErrors({});
  }, [isOpen, editingJudge]);

  // Handle form submission
  useEffect(() => {
    // Wait for the submission to complete (not just submitting)
    if (fetcher.state === "idle" && fetcher.data?.success) {
      onSuccess?.();
    } else if (fetcher.state === "idle" && fetcher.data?.error) {
      setErrors({ general: fetcher.data.error });
    }
  }, [fetcher.data, fetcher.state, onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.model.trim()) {
      newErrors.model = "Model is required";
    }
    if (!formData.prompt.trim()) {
      newErrors.prompt = "Prompt is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    const formDataToSubmit = new FormData();
    const action = editingJudge ? "update" : "create";
    formDataToSubmit.append("action", action);
    formDataToSubmit.append("judge_id", formData.judge_id);
    formDataToSubmit.append("name", formData.name);
    formDataToSubmit.append("provider", formData.provider);
    formDataToSubmit.append("model", formData.model);
    formDataToSubmit.append("prompt", formData.prompt);
    formDataToSubmit.append("is_active", formData.is_active.toString());

    fetcher.submit(formDataToSubmit, {
      method: "POST",
      action: "/api/judges",
    });
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProviderChange = (provider: LLMProvider) => {
    setFormData((prev) => ({
      ...prev,
      provider,
      model: LLM_PROVIDERS[provider].models[0] || "",
    }));
  };

  const generatePreview = () => {
    const provider = LLM_PROVIDERS[formData.provider];
    return `Judge ID: ${formData.judge_id} (auto-generated)
Provider: ${provider.displayName}
Model: ${formData.model}
Prompt: ${formData.prompt}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingJudge ? "Edit Judge" : "Create New Judge"}
          </DialogTitle>
          <DialogDescription>
            {editingJudge
              ? "Update the configuration for this AI judge."
              : "Configure a new AI judge for evaluating submissions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Strict Quality Judge, Lenient Judge"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
            <p className="text-sm text-gray-600">
              Display name for this judge.
            </p>
          </div>

          {/* Provider and Model Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LLM_PROVIDERS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <span>{provider.displayName}</span>
                        <Badge variant="outline" className="text-xs">
                          {provider.models.length} models
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => handleInputChange("model", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS[formData.provider].models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.model && (
                <p className="text-sm text-red-600">{errors.model}</p>
              )}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">System Prompt *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-1"
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span>{showPreview ? "Edit Prompt" : "Show Preview"}</span>
              </Button>
            </div>

            <div className="relative">
              {/* System Prompt Textarea */}
              <div
                className={`transition-opacity duration-300 ${
                  showPreview
                    ? "opacity-0 absolute inset-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => handleInputChange("prompt", e.target.value)}
                  placeholder="Enter the system prompt for this judge..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              {/* Preview */}
              <div
                className={`transition-opacity duration-300 ${
                  showPreview
                    ? "opacity-100"
                    : "opacity-0 absolute inset-0 pointer-events-none"
                }`}
              >
                <div className="bg-gray-50 p-4 rounded-md border min-h-[200px]">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {generatePreview()}
                  </pre>
                </div>
              </div>
            </div>

            {errors.prompt && (
              <p className="text-sm text-red-600">{errors.prompt}</p>
            )}
            <p className="text-sm text-gray-600">
              The system prompt that defines how this judge evaluates
              submissions.
            </p>
          </div>

          {/* Error Display */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? editingJudge
                  ? "Updating..."
                  : "Creating..."
                : editingJudge
                ? "Update Judge"
                : "Create Judge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
