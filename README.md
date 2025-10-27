# AI Judge

A React application for automatically reviewing human answers using AI judges. Upload submissions, configure AI judges, and get automated verdicts with reasoning.

## Why Supabase?

I chose Supabase for this project because:

- generated type-safe database operations
- Full SQL queryability

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GEMINI_API_KEY=your_gemini_key_here

```

3. Start the development server:

```bash
npm run dev
```

## Assumptions

- **Reasoning field is not optional** - All answers must include reasoning text, not just the choice
- **Single submission format** - All submissions follow the same JSON structure
- **Manual judge assignment** - Judges must be manually assigned to questions

## Sample Data Format

```json
[
  {
    "id": "sub_1",
    "queueId": "queue_1",
    "labelingTaskId": "task_1",
    "createdAt": 1690000000000,
    "questions": [
      {
        "rev": 1,
        "data": {
          "id": "q_template_1",
          "questionType": "single_choice_with_reasoning",
          "questionText": "Is the sky blue?"
        }
      }
    ],
    "answers": {
      "q_template_1": {
        "choice": "yes",
        "reasoning": "Observed on a clear day."
      }
    }
  }
]
```

## Extra Features

- **Group By Views** - Group answers by submission for easier review
- **Attachment Feature** - File upload and management for supported models
- **Bulk Select Judges** - Bulk assignment of judges to multiple answers

## Scope Cuts

- **Rate Limiting** - Built-in rate limiting per LLM provider to respect API limits
- **Configurable Prompts** - Built prompt builder but didn't allow user configurations
- **Animated Charts** - Interactive charts for results page visualization

## Time Spent

10 hours

## Tech Stack

- **React 18 + TypeScript** - Modern React with full type safety
- **Vite** - Fast development and build tooling
- **Supabase** - Backend database with auto-generated API
- **Tailwind CSS + shadcn/ui** - Modern styling and components
- **OpenAI/Anthropic/Gemini** - LLM providers for AI evaluations
