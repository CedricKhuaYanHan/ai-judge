import { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Upload, FileText, Image, X, AlertCircle } from "lucide-react";
import type { Attachment } from "~/lib/types/database-types";

interface AttachmentUploaderProps {
  answerId: string;
  existingAttachments: Attachment[];
  onUploadComplete: () => void;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function AttachmentUploader({
  answerId,
  existingAttachments,
  onUploadComplete,
}: AttachmentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `File type ${file.type} is not allowed. Please upload images (JPEG, PNG, GIF, WebP) or PDFs.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size ${(file.size / 1024 / 1024).toFixed(
        1
      )}MB exceeds the maximum limit of 50MB.`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<void> => {
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const uniqueFilename = `${crypto.randomUUID()}-${file.name}`;

    // Upload to Supabase Storage
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("file", file);
    formData.append("filename", uniqueFilename);
    formData.append("answerId", answerId);

    const response = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(errorData.error || "Upload failed");
    }
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      setError(null);
      const fileArray = Array.from(files);

      // Validate all files first
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      // Start uploads
      const uploadPromises = fileArray.map(async (file) => {
        const upload: UploadProgress = {
          file,
          progress: 0,
          status: "uploading",
        };

        setUploads((prev) => [...prev, upload]);

        try {
          // Simulate progress for better UX
          const progressInterval = setInterval(() => {
            setUploads((prev) =>
              prev.map((u) =>
                u.file === file && u.status === "uploading"
                  ? { ...u, progress: Math.min(u.progress + 10, 90) }
                  : u
              )
            );
          }, 200);

          await uploadFile(file);

          clearInterval(progressInterval);

          setUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, progress: 100, status: "success" } : u
            )
          );

          // Remove from uploads after 2 seconds
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.file !== file));
          }, 2000);

          // Trigger refresh after a short delay to ensure database consistency
          setTimeout(() => {
            onUploadComplete();
          }, 500);
        } catch (error) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file
                ? {
                    ...u,
                    progress: 0,
                    status: "error",
                    error:
                      error instanceof Error ? error.message : "Upload failed",
                  }
                : u
            )
          );
        }
      });

      await Promise.all(uploadPromises);
    },
    [answerId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images (JPEG, PNG, GIF, WebP) and PDFs up to 50MB
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              Choose Files
            </Button>

            <input
              id="file-input"
              type="file"
              multiple
              accept={ALLOWED_MIME_TYPES.join(",")}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          {uploads.map((upload, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {getFileIcon(upload.file)}
                  <span className="truncate max-w-[200px]">
                    {upload.file.name}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {(upload.file.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>

              <Progress value={upload.progress} className="h-2" />

              {upload.status === "error" && upload.error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {upload.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Attachments Count */}
      {existingAttachments.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {existingAttachments.length} attachment(s) already uploaded
        </div>
      )}
    </div>
  );
}
