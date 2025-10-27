import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { FileText, Image, Download, Trash2, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Attachment } from "~/lib/types/database-types";

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (attachmentId: string) => Promise<void>;
  onRefresh: () => void;
}

export function AttachmentList({
  attachments,
  onDelete,
  onRefresh,
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (attachmentId: string) => {
    try {
      setDeletingId(attachmentId);
      await onDelete(attachmentId);
      onRefresh();
    } catch (error) {
      console.error("Error deleting attachment:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.type?.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getFileTypeBadge = (attachment: Attachment) => {
    if (attachment.type?.startsWith("image/")) {
      return <Badge variant="secondary">Image</Badge>;
    }
    if (attachment.type === "application/pdf") {
      return <Badge variant="secondary">PDF</Badge>;
    }
    return <Badge variant="outline">{attachment.type || "File"}</Badge>;
  };

  const formatFileSize = (attachment: Attachment) => {
    if (!attachment.file_size) {
      return "Size unknown";
    }

    const bytes = attachment.file_size;
    const sizes = ["Bytes", "KB", "MB", "GB"];

    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);

    return `${size} ${sizes[i]}`;
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.url.split("/").pop() || "attachment";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: Attachment) => {
    window.open(attachment.url, "_blank");
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No attachments uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">
        Attachments ({attachments.length})
      </h4>

      <div className="grid gap-3">
        {attachments.map((attachment) => (
          <Card key={attachment.attachment_id} className="p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">{getFileIcon(attachment)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p
                              className="text-sm font-medium truncate max-w-[200px]"
                              title={
                                attachment.url.split("/").pop() ||
                                "Unknown file"
                              }
                            >
                              {attachment.url.split("/").pop() ||
                                "Unknown file"}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs break-words">
                              {attachment.url.split("/").pop() ||
                                "Unknown file"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {getFileTypeBadge(attachment)}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment)}</span>
                      {attachment.created_at && (
                        <span>
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(attachment)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-600 hover:bg-red-50"
                        disabled={deletingId === attachment.attachment_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this attachment? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(attachment.attachment_id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
