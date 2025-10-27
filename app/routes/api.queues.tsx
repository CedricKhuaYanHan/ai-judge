import { type ActionFunctionArgs } from "react-router";
import { supabase } from "~/lib/supabase";
import { ApiHandler } from "~/lib/api-handler";
import type {
  QueueManagementAction,
  AddAnswersToQueueRequest,
  QueueRenameRequest,
  QueueDeleteRequest,
} from "~/lib/types/api-types";

export async function action({ request }: ActionFunctionArgs) {
  return ApiHandler.handleJsonAction(request, {
    rename_queue: renameQueue,
    delete_queue: deleteQueue,
    create_queue: createQueue,
    add_answers: addAnswers,
    remove_answer: removeAnswer,
  });
}

async function renameQueue(body: QueueRenameRequest) {
  const { oldQueueId, newQueueId } = body;

  // Update all answer_queues entries for this queue
  const { error } = await supabase
    .from("answer_queues")
    .update({ queue_id: newQueueId })
    .eq("queue_id", oldQueueId);

  if (error) {
    throw new Error(`Failed to rename queue: ${error.message}`);
  }

  return { message: "Queue renamed successfully" };
}

async function deleteQueue(body: QueueDeleteRequest) {
  const { queueId } = body;

  // Remove all answer_queues entries for this queue
  const { error } = await supabase
    .from("answer_queues")
    .delete()
    .eq("queue_id", queueId);

  if (error) {
    throw new Error(`Failed to delete queue: ${error.message}`);
  }

  return { message: "Queue deleted successfully" };
}

async function createQueue(body: any) {
  const { queueId } = body;

  // Create an empty queue (no questions added yet)
  // This is essentially a no-op since queues are just tags
  // The queue will exist when questions are added to it
  return { message: "Queue created successfully" };
}

async function addAnswers(body: AddAnswersToQueueRequest) {
  const { queueId, answerIds } = body;

  // Add answers to the queue
  const queueEntries = answerIds.map((answerId) => ({
    queue_id: queueId,
    answer_id: answerId,
  }));

  const { error } = await supabase.from("answer_queues").insert(queueEntries);

  if (error) {
    throw new Error(`Failed to add answers to queue: ${error.message}`);
  }

  return { message: "Answers added to queue successfully" };
}

async function removeAnswer(body: any) {
  const { queueId, answerId } = body;

  // Remove specific answer from queue
  const { error } = await supabase
    .from("answer_queues")
    .delete()
    .eq("queue_id", queueId)
    .eq("answer_id", answerId);

  if (error) {
    throw new Error(`Failed to remove answer from queue: ${error.message}`);
  }

  return { message: "Answer removed from queue successfully" };
}
