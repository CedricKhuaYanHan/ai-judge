import { useFetcher } from "react-router";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  MoreHorizontal,
  Trash2,
  Play,
  Pause,
  Activity,
  Edit,
} from "lucide-react";
import type { Judge, JudgeWithStats } from "~/lib/types/database-types";
import { LLM_PROVIDERS } from "~/lib/types/api-types";

interface JudgeListProps {
  judges: JudgeWithStats[];
  onDelete: (judge: Judge) => void;
  onEdit?: (judge: Judge) => void;
  onToggleActive?: (judgeId: string, currentStatus: boolean) => void;
  activeJudgesCount?: number;
}

export function JudgeList({
  judges,
  onDelete,
  onEdit,
  onToggleActive,
  activeJudgesCount = 0,
}: JudgeListProps) {
  const fetcher = useFetcher();

  const handleDelete = (judge: Judge) => {
    fetcher.submit(
      { action: "delete", judge_id: judge.judge_id },
      { method: "post", action: "/api/judges" }
    );
  };

  const getProviderInfo = (provider: string) => {
    return LLM_PROVIDERS[provider as keyof typeof LLM_PROVIDERS];
  };

  const getVerdictColor = (verdict: string) => {
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
  };

  const formatPassRate = (passRate: number) => {
    return `${passRate.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (judges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Judges</CardTitle>
          <CardDescription>No judges found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No judges created yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first AI judge to start evaluating submissions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Judges ({judges.length})</CardTitle>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {activeJudgesCount} active
            </span>
          </div>
          <CardDescription>
            Manage your AI judges and their configurations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Evaluations</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {judges.map((judge) => {
                  const providerInfo = getProviderInfo(judge.provider);
                  const hasEvaluations = (judge.totalEvaluations ?? 0) > 0;
                  const passRate = judge.passRate ?? 0;
                  const totalEvaluations = judge.totalEvaluations ?? 0;

                  return (
                    <TableRow key={judge.judge_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{judge.name}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {providerInfo.displayName}
                          </Badge>
                          {!providerInfo.supportsAttachments && (
                            <Badge variant="secondary" className="text-xs">
                              No Attachments
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-sm">
                        {judge.model}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            judge.is_active === true ? "default" : "secondary"
                          }
                          className={
                            judge.is_active === true
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {judge.is_active === true ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {hasEvaluations ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatPassRate(passRate)}
                            </span>
                            <Badge
                              variant="outline"
                              className={getVerdictColor(
                                passRate >= 70
                                  ? "pass"
                                  : passRate >= 40
                                  ? "inconclusive"
                                  : "fail"
                              )}
                            >
                              {passRate >= 70
                                ? "Good"
                                : passRate >= 40
                                ? "Fair"
                                : "Poor"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No data
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {hasEvaluations ? (
                          <span className="text-sm font-medium">
                            {totalEvaluations.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            None
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(judge.created_at || "")}
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(judge)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}

                            {onToggleActive && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onToggleActive(
                                    judge.judge_id,
                                    judge.is_active ?? false
                                  )
                                }
                              >
                                {judge.is_active === true ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(judge)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
