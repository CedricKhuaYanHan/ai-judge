/**
 * Judge server actions for CRUD operations
 * Updated for new flattened schema
 */

import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { ApiHandler } from "~/lib/api-handler";
import { clearJudgeCache } from "~/lib/services/evaluation-orchestrator";

// Validation schemas
const JudgeCreateSchema = z.object({
  judge_id: z.string().min(1, "Judge ID is required"),
  name: z.string().min(1, "Name is required"),
  provider: z.enum(["openai", "anthropic", "gemini"]),
  model: z.string().min(1, "Model is required"),
  prompt: z.string().min(1, "Prompt is required"),
  is_active: z.boolean().default(true),
});

const JudgeDeleteSchema = z.object({
  judge_id: z.string().min(1, "Judge ID is required"),
});

export async function action({ request }: { request: Request }) {
  return ApiHandler.handleFormAction(request, {
    create: createJudge,
    update: updateJudge,
    delete: deleteJudge,
    toggle: toggleJudge,
  });
}

async function createJudge(formData: FormData) {
  const validatedData = ApiHandler.extractFormData(formData, JudgeCreateSchema);

  // Check if judge ID already exists
  const { data: existingJudge } = await supabase
    .from("judges")
    .select("judge_id")
    .eq("judge_id", validatedData.judge_id)
    .single();

  if (existingJudge) {
    throw new Error("A judge with this ID already exists");
  }

  // Create judge
  const { data: judge, error } = await supabase
    .from("judges")
    .insert({
      judge_id: validatedData.judge_id,
      name: validatedData.name,
      provider: validatedData.provider,
      model: validatedData.model,
      prompt: validatedData.prompt,
      is_active: validatedData.is_active,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create judge: ${error.message}`);
  }

  // Clear cache for this judge
  clearJudgeCache(validatedData.judge_id);

  return { action: "create", judge };
}

async function updateJudge(formData: FormData) {
  const validatedData = ApiHandler.extractFormData(formData, JudgeCreateSchema);

  // Check if judge exists
  const { data: existingJudge } = await supabase
    .from("judges")
    .select("judge_id")
    .eq("judge_id", validatedData.judge_id)
    .single();

  if (!existingJudge) {
    throw new Error("Judge not found");
  }

  // Update judge
  const { data: judge, error } = await supabase
    .from("judges")
    .update({
      name: validatedData.name,
      provider: validatedData.provider,
      model: validatedData.model,
      prompt: validatedData.prompt,
      is_active: validatedData.is_active,
    })
    .eq("judge_id", validatedData.judge_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update judge: ${error.message}`);
  }

  // Clear cache for this judge
  clearJudgeCache(validatedData.judge_id);

  return { action: "update", judge };
}

async function deleteJudge(formData: FormData) {
  const validatedData = ApiHandler.extractFormData(formData, JudgeDeleteSchema);

  // Check if judge exists
  const { data: existingJudge } = await supabase
    .from("judges")
    .select("judge_id")
    .eq("judge_id", validatedData.judge_id)
    .single();

  if (!existingJudge) {
    throw new Error("Judge not found");
  }

  // Delete related data first (evaluations and answer assignments)
  // Delete evaluations for this judge
  const { error: evaluationsError } = await supabase
    .from("evaluations")
    .delete()
    .eq("judge_id", validatedData.judge_id);

  if (evaluationsError) {
    console.warn("Error deleting evaluations:", evaluationsError);
    // Continue with deletion even if evaluations fail
  }

  // Delete answer judge assignments
  const { error: assignmentsError } = await supabase
    .from("answer_judges")
    .delete()
    .eq("judge_id", validatedData.judge_id);

  if (assignmentsError) {
    console.warn("Error deleting answer assignments:", assignmentsError);
    // Continue with deletion even if assignments fail
  }

  // Delete judge
  const { error } = await supabase
    .from("judges")
    .delete()
    .eq("judge_id", validatedData.judge_id);

  if (error) {
    throw new Error(`Failed to delete judge: ${error.message}`);
  }

  // Clear cache for this judge
  clearJudgeCache(validatedData.judge_id);

  return { action: "delete" };
}

async function toggleJudge(formData: FormData) {
  const judgeId = formData.get("judge_id") as string;
  const isActive = formData.get("is_active") === "true";

  if (!judgeId) {
    throw new Error("Judge ID is required");
  }

  // Check if judge exists
  const { data: existingJudge } = await supabase
    .from("judges")
    .select("judge_id")
    .eq("judge_id", judgeId)
    .single();

  if (!existingJudge) {
    throw new Error("Judge not found");
  }

  // Update judge status
  const { data: judge, error } = await supabase
    .from("judges")
    .update({ is_active: isActive })
    .eq("judge_id", judgeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle judge: ${error.message}`);
  }

  // Clear cache for this judge
  clearJudgeCache(judgeId);

  return { action: "toggle", judge };
}
