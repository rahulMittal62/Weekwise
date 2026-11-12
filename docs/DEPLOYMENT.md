# Deployment

This app has two deployable services and a MongoDB database. The API is deployed separately from the UI and communicates with MongoDB.

## MongoDB Atlas

1. Create a database and a database user in Atlas.
2. Add the API host's outbound IP to the network access list (or use the provider's supported private networking).
3. Copy the database connection string. Keep credentials in the host's secret environment settings, never in source control.

## Express API

The included `render.yaml` defines the API and static client. Create a Blueprint from the repository and provide the MongoDB Atlas URI and client origin when prompted. The API service uses the repository root as its working directory:

- Build/install: `npm install`
- Start: `npm start`
- Environment: `MONGODB_URI`, `CLIENT_ORIGIN`, and optionally `PORT`
- Health check path: `/api/health`

`CLIENT_ORIGIN` must be the exact origin of the deployed UI (for example, `https://weekwise.netlify.app`). The host should provide the `PORT` variable. The API exits on startup if MongoDB is not configured or cannot be reached.

The same Blueprint builds the client from the repository root, publishes `client/dist`, rewrites SPA paths to `index.html`, and reads the public API hostname from Render. If you prefer Netlify for the client, use the included `netlify.toml` instead.

## Netlify client

Create a site from the same repository with:

- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`
- `netlify.toml` sets `VITE_API_URL` to `https://weekwise-fjrk.onrender.com/api`. If Render assigns a different API hostname, update this value before deploying.

The client uses `VITE_API_URL` for production requests. Vite's local proxy is only for development. Set the API's `CLIENT_ORIGIN` to the final Netlify origin and redeploy the API.

## Smoke check after deploy

1. Open `<API URL>/api/health` and confirm `{ "status": "ok" }`.
2. Open the Netlify URL and create a task.
3. Refresh the page and confirm the task is still present.
4. Complete the task and confirm the weekly completed count updates.

The current app is single-user and does not include authentication or tenant isolation. Add those before exposing it as a shared production service.
