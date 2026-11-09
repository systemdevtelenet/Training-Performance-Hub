# Training Performance Hub

Internal dashboard for training batches, attendance, trainee performance, and trainer management.

## Local development

1. Install Node.js 22 or later.
2. Install dependencies and start Next.js:

   ```sh
   npm ci
   npm run dev
   ```

3. Add the Supabase and optional provider settings to `.env.local`. Use `.env.docker.example` as a list of environment variable names; do not commit real credentials.

The development app is available at <http://localhost:3000>.

## Run with Docker Compose

The production app runs in one container and connects to the hosted Supabase project. Compose does not start a local database.

1. Copy `.env.docker.example` to `.env.local` and fill in the required Supabase values. Keep `SUPABASE_SERVICE_ROLE_KEY` private and only in the runtime environment file.
2. Log in to GitHub Container Registry if the image package is private:

   ```sh
   docker login ghcr.io
   ```

3. Pull and start the latest published image:

   ```sh
   docker compose --env-file .env.local pull
   docker compose --env-file .env.local up -d
   ```

The app listens on port `3000`. Set `APP_PORT` in `.env.local` to change the host port, or `IMAGE_TAG` to choose a published tag. `latest` is used by default. Check the service with:

```sh
docker compose ps
docker compose logs -f app
```

More deployment notes are in [DOCKER.md](DOCKER.md).

## CI/CD

- `.github/workflows/ci.yml` runs TypeScript validation and the repository's existing checks for pull requests and pushes to `main` and `refactor-trainingHub`.
- `.github/workflows/docker-publish.yml` validates the source, builds the production image, and publishes it to `ghcr.io/systemdevtelenet/training-performance-hub` on pushes to `main`, version tags (`v*`), or manual workflow dispatch.
- Every published build receives the `latest` tag, alongside its branch, version, or commit tag.
- Configure GitHub Actions repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the Next.js image build. These are public client settings embedded in the browser bundle. Keep service-role and other private provider credentials in `.env.local` on the Compose host; they are runtime-only.

The workflow publishes the image but does not remotely deploy it. After a successful publish, update the running Compose service on its host with `docker compose pull` and `docker compose up -d`.
