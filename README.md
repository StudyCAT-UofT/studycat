# Catalyze

Catalyze is a computer-adaptive practice tool for large university classes. It is a web application that allows students to take quizzes that use Item Response Theory (IRT)-based Computerized Adaptive Testing (CAT) and allows instructors to manage the quizzes and students.

## Architecture

The Catalyze web application is built with:

- [Next.js App Router](https://nextjs.org)
- [Mantine](https://mantine.dev)
- [Prisma](https://prisma.io)
- [Microsoft SQL Server](https://www.microsoft.com/en-ca/sql-server)
- [Docker](https://www.docker.com)

The core backend routes can be found in the `app/api` directory.

The Catalyze quiz engine service can be found in the [studycat-service](https://github.com/StudyCAT-UofT/studycat-service) repository. **The quiz engine must be running alongside the web application for adaptive quizzes to function.**

## Application Overview

### Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | All authenticated users | Home / course selection dashboard |
| `/quizzes` | All authenticated users | View and manage quizzes for the selected course |
| `/quiz/[id]` | Students | Take an adaptive quiz |
| `/question-bank` | Instructors, TAs | View and edit all questions for the course |
| `/upload` | Instructors, TAs | Import questions from a spreadsheet file |
| `/students` | Instructors, TAs | Manage student enrolments |
| `/analytics` | Instructors, TAs | View quiz analytics and export data |
| `/login` | Unauthenticated | Login page |

### User Roles

| Role | Capabilities |
|------|-------------|
| `STUDENT` | Take quizzes, view personal feedback and performance |
| `TA` | Everything a student can do, plus access the question bank, upload questions, view analytics, and manage students |
| `INSTRUCTOR` | Everything a TA can do, plus create, edit, and delete quizzes |

## Prerequisites

- [Docker](https://www.docker.com)
- [Git](https://git-scm.com)

Optionally, [Node.js](https://nodejs.org) (v18+) and [pnpm](https://pnpm.io) on your machine for editor tooling (e.g. TypeScript and ESLint integration). Everything else runs in Docker.

## Getting Started with Docker

The whole development stack (database, web app, and quiz engine service) runs in Docker. Only Docker and Git are required on your machine.

1. Clone this repository and the [studycat-service](https://github.com/StudyCAT-UofT/studycat-service) repository **side by side** in the same parent directory, and initialize both submodules:

    ```bash
    git clone --recurse-submodules https://github.com/StudyCAT-UofT/studycat.git
    git clone --recurse-submodules https://github.com/StudyCAT-UofT/studycat-service.git
    cd studycat
    ```

    If `studycat-service` is checked out somewhere else, set `STUDYCAT_SERVICE_DIR` to its path (in your shell or in a `.env` file next to `docker-compose.yml`).

2. Create the `.env` file (see [Environment Variables](#environment-variables)):

    ```bash
    cp .env.example .env
    ```

    `DATABASE_URL` and `FASTAPI_BASE_URL` are overridden by `docker-compose.yml` to use the container network, so the values in `.env` are ignored inside Docker.

3. Build and start everything:

    ```bash
    docker compose up -d --build
    ```

    On every start, a one-off `setup` container installs dependencies, generates the Prisma client, and applies any pending migrations before `web` and `service` start.

4. Seed the database (first time only):

    ```bash
    docker compose exec web pnpm db:seed
    ```

5. Open <http://localhost:3001> with your browser to visit Catalyze! The quiz engine's API docs are at <http://localhost:8000/docs>, and Prisma Studio (a database browser) is at <http://localhost:5555>.

    You can login as the `instructor` or `student` users. For a full list of users, see `scripts/seed.ts`.
    If using Shibboleth authentication, supply the password `password`.

Both apps hot-reload when you edit source files on your machine. Useful commands:

| Command | Description |
|---------|-------------|
| `docker compose logs -f web service studio` | Follow app logs |
| `docker compose exec web pnpm <script>` | Run any `package.json` script (e.g. `db:seed`, `test:run`) in the web container |
| `docker compose run --rm setup && docker compose restart web` | Re-run setup after pulling new dependencies or migrations |
| `docker compose up -d --build service` | Rebuild the quiz engine after its dependencies or schema submodule change |
| `docker compose down` | Stop everything (add `-v` to also delete the database and dependency volumes) |

Notes:

- Creating new migrations (`pnpm db:migrate --name ...`) works the same way via `docker compose exec web`.

## Environment Variables

The following environment variables are read from your `.env` file. After changing `.env`, restart the web container (`docker compose restart web`) so the change takes effect.

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | SQL Server connection string. Overridden by `docker-compose.yml` inside Docker. | `sqlserver://localhost:1433;database=studycat;user=sa;password=...` |
| `AUTH_MODE` | Authentication mode. Use `shibboleth` for SSO or `simple` for username-only local login. **Defaults to `simple` if not set.** | `shibboleth` |
| `NEXT_PUBLIC_AUTH_MODE` | Authentication mode (for client-side authentication detection) | `shibboleth` |
| `JWT_SECRET` | Secret key used to sign session tokens. **Must be set to a strong, random value in any non-trivial environment.** Falls back to an insecure placeholder if omitted. | `change-me-to-a-long-random-string` |
| `JWT_EXPIRES_IN` | How long a session token remains valid. Defaults to `7d` if not set. | `7d` |
| `ENABLE_MOCK_SHIBBOLETH` | Set to `true` to enable the `/mock-shibboleth` login page for local development without the full Shibboleth stack | `true` |
| `SHIBBOLETH_SP_URL` | Base URL of the Shibboleth Service Provider | `https://sp.studycat.local` |
| `SHIBBOLETH_LOGIN_URL` | Shibboleth SP login endpoint | `https://sp.studycat.local/Shibboleth.sso/Login` |
| `SHIBBOLETH_LOGOUT_URL` | Shibboleth SP logout endpoint | `https://sp.studycat.local/Shibboleth.sso/Logout` |
| `FASTAPI_BASE_URL` | Base URL of the quiz engine service. Defaults to `http://localhost:8000/v1` if not set. | `http://localhost:8000/v1` |

> **Note:** `SHIBBOLETH_*` and `ENABLE_MOCK_SHIBBOLETH` variables are only required when `AUTH_MODE=shibboleth`. `DATABASE_URL` and `FASTAPI_BASE_URL` only matter when running the app outside Docker.

## Database

The database is a SQL Server instance running in the `mssql` Docker container, with its data stored in the `mssql_data` volume.

### Prisma Studio

[Prisma Studio](https://www.prisma.io/studio) runs automatically in the `studio` container. Open <http://localhost:5555> to browse and edit the database tables.

### Migrations

Pending migrations are applied automatically by the `setup` container (`pnpm db:migrate:deploy`) every time you run `docker compose up`. After pulling changes that include new migrations, re-run setup to apply them:

```bash
docker compose run --rm setup
```

When making changes to the database schema, create a new migration file for the changes and give it a descriptive name:

```bash
docker compose exec web pnpm db:migrate --name <descriptive_name>
```

This creates a new migration file in the `external/studycat-schema/migrations` directory and applies it to your database. Commit the migration to the schema repository (see [Working with the Schema Submodule](#working-with-the-schema-submodule)). Do not manually modify any existing migration files.

Then regenerate the Prisma client and restart the containers that use it:

```bash
docker compose exec web pnpm db:generate
docker compose restart web studio
```

### Available Database Scripts

The following pnpm scripts are available for working with the database. Run them in the `web` container with `docker compose exec web pnpm <script>`:

| Script | Description |
|--------|-------------|
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Run migrations in development mode |
| `pnpm db:migrate:deploy` | Apply pending migrations without creating new ones (run automatically by the `setup` container; also used in production) |
| `pnpm db:migrate:reset` | Reset the database and run all migrations |
| `pnpm db:studio` | Open Prisma Studio (runs automatically in the `studio` container) |
| `pnpm db:status` | Check migration status |
| `pnpm db:seed` | Seed the database with full test data (users, courses, questions, quizzes, and mock responses). User credentials match the Shibboleth IdP test accounts. |
| `pnpm db:seed:basic` | Seed the database with a minimal dataset (users, a course, and modules only). Useful for manual testing without pre-existing quiz data. |

### Working with the Schema Submodule

The Prisma schema and migrations are located in a submodule at `external/studycat-schema/`. This allows for a single source of truth for the database schema across multiple Catalyze repositories.

To make changes to the schema, refer to the guide in the [studycat-schema README](https://github.com/StudyCAT-UofT/studycat-schema#implementing-changes-requiring-schema-changes).

### Updating the Schema Submodule

When the schema repository is updated, you need to update the submodule:

```bash
# Update the submodule to the latest commit
git submodule update --remote external/studycat-schema

# Or update to a specific tag
cd external/studycat-schema
git fetch --tags
git checkout --detach tags/v0.2.0
cd ../../
git add external/studycat-schema
git commit -m "chore: update schema submodule to v0.2.0"
```

## Quiz Engine Service (studycat-service)

The adaptive quiz engine is a separate FastAPI service that handles IRT-based question selection and ability estimation. **It must be running for students to take quizzes.**

It runs automatically in the `service` container, built from the `studycat-service` checkout next to this repository (see [Getting Started with Docker](#getting-started-with-docker)). Its source is bind-mounted, so edits to `studycat-service/src` hot-reload.

The service runs on <http://localhost:8000>. You can verify it is healthy at <http://localhost:8000/v1/health>, and view its API docs at <http://localhost:8000/docs>. The web app reaches it inside Docker at <http://service:8000/v1>.

After changing the service's dependencies or its schema submodule, rebuild the image:

```bash
docker compose up -d --build service
```

To run the service outside Docker instead, see the setup guide in the [studycat-service repository](https://github.com/StudyCAT-UofT/studycat-service).

## Testing

Run the full test suite in the web container:

```bash
docker compose exec web pnpm test
```

Other testing commands (run the same way, with `docker compose exec web`):

| Command | Description |
|---------|-------------|
| `pnpm test:run` | Run tests once (no watch mode) |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:ui` | Open the Vitest UI for interactive test inspection |

Tests are also run automatically in CI on every push and pull request to `main` (see `.github/workflows/ci.yml`).

## Linting

Run these in the web container with `docker compose exec web`, as with the testing commands.

```bash
pnpm lint
```

CSS linting:

```bash
pnpm lint:css
```

TypeScript type checking:

```bash
pnpm exec tsc --noEmit
```

## Deploying

> **WIP**

## Authentication (Shibboleth)

A local Shibboleth Service Provider (SP) and Identity Provider (IdP) simulation environment has been set up for development and testing.

**Note:** This setup is designed to mimic the production environment locally. In the actual production deployment:
*   The **IdP** will be replaced by the University of Toronto's **UTORauth** system.
*   The **SP** container will potentially be replaced by a standard **Apache** server in front of the application.

For detailed instructions on running, configuring, and testing the Shibboleth environment, please refer to [SHIBBOLETH-SETUP.md](SHIBBOLETH-SETUP.md).

### User Accounts and Login Prerequisites

Both authentication modes require the user's account to exist in the database before login will succeed — neither mode creates users automatically on first login.

- **Simple mode:** The username entered must match an existing `User` record. Returns a `404` if not found.
- **Shibboleth mode:** The UTORid from the SAML assertion must match an existing `User` record. Returns a `404` if not found.

For local development, running `docker compose exec web pnpm db:seed` creates the test accounts (`instructor`, `student`) that match the Shibboleth IdP credentials (password is `password` for both users). In production, users must be added in advance via the Students management page (`/students`) or by an administrator directly.

### Mock Shibboleth Login (Development Shortcut)

If you do not need to test the full Shibboleth flow, you can use the built-in mock login page instead. Set the following in your `.env`:

```bash
AUTH_MODE=shibboleth
NEXT_PUBLIC_AUTH_MODE=shibboleth
ENABLE_MOCK_SHIBBOLETH=true
```

Then restart the web container (`docker compose restart web`) and navigate to <http://localhost:3001/mock-shibboleth> to log in as any seeded user (e.g. `instructor` or `student`) without starting the Shibboleth Docker stack.
