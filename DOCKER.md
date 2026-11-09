# Docker Compose

The app uses Supabase as its hosted database, so Compose runs only the Next.js app container.

## Prepare the environment

1. Copy `.env.docker.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Add optional provider and email settings if the app uses them.
3. Authenticate to GitHub Container Registry if the image package is private:

   ```sh
   docker login ghcr.io
   ```

4. Start the published image:

   ```sh
   docker compose --env-file .env.local pull
   docker compose --env-file .env.local up -d
   ```

The service listens on port 3000 by default. Set `APP_PORT` in `.env.local` to change the host port. Set `IMAGE_TAG` to select a published tag; the default is `latest`. Passing `.env.local` with `--env-file` makes those Compose settings available while keeping them out of the Compose file.

## CI and image publishing

- `.github/workflows/ci.yml` runs TypeScript validation and the existing checks for pull requests and pushes to `main` or `refactor-trainingHub`.
- `.github/workflows/docker-publish.yml` validates the source, then builds and publishes a multi-stage image to `ghcr.io/systemdevtelenet/training-performance-hub` on pushes to `main`, version tags (`v*`), or manual dispatch.
- Configure repository Actions secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for image builds. These public client values are embedded into the Next.js client bundle at build time. Keep the service role key and other private provider credentials in `.env.local` on the Compose host; they are runtime-only and are not Docker build arguments.

This setup does not deploy to a server automatically. On the Compose host, pull the published tag and restart the service to release it.
