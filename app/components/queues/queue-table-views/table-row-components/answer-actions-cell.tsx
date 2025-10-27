import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { TableCell } from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { MoreHorizontal, Trash2, Paperclip } from "lucide-react";
import { AttachmentUploader } from "~/components/submissions/attachment-uploader";
import { AttachmentList } from "~/components/submissions/attachment-list";
import type { Attachment } from "~/lib/types/database-types";

interface AnswerActionsCellProps {
  answerId: string;
  onRemoveFromQueue: (answerId: string) => Promise<void>;
  onAttachmentChange?: () => void;
}

export function AnswerActionsCell({
  answerId,
  onRemoveFromQueue,
  onAttachmentChange,
}: AnswerActionsCellProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchAttachments = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("action", "list");
      formData.append("answerId", answerId);

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `AnswerActionsCell - Attachments for answer ${answerId}:`,
          data
        );
        // Handle the ApiHandler wrapped response structure
        const attachments = data.data?.attachments || [];
        setAttachments(attachments);
      } else {
        console.error("Failed to fetch attachments");
        // Retry once if this is the first attempt
        if (retryCount === 0) {
          setTimeout(() => fetchAttachments(1), 1000);
        }
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
      // Retry once if this is the first attempt
      if (retryCount === 0) {
        setTimeout(() => fetchAttachments(1), 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("attachmentId", attachmentId);

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      // Refresh attachments list
      await fetchAttachments();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      throw error;
    }
  };

  const handleUploadComplete = async () => {
    // Add a small delay to ensure database consistency, then fetch with retry
    setTimeout(async () => {
      await fetchAttachments();
    }, 100);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    // If dialog is closing (open = false), trigger refresh
    if (!open && onAttachmentChange) {
      onAttachmentChange();
    }
  };

  const handleRemoveFromQueue = async () => {
    try {
      await onRemoveFromQueue(answerId);
    } catch (error) {
      console.error("Error removing answer from queue:", error);
    }
  };

  // Fetch attachments when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      fetchAttachments();
    }
  }, [isDialogOpen, answerId]);

  return (
    <TableCell className="w-[50px]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Paperclip className="h-4 w-4 mr-2" />
                Manage Attachments
                {attachments.length > 0 && (
                  <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                    {attachments.length}
                  </span>
                )}
              </DropdownMenuItem>
            </DialogTrigger>

            <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Attachments</DialogTitle>
                <DialogDescription>
                  Upload images and PDFs to provide additional context for
                  evaluation.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Existing Attachments */}
                <AttachmentList
                  attachments={attachments}
                  onDelete={handleDeleteAttachment}
                  onRefresh={fetchAttachments}
                />

                {/* Upload New Attachments */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium mb-4">
                    Upload New Attachments
                  </h4>
                  <AttachmentUploader
                    answerId={answerId}
                    existingAttachments={attachments}
                    onUploadComplete={handleUploadComplete}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuItem
            onClick={handleRemoveFromQueue}
            className="text-red-600 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  );
}
