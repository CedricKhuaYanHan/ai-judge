/**
 * Evaluations Table Component
 * Table with 6 columns: Submission, Question, Judge, Verdict, Reasoning, Created
 * Includes inline filters in the header
 */

import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Check, ChevronDown, X, Filter, ChevronsUpDown } from "lucide-react";
import { cn } from "~/lib/utils";
import type { EvaluationWithMeta } from "~/lib/types/api-types";
import type { ResultsFilters } from "~/lib/types/ui-types";

const VERDICT_OPTIONS = [
  { value: "all", label: "All Verdicts" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "inconclusive", label: "Inconclusive" },
];

interface VerdictFilterProps {
  selectedVerdict: string;
  onVerdictSelect: (verdict: string) => void;
  placeholder?: string;
}

function VerdictFilter({
  selectedVerdict,
  onVerdictSelect,
  placeholder = "Filter by verdict...",
}: VerdictFilterProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(() => {
    return VERDICT_OPTIONS.find((option) => option.value === selectedVerdict);
  }, [selectedVerdict]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between"
        >
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No verdicts found.</CommandEmpty>
            <CommandGroup>
              {VERDICT_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onVerdictSelect(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedVerdict === option.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span>{option.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface EvaluationsTableProps {
  evaluations: EvaluationWithMeta[];
  loading?: boolean;
  onViewReasoning?: (evaluation: EvaluationWithMeta) => void;
  allJudges: Array<{ judge_id: string; name: string; provider: string }>;
  allQuestions: Array<{ question_template_id: string; question_text: string }>;
  filters: ResultsFilters;
  onFiltersChange: (filters: ResultsFilters) => void;
}

export function EvaluationsTable({
  evaluations,
  loading,
  onViewReasoning,
  allJudges,
  allQuestions,
  filters,
  onFiltersChange,
}: EvaluationsTableProps) {
  const [judgeOpen, setJudgeOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [judgeSearch, setJudgeSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");

  // Filter judges based on search
  const filteredJudges = useMemo(() => {
    if (!allJudges || allJudges.length === 0) return [];
    if (!judgeSearch) return allJudges;
    return allJudges.filter(
      (judge) =>
        judge.name.toLowerCase().includes(judgeSearch.toLowerCase()) ||
        judge.provider.toLowerCase().includes(judgeSearch.toLowerCase())
    );
  }, [allJudges, judgeSearch]);

  // Filter questions based on search
  const filteredQuestions = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) return [];
    if (!questionSearch) return allQuestions;
    return allQuestions.filter((question) =>
      question.question_text
        .toLowerCase()
        .includes(questionSearch.toLowerCase())
    );
  }, [allQuestions, questionSearch]);

  const handleJudgeSelect = (judgeId: string) => {
    const newJudgeIds = filters.judgeIds.includes(judgeId)
      ? filters.judgeIds.filter((id) => id !== judgeId)
      : [...filters.judgeIds, judgeId];

    onFiltersChange({ ...filters, judgeIds: newJudgeIds });
  };

  const handleQuestionSelect = (questionId: string) => {
    const newQuestionIds = filters.questionTemplateIds.includes(questionId)
      ? filters.questionTemplateIds.filter((id) => id !== questionId)
      : [...filters.questionTemplateIds, questionId];

    onFiltersChange({ ...filters, questionTemplateIds: newQuestionIds });
  };

  const handleVerdictChange = (verdict: string) => {
    onFiltersChange({
      ...filters,
      verdict: verdict as ResultsFilters["verdict"],
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      judgeIds: [],
      questionTemplateIds: [],
      verdict: "all",
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  const hasActiveFilters =
    filters.judgeIds.length > 0 ||
    filters.questionTemplateIds.length > 0 ||
    filters.verdict !== "all";

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">
            Evaluations ({evaluations.length})
          </h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              <Filter className="w-3 h-3 mr-1" />
              Filtered
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Clear Filters - moved to left side */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs"
            >
              Clear
            </Button>
          )}
          {/* Judge Filter */}
          <Popover open={judgeOpen} onOpenChange={setJudgeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {filters.judgeIds.length === 0
                  ? "Judges"
                  : `${filters.judgeIds.length} judge${
                      filters.judgeIds.length !== 1 ? "s" : ""
                    }`}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Search judges..."
                  value={judgeSearch}
                  onValueChange={setJudgeSearch}
                />
                <CommandList>
                  <CommandEmpty>No judges found.</CommandEmpty>
                  <CommandGroup>
                    {filteredJudges.map((judge) => (
                      <CommandItem
                        key={judge.judge_id}
                        value={judge.judge_id}
                        onSelect={() => handleJudgeSelect(judge.judge_id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            filters.judgeIds.includes(judge.judge_id)
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{judge.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {judge.provider}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Question Filter */}
          <Popover open={questionOpen} onOpenChange={setQuestionOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {filters.questionTemplateIds.length === 0
                  ? "Questions"
                  : `${filters.questionTemplateIds.length} question${
                      filters.questionTemplateIds.length !== 1 ? "s" : ""
                    }`}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Search questions..."
                  value={questionSearch}
                  onValueChange={setQuestionSearch}
                />
                <CommandList>
                  <CommandEmpty>No questions found.</CommandEmpty>
                  <CommandGroup>
                    {filteredQuestions.map((question) => (
                      <CommandItem
                        key={question.question_template_id}
                        value={question.question_template_id}
                        onSelect={() =>
                          handleQuestionSelect(question.question_template_id)
                        }
                        className="cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            filters.questionTemplateIds.includes(
                              question.question_template_id
                            )
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        <span className="text-sm">
                          {truncateText(question.question_text, 60)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Verdict Filter */}
          <VerdictFilter
            selectedVerdict={filters.verdict}
            onVerdictSelect={handleVerdictChange}
          />
        </div>
      </div>

      {/* Selected Filters Display */}
      {(filters.judgeIds.length > 0 ||
        filters.questionTemplateIds.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {filters.judgeIds.map((judgeId) => {
            const judge = allJudges.find((j) => j.judge_id === judgeId);
            return (
              <Badge key={judgeId} variant="secondary" className="text-xs">
                {judge?.name}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleJudgeSelect(judgeId)}
                />
              </Badge>
            );
          })}
          {filters.questionTemplateIds.map((questionId) => {
            const question = allQuestions.find(
              (q) => q.question_template_id === questionId
            );
            return (
              <Badge key={questionId} variant="secondary" className="text-xs">
                {truncateText(question?.question_text || "", 30)}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleQuestionSelect(questionId)}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Submission</TableHead>
            <TableHead className="w-[300px]">Question</TableHead>
            <TableHead className="w-[150px]">Judge</TableHead>
            <TableHead className="w-[100px]">Verdict</TableHead>
            <TableHead className="w-[200px]">Reasoning</TableHead>
            <TableHead className="w-[120px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {evaluations.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                No evaluations match your filters
              </TableCell>
            </TableRow>
          ) : (
            evaluations.map((evaluation) => (
              <TableRow key={evaluation.evaluation_id}>
                <TableCell className="w-[100px]">
                  <Link
                    to={`/dashboard/submissions/${evaluation.submission_id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {evaluation.submission_id}
                  </Link>
                </TableCell>
                <TableCell className="w-[300px]">
                  <div
                    className="text-sm truncate"
                    title={evaluation.question_text}
                  >
                    {truncate(evaluation.question_text, 60)}
                  </div>
                </TableCell>
                <TableCell className="w-[150px]">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {evaluation.judge_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {evaluation.judge_provider} • {evaluation.judge_model}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-[100px]">
                  <Badge className={getVerdictColor(evaluation.verdict)}>
                    {evaluation.verdict || "N/A"}
                  </Badge>
                </TableCell>
                <TableCell className="w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">
                      {truncate(evaluation.reasoning, 20)}
                    </span>
                    {evaluation.reasoning && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReasoning?.(evaluation)}
                        className="h-6 px-2 text-xs"
                      >
                        View Full
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="w-[120px] text-muted-foreground text-sm">
                  {formatRelativeTime(evaluation.created_at)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Utility functions
function truncate(text: string | null, maxLength: number): string {
  if (!text) return "N/A";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

function getVerdictColor(verdict: string | null): string {
  switch (verdict) {
    case "pass":
      return "bg-green-100 text-green-800 border-green-200";
    case "fail":
      return "bg-red-100 text-red-800 border-red-200";
    case "inconclusive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatRelativeTime(date: string | null): string {
  if (!date) return "N/A";

  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}
