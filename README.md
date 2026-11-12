# Weekwise

A calm, responsive weekly task planner. Create, edit, search, complete, and delete tasks, then group them into Monday-to-Sunday weeks with open and completed counts.

## Stack

- **Client:** React 18, Vite, Lucide icons, plain CSS
- **API:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Quality:** ESLint, Prettier, Vitest, Supertest, Testing Library, Playwright

The UI and API are separated into small modules so the date logic, validation rules, API behavior, and user flows can be reviewed independently. The API accepts an injected repository in tests, so its route tests do not need a running database.

## Run locally

Prerequisites: Node.js 20.19+, 22.13+, or 24+, and a running MongoDB Community Server or MongoDB Atlas database.

1. Install dependencies from the project root:

   ```sh
   npm install
   ```

2. Start your MongoDB server. For a local installation, the default `.env` URI connects to `mongodb://127.0.0.1:27017/weekwise`. For Atlas, replace `MONGODB_URI` in `.env` with your database connection string.

3. In one terminal, start the API:

   ```sh
   npm run dev:server
   ```

4. In another terminal, start the client:

   ```sh
   npm run dev:client
   ```

Open the Vite URL (normally `http://localhost:5173`). The development server proxies `/api` to port 4000. API health is available at `http://localhost:4000/api/health`.

## Commands

| Command                                         | Purpose                                                      |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `npm run dev:client`                            | Start Vite with the API proxy                                |
| `npm run dev:server`                            | Start the API with Node watch mode                           |
| `npm run build`                                 | Create the production client bundle in `client/dist`         |
| `npm run lint`                                  | Lint JavaScript and JSX with ESLint                          |
| `npm run format`                                | Format project files with Prettier                           |
| `npm run format:check`                          | Check formatting without changing files                      |
| `npm test`                                      | Run server and client unit/integration tests                 |
| `npm run test:e2e --workspace @weekwise/client` | Run Playwright mobile browser flows (requires Google Chrome) |
| `npm start`                                     | Start the production API                                     |

## API overview

All responses use JSON. Task fields are `id`, `title`, `description`, `dueAt`, `priority`, and `status`. `dueAt` is an ISO 8601 timestamp; priority is `low`, `medium`, or `high`; status is `in_progress` or `completed`.

| Method   | Path             | Behavior                                                         |
| -------- | ---------------- | ---------------------------------------------------------------- |
| `GET`    | `/api/health`    | Health check                                                     |
| `GET`    | `/api/tasks`     | List tasks; optional `search` query matches title or description |
| `POST`   | `/api/tasks`     | Create a task (`title` and `dueAt` are required)                 |
| `PATCH`  | `/api/tasks/:id` | Update any supplied task fields, including status                |
| `DELETE` | `/api/tasks/:id` | Delete a task                                                    |

Validation failures return `400` with a `fields` object. Missing or malformed task IDs return `404`. See [API and architecture notes](docs/API.md) for examples and design details.

## Tests

The Vitest suite covers task validation, safe search filters, stable API responses, CRUD routes, Monday-based week boundaries, grouping, and UI flows. It runs without MongoDB:

```sh
npm test
```

The separate Playwright suite runs the mobile UI in Chrome and covers onboarding, create/complete, edit/delete, and search. It stubs the API so the browser tests do not need MongoDB:

```sh
npm run test:e2e --workspace @weekwise/client
```

## Deployment

The repository includes a Netlify configuration and a Render Blueprint for both the static client and API. The API connects to MongoDB Atlas. Render prompts for `MONGODB_URI` and `CLIENT_ORIGIN`; set the latter to the deployed client origin. The Blueprint wires the client to the API hostname. For Netlify, set `VITE_API_URL` to the deployed API's `/api` base URL and configure the API's `CLIENT_ORIGIN` to the Netlify origin. See [deployment notes](docs/DEPLOYMENT.md).

## Product decisions

- Weeks use the viewer's local calendar and always begin on Monday.
- Tasks are ordered by due time within each week.
- New tasks default to medium priority and in-progress status.
- Search covers both title and description and is performed by the API.
- This version has no accounts and is intended for a single user.
