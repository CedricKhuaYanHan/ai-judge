import { useState, useMemo } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
import { Plus, X } from "lucide-react";
import type { Judge } from "~/lib/types/database-types";

interface JudgeAssignmentBadgesProps {
  answerId: string;
  assignedJudges: Judge[];
  allJudges: Judge[];
  onAssignJudge: (answerId: string, judgeId: string) => void | Promise<void>;
  onUnassignJudge: (answerId: string, judgeId: string) => void | Promise<void>;
  maxVisible?: number;
  buttonText?: string;
  className?: string;
}

/**
 * Judge Assignment Badges Component
 * Shows assigned judges as badges with ability to add/remove judges
 */
export function JudgeAssignmentBadges({
  answerId,
  assignedJudges,
  allJudges,
  onAssignJudge,
  onUnassignJudge,
  maxVisible = 3,
  buttonText = "Assign Judges",
  className = "",
}: JudgeAssignmentBadgesProps) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filter out judges already assigned to this answer and inactive judges
  const unassignedJudges = useMemo(() => {
    const assignedJudgeIds = new Set(assignedJudges.map((j) => j.judge_id));
    return allJudges.filter(
      (judge) =>
        !assignedJudgeIds.has(judge.judge_id) && judge.is_active === true
    );
  }, [allJudges, assignedJudges]);

  // Filter judges based on search
  const filteredJudges = useMemo(() => {
    if (!searchValue) return unassignedJudges;
    return unassignedJudges.filter(
      (judge) =>
        judge.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        judge.provider.toLowerCase().includes(searchValue.toLowerCase()) ||
        judge.model.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [unassignedJudges, searchValue]);

  const visibleJudges = assignedJudges.slice(0, maxVisible);
  const remainingCount = assignedJudges.length - maxVisible;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Assigned Judge Badges */}
      {visibleJudges.map((judge) => (
        <Badge
          key={judge.judge_id}
          variant={judge.is_active ? "default" : "secondary"}
          className={`text-xs cursor-pointer transition-all duration-200 group flex items-center justify-center relative px-4 group-hover:px-10 ${
            judge.is_active
              ? "bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800 border-green-200 hover:border-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800 border-gray-200 hover:border-red-200"
          }`}
          onClick={() => onUnassignJudge(answerId, judge.judge_id)}
          title={`Click to remove ${judge.name} (${
            judge.is_active ? "Active" : "Inactive"
          })`}
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">
            {judge.name}
          </span>
          <X className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-1" />
        </Badge>
      ))}

      {remainingCount > 0 && (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-gray-50"
            >
              +{remainingCount} more
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-white border border-gray-200 shadow-lg">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {assignedJudges.slice(maxVisible).map((judge) => (
                  <Badge
                    key={judge.judge_id}
                    variant={judge.is_active ? "default" : "secondary"}
                    className={`text-xs cursor-pointer transition-all duration-200 group flex items-center justify-center relative px-4 group-hover:px-10 ${
                      judge.is_active
                        ? "bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800 border-green-200 hover:border-red-200"
                        : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800 border-gray-200 hover:border-red-200"
                    }`}
                    onClick={() => onUnassignJudge(answerId, judge.judge_id)}
                    title={`Click to remove ${judge.name} (${
                      judge.is_active ? "Active" : "Inactive"
                    })`}
                  >
                    <span className="group-hover:-translate-x-1 transition-transform duration-200">
                      {judge.name}
                    </span>
                    <X className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-1" />
                  </Badge>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Add Judge Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
            {buttonText || <Plus className="h-2 w-2" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search judges..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="focus:ring-0 focus:ring-offset-0 focus:outline-none"
            />
            <CommandList>
              <CommandEmpty>
                {unassignedJudges.length === 0
                  ? "All judges are already assigned to this answer."
                  : "No judges found."}
              </CommandEmpty>
              <CommandGroup>
                {filteredJudges.map((judge) => (
                  <CommandItem
                    key={judge.judge_id}
                    value={judge.judge_id}
                    onSelect={() => {
                      onAssignJudge(answerId, judge.judge_id);
                      setOpen(false);
                    }}
                    className="cursor-pointer group"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm group-data-[selected=true]:text-white">
                        {judge.name}
                      </span>
                      <span className="text-xs text-muted-foreground group-data-[selected=true]:text-white">
                        {judge.provider} • {judge.model}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
