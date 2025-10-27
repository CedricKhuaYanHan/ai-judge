/**
 * API Route for Importing Submission Data
 * Handles bulk import of submissions with question templates and answers in new normalized schema
 */

import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { supabase } from "~/lib/supabase";
import { ApiHandler } from "~/lib/api-handler";
import type {
  SubmissionImportResult,
  ParsedSubmissionData,
} from "~/lib/types/api-types";

export async function importSubmissions(
  parsedData: ParsedSubmissionData
): Promise<SubmissionImportResult> {
  const result: SubmissionImportResult = {
    success: false,
    createdCounts: {
      submissions: 0,
      question_templates: 0,
      answers: 0,
    },
    errors: [],
  };

  try {
    // Use the already parsed data directly
    const { submissions, question_templates, answers, answer_queues } =
      parsedData;

    // Import submissions with labeling_task_id
    const submissionInserts = submissions.map((submission: any) => ({
      submission_id: submission.submission_id,
      labeling_task_id: submission.labeling_task_id,
      created_at: submission.created_at,
    }));

    const { error: submissionError } = await supabase
      .from("submissions")
      .insert(submissionInserts);

    if (submissionError) {
      result.errors.push(
        `Error importing submissions: ${submissionError.message}`
      );
      return result;
    }

    result.createdCounts.submissions = submissions.length;

    // Import question templates (deduplicated)
    const questionTemplateInserts = question_templates.map((template: any) => ({
      question_template_id: template.question_template_id,
      revision: template.revision,
      question_text: template.question_text,
      question_type: template.question_type,
      created_at: template.created_at,
    }));

    if (questionTemplateInserts.length > 0) {
      const { error: templateError } = await supabase
        .from("question_templates")
        .insert(questionTemplateInserts);

      if (templateError) {
        result.errors.push(
          `Error importing question templates: ${templateError.message}`
        );
        return result;
      }

      result.createdCounts.question_templates = questionTemplateInserts.length;
    }

    // Import answers
    const answerInserts = answers.map((answer: any) => ({
      answer_id: answer.answer_id,
      submission_id: answer.submission_id,
      question_template_id: answer.question_template_id,
      question_revision: answer.question_revision,
      answer_value: answer.answer_value,
      created_at: answer.created_at,
    }));

    if (answerInserts.length > 0) {
      const { error: answerError } = await supabase
        .from("answers")
        .insert(answerInserts);

      if (answerError) {
        result.errors.push(`Error importing answers: ${answerError.message}`);
        return result;
      }

      result.createdCounts.answers = answerInserts.length;
    }

    // Import answer-queue relationships
    if (answer_queues.length > 0) {
      const { error: queueError } = await supabase
        .from("answer_queues")
        .insert(answer_queues);

      if (queueError) {
        result.errors.push(
          `Error importing answer-queue relationships: ${queueError.message}`
        );
        return result;
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    result.errors.push(errorMessage);
    return result;
  }
}

export async function getQueues() {
  try {
    const { data, error } = await supabase
      .from("answer_queues")
      .select("queue_id")
      .order("queue_id");

    if (error) {
      throw new Error(`Failed to fetch queues: ${error.message}`);
    }

    // Get unique queue IDs
    const uniqueQueues = [...new Set(data?.map((q) => q.queue_id) || [])];
    return uniqueQueues.map((queueId) => ({ queue_id: queueId }));
  } catch (error) {
    console.error("Error fetching queues:", error);
    throw error;
  }
}

export async function getSubmissions(queueId?: string) {
  try {
    // For now, we'll just fetch all submissions without queue filtering
    // TODO: Implement proper queue filtering when the relationship is fixed
    const { data, error } = await supabase
      .from("submissions")
      .select("submission_id, labeling_task_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching submissions:", error);
    throw error;
  }
}

export async function getSubmissionDetails(submissionId: string) {
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select(
        `
        submission_id,
        labeling_task_id,
        created_at,
        answers(
          answer_id,
          question_template_id,
          question_revision,
          answer_value,
          created_at,
          question_templates(
            question_template_id,
            question_text,
            question_type
          )
        )
      `
      )
      .eq("submission_id", submissionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch submission details: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching submission details:", error);
    throw error;
  }
}

// API Route Loader Function for GET requests
export async function loader({ request }: LoaderFunctionArgs) {
  return ApiHandler.handleLoader(async () => {
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("submission_id, labeling_task_id, created_at");

    const { data: questionTemplates, error: templateError } = await supabase
      .from("question_templates")
      .select("*");

    const { data: answers, error: answerError } = await supabase
      .from("answers")
      .select("*");

    const queues = await getQueues();

    return {
      submissions: submissions || [],
      question_templates: questionTemplates || [],
      answers: answers || [],
      queues: queues || [],
      errors: error ? [error.message] : [],
    };
  });
}

// API Route Action Function
export async function action({ request }: ActionFunctionArgs) {
  const methodCheck = ApiHandler.checkMethod(request, ["POST"]);
  if (methodCheck) return methodCheck;

  return ApiHandler.handleJsonAction(request, {
    import: importSubmissionsAction,
  });
}

async function importSubmissionsAction(body: any) {
  // Extract parsed data from the body
  const parsedData = body.parsedData;

  // Validate that we have parsed data
  if (
    !parsedData ||
    !parsedData.submissions ||
    !parsedData.question_templates ||
    !parsedData.answers ||
    !parsedData.answer_queues
  ) {
    throw new Error(
      "Expected parsed submission data with submissions, question_templates, answers, and answer_queues"
    );
  }

  const result = await importSubmissions(parsedData);
  return result;
}
