/**
 * Attachment API routes for file upload, delete, and list operations
 */

import { createClient } from "@supabase/supabase-js";
import { ApiHandler } from "~/lib/api-handler";
import type { Attachment } from "~/lib/types/database-types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase service role key for server operations");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function action({ request }: { request: Request }) {
  return ApiHandler.handleFormAction(request, {
    upload: uploadAttachment as any,
    delete: deleteAttachment as any,
    list: listAttachments as any,
  });
}

async function uploadAttachment(formData: FormData) {
  const file = formData.get("file") as File;
  const filename = formData.get("filename") as string;
  const answerId = formData.get("answerId") as string;

  if (!file || !filename || !answerId) {
    throw new Error("Missing required fields");
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type");
  }

  // Validate file size (50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("File too large");
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error("Upload failed");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("attachments")
    .getPublicUrl(filename);

  // Save metadata to database
  const attachmentId = crypto.randomUUID();
  const { error: dbError } = await supabase.from("attachments").insert({
    attachment_id: attachmentId,
    answer_id: answerId,
    url: urlData.publicUrl,
    type: file.type,
    file_size: file.size,
  });

  if (dbError) {
    console.error("Database insert error:", dbError);
    // Clean up uploaded file
    await supabase.storage.from("attachments").remove([filename]);
    throw new Error("Failed to save attachment metadata");
  }

  return {
    success: true,
    attachment: {
      attachment_id: attachmentId,
      answer_id: answerId,
      url: urlData.publicUrl,
      type: file.type,
      file_size: file.size,
      created_at: new Date().toISOString(),
    },
    attachments: [],
  };
}

async function deleteAttachment(formData: FormData) {
  const attachmentId = formData.get("attachmentId") as string;

  if (!attachmentId) {
    throw new Error("Missing attachment ID");
  }

  // Get attachment info first
  const { data: attachment, error: fetchError } = await supabase
    .from("attachments")
    .select("*")
    .eq("attachment_id", attachmentId)
    .single();

  if (fetchError || !attachment) {
    throw new Error("Attachment not found");
  }

  // Extract filename from URL
  const filename = attachment.url.split("/").pop();
  if (!filename) {
    throw new Error("Invalid attachment URL");
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("attachments")
    .remove([filename]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    // Continue with database deletion even if storage fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("attachments")
    .delete()
    .eq("attachment_id", attachmentId);

  if (dbError) {
    console.error("Database delete error:", dbError);
    throw new Error("Failed to delete attachment");
  }

  return {
    success: true,
    attachment: null,
    attachments: [],
  };
}

async function listAttachments(formData: FormData) {
  const answerId = formData.get("answerId") as string;

  if (!answerId) {
    throw new Error("Missing answer ID");
  }

  const { data: attachments, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("answer_id", answerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Database query error:", error);
    throw new Error("Failed to fetch attachments");
  }

  return {
    success: true,
    attachment: null,
    attachments: attachments || [],
  };
}
