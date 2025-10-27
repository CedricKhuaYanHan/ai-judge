import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Paperclip } from "lucide-react";

interface SubmissionIdWithAttachmentsProps {
  submissionId: string;
  answerId: string;
}

export interface SubmissionIdWithAttachmentsRef {
  refresh: () => void;
}

export const SubmissionIdWithAttachments = forwardRef<
  SubmissionIdWithAttachmentsRef,
  SubmissionIdWithAttachmentsProps
>(({ submissionId, answerId }, ref) => {
  const [attachmentCount, setAttachmentCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttachmentCount = async () => {
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
        // Handle the ApiHandler wrapped response structure
        const attachments = data.data?.attachments || [];
        setAttachmentCount(attachments.length);
      } else {
        console.error("Failed to fetch attachment count for answer", answerId);
        setAttachmentCount(0);
      }
    } catch (error) {
      console.error(
        "Error fetching attachment count for answer",
        answerId,
        ":",
        error
      );
      setAttachmentCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachmentCount();
  }, [answerId]);

  useImperativeHandle(ref, () => ({
    refresh: fetchAttachmentCount,
  }));

  return (
    <TableCell className="w-[150px]">
      <div className="flex items-center gap-2">
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {submissionId}
        </code>
        {!isLoading && attachmentCount > 0 && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs"
          >
            <Paperclip className="h-3 w-3" />
            {attachmentCount}
          </Badge>
        )}
        {isLoading && (
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        )}
      </div>
    </TableCell>
  );
});
