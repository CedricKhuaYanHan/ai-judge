import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("api/import-submissions", "routes/api.import-submissions.tsx"),
  route("api/judges", "routes/api.judges.tsx"),
  route("api/answer-judges", "routes/api.answer-judges.tsx"),
  route("api/queues", "routes/api.queues.tsx"),
  route("api/run-evaluations", "routes/api.run-evaluations.tsx"),
  route("api/evaluations", "routes/api.evaluations.tsx"),
  route("api/attachments", "routes/api.attachments.tsx"),
  route("dashboard", "routes/dashboard/layout.tsx", [
    route("settings", "routes/dashboard/settings.tsx"),
    route("submissions", "routes/dashboard/submissions/index.tsx"),
    route("submissions/:id", "routes/dashboard/submissions/$id.tsx"),
    route("judges", "routes/dashboard/judges/index.tsx"),
    route("questions", "routes/dashboard/questions/index.tsx"),
    route("queues", "routes/dashboard/queues/index.tsx"),
    route("results", "routes/dashboard/results/index.tsx"),
  ]),
] satisfies RouteConfig;
