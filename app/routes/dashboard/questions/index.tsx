import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useRevalidator } from "react-router";
import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { QuestionTypeBadge } from "~/components/questions/question-type-badge";
import { Plus, Users, FileText, AlertCircle } from "lucide-react";
import { supabase } from "~/lib/supabase";
import type { QuestionTemplate, Judge } from "~/lib/types/database-types";

interface QuestionTemplateWithJudges extends QuestionTemplate {
  judges: Judge[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("Questions loader starting...");

  try {
    // Parallelize all database queries for faster loading
    const [questionTemplatesResult, judgesResult, answerJudgesResult] =
      await Promise.all([
        supabase
          .from("question_templates")
          .select(
            `
            question_template_id,
            revision,
            question_text,
            question_type,
            created_at
          `
          )
          .order("question_template_id", { ascending: false }),
        supabase
          .from("judges")
          .select(
            "judge_id, name, provider, model, prompt, is_active, created_at"
          )
          .order("created_at", { ascending: false }),
        supabase.from("answer_judges").select("answer_id, judge_id"),
      ]);

    // Error handling
    if (questionTemplatesResult.error) {
      console.error(
        "Error fetching question templates:",
        questionTemplatesResult.error
      );
      throw new Error("Failed to fetch question templates");
    }
    if (judgesResult.error) {
      console.error("Error fetching judges:", judgesResult.error);
      throw new Error("Failed to fetch judges");
    }
    if (answerJudgesResult.error) {
      console.error(
        "Error fetching answer-judge relationships:",
        answerJudgesResult.error
      );
      throw new Error("Failed to fetch answer-judge relationships");
    }

    const questionTemplates = questionTemplatesResult.data || [];
    const judges = judgesResult.data || [];
    const answerJudges = answerJudgesResult.data || [];

    console.log(
      `Fetched: ${questionTemplates.length} question templates, ${judges.length} judges, ${answerJudges.length} answer-judge relationships`
    );

    // Get answers with their question templates to understand which templates have judges
    const { data: answersWithTemplates } = await supabase.from("answers")
      .select(`
        answer_id,
        question_template_id,
        question_templates!inner(
          question_template_id,
          question_text,
          question_type,
          revision,
          created_at
        )
      `);

    // Create a map of question_template_id to judges (from answers)
    const questionTemplateJudgeMap = new Map<string, Judge[]>();
    for (const aj of answerJudges) {
      const judge = judges.find((j) => j.judge_id === aj.judge_id);
      if (judge) {
        // Find the question template for this answer
        const answer = answersWithTemplates?.find(
          (a) => a.answer_id === aj.answer_id
        );
        if (answer) {
          const questionTemplateId = answer.question_template_id;
          if (!questionTemplateJudgeMap.has(questionTemplateId)) {
            questionTemplateJudgeMap.set(questionTemplateId, []);
          }
          // Only add if not already in the list
          const existingJudges =
            questionTemplateJudgeMap.get(questionTemplateId)!;
          if (!existingJudges.find((j) => j.judge_id === judge.judge_id)) {
            questionTemplateJudgeMap.get(questionTemplateId)!.push({
              ...judge,
              provider: judge.provider as Judge["provider"],
              is_active: judge.is_active ?? false,
            });
          }
        }
      }
    }

    // Transform question templates with their assigned judges
    const transformedQuestions: QuestionTemplateWithJudges[] =
      questionTemplates.map((template) => ({
        question_template_id: template.question_template_id,
        revision: template.revision,
        question_text: template.question_text,
        question_type: template.question_type,
        created_at: template.created_at,
        judges:
          questionTemplateJudgeMap.get(template.question_template_id) || [],
      }));

    console.log("Loader completed successfully");
    return {
      questions: transformedQuestions,
      judges: judges || [],
    };
  } catch (error) {
    console.error("Loader error:", error);
    // Return empty data instead of throwing to prevent route crashes
    return {
      questions: [],
      judges: [],
    };
  }
}

export default function QuestionsPage() {
  try {
    const { questions, judges } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();

    console.log("QuestionsPage rendering with data:", {
      questionsCount: questions?.length || 0,
      judgesCount: judges?.length || 0,
    });
    console.log(
      "All available judges:",
      judges?.map((j) => ({
        id: j.judge_id,
        name: j.name,
        is_active: j.is_active,
      }))
    );

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Question Templates
            </h2>
            <p className="text-muted-foreground">
              All question templates in the system ({questions?.length || 0}{" "}
              total)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild>
              <Link to="/dashboard/judges">
                <Users className="mr-2 h-4 w-4" />
                Manage Judges
              </Link>
            </Button>
          </div>
        </div>

        {/* Questions Table */}
        {questions?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Questions will appear here once you import submission data.
              </p>
              <Button asChild>
                <Link to="/dashboard/submissions">
                  <Plus className="mr-2 h-4 w-4" />
                  Import Submissions
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions?.length || 0})</CardTitle>
              <CardDescription>
                All question templates in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions?.map((question) => (
                    <QuestionTableRow
                      key={question.question_template_id}
                      question={question}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    console.error("QuestionsPage error:", error);
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Questions Management
            </h2>
            <p className="text-muted-foreground">
              Manage questions and assign AI judges to evaluate submissions
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Error Loading Questions
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              There was an error loading the questions data. Please check the
              console for details.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

interface QuestionTableRowProps {
  question: QuestionTemplateWithJudges;
}

const QuestionTableRow = memo(function QuestionTableRow({
  question,
}: QuestionTableRowProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <TableRow>
      <TableCell className="max-w-md">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {question.question_text.length > 100
              ? `${question.question_text.substring(0, 100)}...`
              : question.question_text}
          </p>
          {question.question_text.length > 100 && (
            <p className="text-xs text-muted-foreground">
              {question.question_text.substring(100)}...
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <QuestionTypeBadge questionType={question.question_type || "unknown"} />
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          v{question.revision}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {question.created_at ? formatDate(question.created_at) : "N/A"}
        </span>
      </TableCell>
    </TableRow>
  );
});
