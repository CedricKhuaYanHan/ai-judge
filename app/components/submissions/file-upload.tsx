/**
 * File Upload Component for JSON Submission Data
 * Provides drag-and-drop functionality with validation and preview
 */

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  parseSubmissionData,
  validateJsonFile,
  getImportStats,
} from "~/lib/services/submission-parser";
import type { ParsedSubmissionData } from "~/lib/types/api-types";

interface FileUploadProps {
  onDataParsed: (data: ParsedSubmissionData) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface UploadState {
  isDragOver: boolean;
  isProcessing: boolean;
  file: File | null;
  parsedData: ParsedSubmissionData | null;
  error: string | null;
}

export function FileUpload({
  onDataParsed,
  onError,
  disabled = false,
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>({
    isDragOver: false,
    isProcessing: false,
    file: null,
    parsedData: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setState((prev) => ({ ...prev, isDragOver: true }));
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => ({ ...prev, isDragOver: false }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setState((prev) => ({ ...prev, isDragOver: false }));

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [disabled]
  );

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setState((prev) => ({
        ...prev,
        error: "Please select a JSON file",
        file: null,
        parsedData: null,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      file,
      isProcessing: true,
      error: null,
      parsedData: null,
    }));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;

        // Validate JSON format
        const validation = validateJsonFile(content);
        if (!validation.valid) {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: validation.error || "Invalid JSON format",
          }));
          return;
        }

        // Parse the data using the proper parser
        const jsonData = JSON.parse(content);
        const parseResult = parseSubmissionData(jsonData);

        if (parseResult.success && parseResult.data) {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            parsedData: parseResult.data!,
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error:
              parseResult.errors.join(", ") ||
              "Failed to parse submission data",
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error:
            error instanceof Error ? error.message : "Failed to process file",
        }));
      }
    };

    reader.onerror = () => {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: "Failed to read file",
      }));
    };

    reader.readAsText(file);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleImport = useCallback(() => {
    if (state.parsedData) {
      onDataParsed(state.parsedData);
    }
  }, [state.parsedData, onDataParsed]);

  const handleClear = useCallback(() => {
    setState({
      isDragOver: false,
      isProcessing: false,
      file: null,
      parsedData: null,
      error: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleBrowseClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const stats = state.parsedData ? getImportStats(state.parsedData) : null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Submission Data
          </CardTitle>
          <CardDescription>
            Upload a JSON file containing submission data for AI judge
            evaluation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          {/* Drop Zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${
                state.isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            {state.isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  Processing file...
                </p>
              </div>
            ) : state.file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                <p className="font-medium">{state.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(state.file.size / 1024)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your JSON file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Preview Data */}
          {state.parsedData && stats && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Data parsed successfully!</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stats.submissionCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submissions
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stats.questionTemplateCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Question Templates
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stats.answerCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Answers</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stats.queueIds.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Queues</div>
                </div>
              </div>

              {stats.queueIds.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Queue IDs:</p>
                  <div className="flex flex-wrap gap-1">
                    {stats.queueIds.map((queueId) => (
                      <Badge key={queueId} variant="secondary">
                        {queueId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {state.parsedData && (
              <Button onClick={handleImport} className="flex-1">
                Import Data
              </Button>
            )}
            {(state.file || state.parsedData) && (
              <Button variant="outline" onClick={handleClear}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
