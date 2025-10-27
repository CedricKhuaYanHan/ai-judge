import { useState, useEffect } from "react";
import { TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Paperclip } from "lucide-react";
import type { Attachment } from "~/lib/types/database-types";

interface AttachmentCountCellProps {
  answerId: string;
}

export function AttachmentCountCell({ answerId }: AttachmentCountCellProps) {
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
        console.log(`Attachment count for answer ${answerId}:`, data);
        // Handle the ApiHandler wrapped response structure
        const attachments = data.data?.attachments || [];
        setAttachmentCount(attachments.length);
      } else {
        console.error("Failed to fetch attachment count for answer", answerId);
        const errorText = await response.text();
        console.error("Error response:", errorText);
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

  if (isLoading) {
    return (
      <TableCell className="w-[100px]">
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell className="w-[100px]">
      <div className="flex items-center justify-center">
        {attachmentCount > 0 ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            {attachmentCount}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No files</span>
        )}
      </div>
    </TableCell>
  );
}
