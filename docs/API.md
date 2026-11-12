# API and architecture notes

## Request examples

### Create a task

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Prepare the sprint review",
  "description": "Add the completed work and open questions",
  "dueAt": "2026-11-13T09:30:00.000Z",
  "priority": "high"
}
```

The API trims text, applies the default status (`in_progress`) and priority (`medium` when omitted), and returns `201` with `{ "data": task }`.

### Search and update

```http
GET /api/tasks?search=sprint
PATCH /api/tasks/507f1f77bcf86cd799439011
Content-Type: application/json

{ "status": "completed" }
```

Search matches title and description case-insensitively. Query input is escaped before it becomes a regular expression. `PATCH` validates only fields present in the request.

## Data model

Mongo stores a title (120 characters max), optional description (1,000 characters max), required due timestamp, priority enum, status enum, and Mongoose timestamps. A compound due-date/status index supports the planner's common ordered reads. Search uses an escaped, case-insensitive substring match across the short title and description fields. The API converts Mongo documents into a stable DTO with a string `id` and ISO date strings so the client is independent of Mongo's `_id` representation.

## Structure

```text
client/src/
  components/       Task form and task row
  lib/               API client and week/date helpers
  App.jsx            Planner state and screen composition
server/src/
  models/             Mongoose task schema
  repositories/       Mongo persistence adapter
  routes/             HTTP endpoints with injectable repository
  services/           Input validation, query building, DTO mapping
```

The route factory accepts a repository object. Production uses the Mongoose adapter; tests use a small in-memory fake. This keeps HTTP behavior testable without a database and avoids coupling validation to Express.

## Error handling

- `400`: invalid fields, with per-field messages under `fields` for request validation.
- `404`: unknown task ID or route.
- `500`: unexpected server error, with a generic message returned to clients.

The API limits JSON request bodies to 32 KB and allows the configured `CLIENT_ORIGIN` through CORS.
