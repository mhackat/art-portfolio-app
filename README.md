# Art Portfolio App

Next.js + Prisma + Postgres + next-auth, with a Swagger-documented API and
centralized ownership checks on every mutating route.

## What's here

- `src/app/api/*` — API routes (signup, users, bio, artworks, next-auth)
- `src/lib/discovery.ts` — random user selection (home page) and display-name search (`/browse`)
- `src/lib/authz.ts` — the single ownership-check function every mutating route calls
- `src/lib/swagger.ts` + `src/app/api-docs` — Swagger UI, generated from JSDoc comments on the routes
- `prisma/schema.prisma` — User / Artwork models
- `prisma/seed.ts` — two test users (User A / User B) for testing permission boundaries

## First-time setup

You'll need Node 20+ and Docker installed.

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env
# Generate a NEXTAUTH_SECRET:
openssl rand -base64 32
# paste it into .env as NEXTAUTH_SECRET

# 3. Start local Postgres
docker compose up -d

# 4. Create the database schema
npx prisma migrate dev --name init

# 5. Seed two test users (usera@example.com / userb@example.com, password: TestPassword123!)
npm run prisma:seed

# 6. Run the app
npm run dev
```

Visit:
- `http://localhost:3000` — home page
- `http://localhost:3000/api-docs` — Swagger UI for the API
- `http://localhost:3000/api/users/<id>` — try fetching a seeded user's public profile

Get a seeded user's id via Prisma Studio:
```bash
npm run prisma:studio
```

## Testing the ownership rule manually (before Playwright is wired up)

1. Log in as User A at `/login` (or `POST /api/auth/login` for a bearer token).
2. Try `PATCH /api/users/by-username/userb/bio` while authenticated as User A — expect `403`.
3. Try the same request unauthenticated — expect `401`.
4. Try `PATCH /api/users/by-username/usera/bio` while authenticated as User A — expect `200`.

This is exactly the matrix the Playwright API suite will automate.

## Image uploads

Artwork images are uploaded directly from the user's device — there's no `imageUrl`
field anywhere in the public API anymore. Both endpoints take the file itself as
`multipart/form-data` (PNG/JPEG/WEBP/GIF, max 5MB) and upload it to an S3-compatible
bucket internally:

- `POST /api/users/by-username/{username}/artworks` — `title` (required), `description`,
  `file` (required); uses username rather than the internal id, since that's what a
  caller actually knows about their own account
- `PATCH /api/artworks/{artworkId}` — all fields optional; send `file` to replace the
  image, omit it to leave the current image unchanged

`POST /api/uploads` (upload a file, get back a bare URL) still exists as a standalone
primitive — `src/lib/image-upload.ts` holds the validation both it and the artwork
endpoints share — but it's intentionally left out of the public Swagger docs
(`src/lib/swagger.ts`'s `HIDDEN_TAGS`) since artwork create/update no longer need it.

To configure storage, using **Cloudflare R2** (free tier, S3-compatible):

1. Cloudflare dashboard → R2 → Create bucket (e.g. `art-portfolio-uploads`)
2. Bucket → Settings → enable public access (either the `r2.dev` subdomain, or a
   connected custom domain) — this becomes `STORAGE_PUBLIC_URL_BASE`
3. R2 → Manage API tokens → create a token scoped to that bucket with Object
   Read & Write — this gives you `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY`
4. The bucket's S3 API endpoint (shown on the bucket page) is
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` — this is `STORAGE_ENDPOINT`
5. Fill these into `.env` (`STORAGE_REGION` can stay `auto` for R2):
   ```
   STORAGE_BUCKET=art-portfolio-uploads
   STORAGE_ACCESS_KEY_ID=...
   STORAGE_SECRET_ACCESS_KEY=...
   STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   STORAGE_REGION=auto
   STORAGE_PUBLIC_URL_BASE=https://pub-xxxxxxxx.r2.dev
   ```

AWS S3 works the same way (`STORAGE_ENDPOINT` can be omitted for AWS's default
endpoint, `STORAGE_REGION` should be your bucket's region, and
`STORAGE_PUBLIC_URL_BASE` would be `https://<bucket>.s3.<region>.amazonaws.com`
or a CloudFront domain in front of it).

Without these env vars set, `/api/uploads` returns `503`.

## API keys

Every user can generate personal API keys from the "API keys" section of their
dashboard. This lets you call the API directly — e.g. `POST /api/uploads` — without a
browser session, by sending `Authorization: Bearer <key>` instead of a session cookie.
Both work everywhere `requireAuth`/`requireOwnership` are enforced (see
`src/lib/authz.ts`).

Notes:
- The raw key is shown exactly once, right after creation — only a SHA-256 hash and a
  short prefix (for identification) are stored (`prisma/schema.prisma`'s `ApiKey` model).
- Keys can be revoked from the dashboard (or `DELETE /api/api-keys/{id}`), and take
  effect immediately.
- Keys don't expire on their own — revoke anything you're done with.

Example — upload an image with curl using a generated key:
```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer apk_..." \
  -F "file=@/path/to/image.png;type=image/png"
```

### Getting a key without the dashboard

For clients that only have credentials (no browser session) — scripts, CI, another
service — `POST /api/auth/login` exchanges an email/username + password for a token,
and `POST /api/auth/logout` ends that specific session. Under the hood this creates
the same kind of key as the dashboard, so it shows up in — and can be revoked from —
the dashboard's API keys list too, not just via logout.

```bash
# Log in
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"usera@example.com","password":"TestPassword123!"}'
# -> { "token": "apk_...", "user": { ... } }

# Use the token
curl http://localhost:3000/api/api-keys -H "Authorization: Bearer apk_..."

# End the session
curl -X POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer apk_..."
```

## Rate limiting

`POST /api/signup`, `POST /api/auth/login`, and the browser credentials login
(`POST /api/auth/callback/credentials`) are rate limited — these are the app's
password-guessing surfaces. Limits are a sliding window stored in Postgres
(`src/lib/rate-limit.ts`, `RateLimitHit` model), not in-memory, so they stay correct
across dev server restarts and across multiple server instances in production
(no Redis needed).

- Signup: 5 attempts / 15 min, keyed by IP
- Login (both the dedicated API endpoint and the browser form): 10 attempts / 15 min,
  keyed by IP — and the API endpoint additionally keys by the identifier (email/username)
  being attempted, so a targeted attack on one account is limited even if the IP rotates
- The dedicated API login and the browser login **share the same IP bucket**, so
  switching between them doesn't reset the limit
- Exceeding a limit returns `429` with a `Retry-After` header (seconds)

## Admin

`/admin` lists every user, 50 per page, with a link to each one's public portfolio and
a delete button that removes the account along with all their artworks and API keys
(cascading foreign keys — `prisma/schema.prisma`).

Access is gated by the `ADMIN_EMAILS` env var (comma-separated emails), not a DB role —
simplest thing that works given there's no other need for roles yet. To grant access,
add an email to `ADMIN_EMAILS` in `.env` and have that user log out and back in (the
"Admin" nav link is driven by a flag set on login, but the actual authorization check
in `src/lib/authz.ts`'s `isAdminUserId`/`requireAdmin` re-reads `ADMIN_EMAILS` fresh on
every request — so revoking access is immediate even without a re-login).

Backing API, both admin-only (`GET`/`DELETE` require an admin session or API key):
- `GET /api/admin/users?page=N` — paginated user list (50/page)
- `DELETE /api/admin/users/{id}` — deletes a user and everything in their portfolio;
  blocks deleting your own account through this endpoint

## Environments

This app reads all config from environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `STORAGE_*`, `ADMIN_EMAILS`, `APP_ENV`). Deployed on Vercel with two
fully separate environments — separate Neon Postgres databases, separate R2 buckets,
separate `NEXTAUTH_SECRET`s:

- **`main`** branch → Production (`https://art-portfolio-app-plum.vercel.app`)
- **`test`** branch → Preview, pinned to a stable domain (`https://art-portfolio-app-plumtest.vercel.app`)

Env vars are set per-environment in Vercel → Project → Settings → Environment Variables.
When adding a new one, set it for both Production and Preview (with different values
where it matters, e.g. `DATABASE_URL`). Run `npx prisma migrate deploy` against each
environment's `DATABASE_URL` after adding a migration, before or alongside deploying it.

**Note:** `NEXTAUTH_URL` must include the `https://` scheme (not just the bare domain) —
NextAuth uses it for callback/redirect handling, and Swagger UI's "Servers" dropdown
treats a schemeless value as a relative path, silently producing broken doubled URLs.

### Push workflow

Changes land on `test` first, always:

1. Commit locally, push to `test`
2. Wait for the Preview deployment to reach `Ready` and do a quick smoke check
   (`vercel ls`, `vercel inspect <url> --logs`, hit the live Preview URL)
3. Open a PR from `test` into `main`
4. The **Prod deploy gate** GitHub Actions check
   (`.github/workflows/prod-deploy-gate.yml`) runs the
   [art-portfolio-api-tests](https://github.com/mhackat/art-portfolio-api-tests) suite
   (everything except the `@admin`-tagged tests) against the `test` environment. It's a
   required status check — the PR cannot be merged until it passes.
5. Merge the PR once the check is green; confirm the Production deployment reaches `Ready`

`main` should never be the first place a change lands, and — enforced by branch
protection — nothing merges into it without the test suite passing against `test` first.

**CI setup** (one-time, in this repo's GitHub Settings → Secrets and variables →
Actions):

| Secret | Value |
| --- | --- |
| `API_TESTS_REPO_TOKEN` | A PAT (fine-grained, read-only, scoped to `mhackat/art-portfolio-api-tests`) — that repo is private, so the workflow needs this to check it out |
| `API_AUTOMATION_USERNAME` | The dedicated test-automation account's username on the `test` environment |
| `API_AUTOMATION_EMAIL` | Its email |
| `API_AUTOMATION_PASSWORD` | Its password |
| `API_AUTOMATION_DISPLAY_NAME` | Its display name |

The automation account doesn't need to be pre-created — the suite's setup step signs it
up on first run if it doesn't exist yet, and reuses it on every run after. Branch
protection on `main` (Settings → Branches) requires the "API tests (test environment)"
check to pass before merging.

## Next steps

- [x] Build login / signup / dashboard / public gallery pages (Step 4 of the build plan)
- [x] Add `data-testid` attributes to key interactive elements for Playwright targeting
- [x] Add image upload (S3/R2-compatible) instead of the placeholder `imageUrl` field
- [x] Deploy to a hosting provider and wire up staging/prod
- [x] Build the Playwright suite (separate repo) against this API, and gate `main` merges on it
