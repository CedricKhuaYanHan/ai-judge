import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Label } from "~/components/ui/label";
import { Users, Loader2, Check, ArrowRight } from "lucide-react";
import type { Judge } from "~/lib/types/database-types";

interface AnswerWithDetails {
  answer_id: string;
  submission_id: string;
  question_template_id: string;
  question_revision: number;
  answer_value: Record<string, any>;
  created_at: string | null;
  question_template: {
    question_template_id: string;
    revision: number;
    question_text: string;
    question_type: string | null;
    created_at: string | null;
  };
  judges: Judge[];
}

interface BulkJudgeAssignmentDialogProps {
  queueId: string;
  allAnswers: AnswerWithDetails[];
  allJudges: Judge[];
  onBulkAssign: (judgeId: string, answerIds: string[]) => Promise<void>;
  trigger?: React.ReactNode;
}

type AssignmentScope = "all" | "question_type" | "submission";

export function BulkJudgeAssignmentDialog({
  queueId,
  allAnswers,
  allJudges,
  onBulkAssign,
  trigger,
}: BulkJudgeAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"judge" | "scope">("judge");
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [assignmentScope, setAssignmentScope] =
    useState<AssignmentScope>("all");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(
    []
  );
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter judges based on search
  const filteredJudges = useMemo(() => {
    let judges = allJudges.filter((judge) => judge.is_active === true);

    if (searchValue.trim()) {
      judges = judges.filter(
        (judge) =>
          judge.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          judge.provider.toLowerCase().includes(searchValue.toLowerCase()) ||
          judge.model.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    return judges;
  }, [allJudges, searchValue]);

  // Get unique question types
  const questionTypes = useMemo(() => {
    const types = new Set(
      allAnswers
        .map((answer) => answer.question_template.question_type)
        .filter((type): type is string => type !== null)
    );
    return Array.from(types);
  }, [allAnswers]);

  // Get unique submissions
  const submissions = useMemo(() => {
    const subs = new Set(allAnswers.map((answer) => answer.submission_id));
    return Array.from(subs);
  }, [allAnswers]);

  // Calculate affected answers based on selected scope
  const affectedAnswers = useMemo(() => {
    let filteredAnswers = allAnswers;

    // Apply scope filters
    switch (assignmentScope) {
      case "all":
        // All answers in this queue
        break;
      case "question_type":
        if (selectedQuestionTypes.length > 0) {
          filteredAnswers = filteredAnswers.filter((answer) => {
            const questionType = answer.question_template.question_type;
            return questionType && selectedQuestionTypes.includes(questionType);
          });
        }
        break;
      case "submission":
        if (selectedSubmissions.length > 0) {
          filteredAnswers = filteredAnswers.filter((answer) =>
            selectedSubmissions.includes(answer.submission_id)
          );
        }
        break;
    }

    // Exclude answers that already have the selected judge assigned
    if (selectedJudge) {
      filteredAnswers = filteredAnswers.filter(
        (answer) =>
          !answer.judges.some(
            (judge) => judge.judge_id === selectedJudge.judge_id
          )
      );
    }

    return filteredAnswers;
  }, [
    allAnswers,
    assignmentScope,
    selectedQuestionTypes,
    selectedSubmissions,
    selectedJudge,
  ]);

  const handleJudgeSelect = (judge: Judge) => {
    setSelectedJudge(judge);
    setStep("scope");
  };

  const handleQuestionTypeToggle = (questionType: string) => {
    setSelectedQuestionTypes((prev) =>
      prev.includes(questionType)
        ? prev.filter((type) => type !== questionType)
        : [...prev, questionType]
    );
  };

  const handleSubmissionToggle = (submissionId: string) => {
    setSelectedSubmissions((prev) =>
      prev.includes(submissionId)
        ? prev.filter((id) => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const handleAssign = async () => {
    if (!selectedJudge || affectedAnswers.length === 0) return;

    setIsAssigning(true);
    try {
      const answerIds = affectedAnswers.map((answer) => answer.answer_id);
      await onBulkAssign(selectedJudge.judge_id, answerIds);
      handleClose();
    } catch (error) {
      console.error("Failed to bulk assign judge:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep("judge");
    setSelectedJudge(null);
    setAssignmentScope("all");
    setSelectedQuestionTypes([]);
    setSelectedSubmissions([]);
    setSearchValue("");
  };

  const canProceedToScope = selectedJudge !== null;
  const canAssign =
    selectedJudge &&
    affectedAnswers.length > 0 &&
    (assignmentScope === "all" ||
      (assignmentScope === "question_type" &&
        selectedQuestionTypes.length > 0) ||
      (assignmentScope === "submission" && selectedSubmissions.length > 0));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Bulk Assign Judges
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Assign Judge</DialogTitle>
          <DialogDescription>
            {step === "judge"
              ? "Step 1: Select a judge to assign"
              : "Step 2: Choose which answers to assign them to"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "judge" && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Select Judge</Label>
              <Command>
                <CommandInput
                  placeholder="Search judges by name, provider, or model..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList className="max-h-80">
                  <CommandEmpty>
                    {filteredJudges.length === 0
                      ? "No active judges found."
                      : "No judges found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredJudges.map((judge) => (
                      <CommandItem
                        key={judge.judge_id}
                        value={judge.judge_id}
                        onSelect={() => handleJudgeSelect(judge)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {judge.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {judge.provider} • {judge.model}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}

          {step === "scope" && selectedJudge && (
            <div className="space-y-6">
              {/* Selected Judge Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-1">
                  Selected Judge
                </h4>
                <p className="text-sm text-blue-800">
                  <strong>{selectedJudge.name}</strong> (
                  {selectedJudge.provider} • {selectedJudge.model})
                </p>
              </div>

              {/* Assignment Scope Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  Assignment Scope
                </Label>
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between w-full cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                    onClick={() => setAssignmentScope("all")}
                  >
                    <span className="text-sm">
                      All answers in this queue ({allAnswers.length} answers)
                    </span>
                    {assignmentScope === "all" && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>

                  {questionTypes.length > 0 && (
                    <div
                      className="flex items-center justify-between w-full cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                      onClick={() => setAssignmentScope("question_type")}
                    >
                      <span className="text-sm">Specific question type</span>
                      {assignmentScope === "question_type" && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  )}

                  {submissions.length > 0 && (
                    <div
                      className="flex items-center justify-between w-full cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                      onClick={() => setAssignmentScope("submission")}
                    >
                      <span className="text-sm">Specific submission</span>
                      {assignmentScope === "submission" && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Question Type Selection */}
                {assignmentScope === "question_type" && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm font-medium">
                      Question Types
                    </Label>
                    <Command>
                      <CommandInput placeholder="Search question types..." />
                      <CommandList className="max-h-40">
                        <CommandEmpty>No question types found.</CommandEmpty>
                        <CommandGroup>
                          {questionTypes.map((type) => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={() => handleQuestionTypeToggle(type)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-sm">{type}</span>
                                {selectedQuestionTypes.includes(type) && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}

                {/* Submission Selection */}
                {assignmentScope === "submission" && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm font-medium">Submissions</Label>
                    <Command>
                      <CommandInput placeholder="Search submissions..." />
                      <CommandList className="max-h-40">
                        <CommandEmpty>No submissions found.</CommandEmpty>
                        <CommandGroup>
                          {submissions.map((submissionId) => (
                            <CommandItem
                              key={submissionId}
                              value={submissionId}
                              onSelect={() =>
                                handleSubmissionToggle(submissionId)
                              }
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-sm">{submissionId}</span>
                                {selectedSubmissions.includes(submissionId) && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>

              {/* Preview */}
              {canAssign && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    Assignment Preview
                  </h4>
                  <p className="text-sm text-green-800">
                    Will assign <strong>{selectedJudge.name}</strong> to{" "}
                    <strong>{affectedAnswers.length}</strong> answer
                    {affectedAnswers.length !== 1 ? "s" : ""}
                    {affectedAnswers.length === 0 &&
                      " (all selected answers already have this judge assigned)"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {step === "judge" && (
            <Button
              onClick={() => setStep("scope")}
              disabled={!canProceedToScope}
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === "scope" && (
            <>
              <Button variant="outline" onClick={() => setStep("judge")}>
                Back
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!canAssign || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign to ${affectedAnswers.length} Answer${
                    affectedAnswers.length !== 1 ? "s" : ""
                  }`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
