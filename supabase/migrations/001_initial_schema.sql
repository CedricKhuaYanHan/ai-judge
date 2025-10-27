-- AI Judge System - Complete Initial Schema
-- Creates the complete database schema for the AI Judge system from scratch

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the uuid_generate_v4 function is available
CREATE OR REPLACE FUNCTION uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT gen_random_uuid();
$$;

-- Create custom types/enums
CREATE TYPE verdict_type AS ENUM ('pass', 'fail', 'inconclusive');
CREATE TYPE question_type AS ENUM ('text', 'multiple_choice', 'rating', 'boolean', 'file_upload', 'single_choice_with_reasoning');
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'gemini');

-- Create tables in dependency order

-- 1. Submissions table - Minimal submission containers
CREATE TABLE submissions (
    submission_id TEXT PRIMARY KEY,
    labeling_task_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Question templates table - Reusable question templates
CREATE TABLE question_templates (
    question_template_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Answers table - Submission-specific responses
CREATE TABLE answers (
    answer_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    submission_id TEXT NOT NULL,
    question_template_id TEXT NOT NULL,
    question_revision INTEGER NOT NULL,
    answer_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (question_template_id) REFERENCES question_templates(question_template_id) ON DELETE CASCADE,
    UNIQUE(submission_id, question_template_id)
);

-- 4. Judges table - AI judge configurations
CREATE TABLE judges (
    judge_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Answer-queue assignments (answers in queues)
CREATE TABLE answer_queues (
    answer_id TEXT REFERENCES answers(answer_id) NOT NULL,
    queue_id TEXT NOT NULL,
    PRIMARY KEY (answer_id, queue_id)
);

-- 6. Answer-judge assignments (judges assigned to answers)
CREATE TABLE answer_judges (
    answer_id TEXT REFERENCES answers(answer_id) NOT NULL,
    judge_id TEXT REFERENCES judges(judge_id) NOT NULL,
    PRIMARY KEY (answer_id, judge_id)
);

-- 7. Attachments table - File attachments
CREATE TABLE attachments (
    attachment_id TEXT PRIMARY KEY,
    answer_id TEXT REFERENCES answers(answer_id) NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Evaluations table - AI judge results
CREATE TABLE evaluations (
    evaluation_id TEXT PRIMARY KEY,
    answer_id TEXT REFERENCES answers(answer_id) NOT NULL,
    judge_id TEXT REFERENCES judges(judge_id) NOT NULL,
    verdict TEXT,
    reasoning TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_answers_submission_id ON answers(submission_id);
CREATE INDEX idx_answers_question_template_id ON answers(question_template_id);
CREATE INDEX idx_answer_queues_queue_id ON answer_queues(queue_id);
CREATE INDEX idx_answer_queues_answer_id ON answer_queues(answer_id);
CREATE INDEX idx_answer_judges_answer_id ON answer_judges(answer_id);
CREATE INDEX idx_answer_judges_judge_id ON answer_judges(judge_id);
CREATE INDEX idx_attachments_answer_id ON attachments(answer_id);
CREATE INDEX idx_evaluations_answer_id ON evaluations(answer_id);
CREATE INDEX idx_evaluations_judge_id ON evaluations(judge_id);

-- Disable RLS for simplified access control
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE judges DISABLE ROW LEVEL SECURITY;
ALTER TABLE answer_queues DISABLE ROW LEVEL SECURITY;
ALTER TABLE answer_judges DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON submissions TO authenticated;
GRANT ALL ON question_templates TO authenticated;
GRANT ALL ON answers TO authenticated;
GRANT ALL ON judges TO authenticated;
GRANT ALL ON answer_queues TO authenticated;
GRANT ALL ON answer_judges TO authenticated;
GRANT ALL ON attachments TO authenticated;
GRANT ALL ON evaluations TO authenticated;

-- Create utility functions

-- Get evaluation statistics for a queue
CREATE OR REPLACE FUNCTION get_evaluation_stats(queue_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    total_evaluations BIGINT,
    pass_count BIGINT,
    fail_count BIGINT,
    inconclusive_count BIGINT,
    pass_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_evaluations,
        COUNT(*) FILTER (WHERE e.verdict = 'pass') as pass_count,
        COUNT(*) FILTER (WHERE e.verdict = 'fail') as fail_count,
        COUNT(*) FILTER (WHERE e.verdict = 'inconclusive') as inconclusive_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE e.verdict = 'pass')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as pass_rate
    FROM evaluations e
    JOIN answers a ON e.answer_id = a.answer_id
    LEFT JOIN answer_queues aq ON a.answer_id = aq.answer_id
    WHERE (queue_id_param IS NULL OR aq.queue_id = queue_id_param);
END;
$$ LANGUAGE plpgsql;

-- Get submission statistics
CREATE OR REPLACE FUNCTION get_submission_stats(queue_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    total_submissions BIGINT,
    total_question_templates BIGINT,
    total_answers BIGINT,
    avg_question_templates_per_submission NUMERIC,
    avg_answers_per_submission NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.submission_id) as total_submissions,
        COUNT(DISTINCT qt.question_template_id) as total_question_templates,
        COUNT(DISTINCT a.answer_id) as total_answers,
        CASE 
            WHEN COUNT(DISTINCT s.submission_id) > 0 THEN 
                ROUND(COUNT(DISTINCT qt.question_template_id)::NUMERIC / COUNT(DISTINCT s.submission_id)::NUMERIC, 2)
            ELSE 0
        END as avg_question_templates_per_submission,
        CASE 
            WHEN COUNT(DISTINCT s.submission_id) > 0 THEN 
                ROUND(COUNT(DISTINCT a.answer_id)::NUMERIC / COUNT(DISTINCT s.submission_id)::NUMERIC, 2)
            ELSE 0
        END as avg_answers_per_submission
    FROM submissions s
    LEFT JOIN answers a ON s.submission_id = a.submission_id
    LEFT JOIN question_templates qt ON a.question_template_id = qt.question_template_id
    LEFT JOIN answer_queues aq ON a.answer_id = aq.answer_id
    WHERE (queue_id_param IS NULL OR aq.queue_id = queue_id_param);
END;
$$ LANGUAGE plpgsql;

-- Get answers by queue
CREATE OR REPLACE FUNCTION get_answers_by_queue(queue_id_param TEXT)
RETURNS TABLE (
    answer_id TEXT,
    submission_id TEXT,
    question_template_id TEXT,
    question_text TEXT,
    question_type TEXT,
    answer_value JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.answer_id,
        a.submission_id,
        a.question_template_id,
        qt.question_text,
        qt.question_type,
        a.answer_value
    FROM answers a
    JOIN question_templates qt ON a.question_template_id = qt.question_template_id
    JOIN answer_queues aq ON a.answer_id = aq.answer_id
    WHERE aq.queue_id = queue_id_param;
END;
$$ LANGUAGE plpgsql;

-- Get judge performance statistics
CREATE OR REPLACE FUNCTION get_judge_performance_stats(judge_id_param TEXT)
RETURNS TABLE (
    judge_name TEXT,
    total_evaluations BIGINT,
    pass_count BIGINT,
    fail_count BIGINT,
    inconclusive_count BIGINT,
    pass_rate NUMERIC,
    avg_reasoning_length NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.name as judge_name,
        COUNT(*) as total_evaluations,
        COUNT(*) FILTER (WHERE e.verdict = 'pass') as pass_count,
        COUNT(*) FILTER (WHERE e.verdict = 'fail') as fail_count,
        COUNT(*) FILTER (WHERE e.verdict = 'inconclusive') as inconclusive_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE e.verdict = 'pass')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as pass_rate,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(AVG(LENGTH(e.reasoning))::NUMERIC, 2)
            ELSE 0
        END as avg_reasoning_length
    FROM judges j
    LEFT JOIN evaluations e ON j.judge_id = e.judge_id
    WHERE j.judge_id = judge_id_param
    GROUP BY j.judge_id, j.name;
END;
$$ LANGUAGE plpgsql;
