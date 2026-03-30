# StudyCAT

StudyCAT is a computer-adaptive practice tool for large university classes. It is a web application that allows students to take quizzes that use Item Response Theory (IRT)-based Computerized Adaptive Testing (CAT) and allows instructors to manage the quizzes and students.

## Architecture

The StudyCAT web application is built with:

- [Next.js App Router](https://nextjs.org)
- [Mantine](https://mantine.dev)
- [Prisma](https://prisma.io)
- [Microsoft SQL Server](https://www.microsoft.com/en-ca/sql-server)
- [Docker](https://www.docker.com)

The core backend routes can be found in the `app/api` directory.

The StudyCAT quiz engine service can be found in the [studycat-service](https://github.com/StudyCAT-UofT/studycat-service) repository. **The quiz engine must be running alongside the web application for adaptive quizzes to function.**

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
- [Node.js](https://nodejs.org) (v18+)
- [pnpm](https://pnpm.io)
- [Python 3.13+](https://www.python.org) (for the quiz engine service)

## Getting Started

First, clone the repository:

```bash
git clone https://github.com/StudyCAT-UofT/studycat.git
cd studycat
```

Then, initialize the submodule:

```bash
git submodule update --init
```

Then, install the dependencies:

```bash
pnpm install
```

Create a `.env` file in the root directory and copy the contents of the `.env.example` file into it:

```bash
cp .env.example .env
```

Then, start the local SQL Server database container:

```bash
docker compose up -d
```

Migrate the database and generate the Prisma client:

```bash
pnpm db:migrate
```

> **Note:** `pnpm db:migrate` (`prisma migrate dev`) automatically generates the Prisma client as its final step. Running `pnpm db:generate` separately afterwards is only necessary if you want to regenerate the client without running a migration (e.g. after manually updating the submodule).

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

The following environment variables are required in your `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | SQL Server connection string | `sqlserver://localhost:1433;database=studycat;user=sa;password=...` |
| `AUTH_MODE` | Authentication mode. Use `shibboleth` for SSO or `simple` for username-only local login. **Defaults to `simple` if not set.** | `shibboleth` |
| `JWT_SECRET` | Secret key used to sign session tokens. **Must be set to a strong, random value in any non-trivial environment.** Falls back to an insecure placeholder if omitted. | `change-me-to-a-long-random-string` |
| `JWT_EXPIRES_IN` | How long a session token remains valid. Defaults to `7d` if not set. | `7d` |
| `ENABLE_MOCK_SHIBBOLETH` | Set to `true` to enable the `/mock-shibboleth` login page for local development without the full Shibboleth stack | `true` |
| `SHIBBOLETH_SP_URL` | Base URL of the Shibboleth Service Provider | `https://sp.studycat.local` |
| `SHIBBOLETH_LOGIN_URL` | Shibboleth SP login endpoint | `https://sp.studycat.local/Shibboleth.sso/Login` |
| `SHIBBOLETH_LOGOUT_URL` | Shibboleth SP logout endpoint | `https://sp.studycat.local/Shibboleth.sso/Logout` |
| `FASTAPI_BASE_URL` | Base URL of the quiz engine service. Defaults to `http://localhost:8000/v1` if not set | `http://localhost:8000/v1` |

> **Note:** `SHIBBOLETH_*` and `ENABLE_MOCK_SHIBBOLETH` variables are only required when `AUTH_MODE=shibboleth`. `FASTAPI_BASE_URL` only needs to be set if the quiz engine is running on a non-default port or host.

## Database

The database is a SQL Server instance running in Docker. The credentials are stored in the `.env` file.

When the server is running, you can view the database and the tables using Prisma Studio:

```bash
pnpm db:studio
```

Open [http://localhost:5555](http://localhost:5555) with your browser to see the result.

### Migrations

When making changes to the database schema, you need to create a new migration file for the changes and give it a descriptive name. This is done using the `prisma` CLI:

```bash
pnpm db:migrate --name <descriptive_name>
```

This creates a new migration file in the `external/studycat-schema/migrations` directory, which you commit to the repository. Do not manually modify any existing migration files.

When pulling changes from the repository that have new migrations, you need to apply the migrations to the database:

```bash
pnpm db:migrate
```

### Available Database Scripts

The following pnpm scripts are available for working with the database:

| Script | Description |
|--------|-------------|
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Run migrations in development mode |
| `pnpm db:migrate:deploy` | Deploy migrations in production |
| `pnpm db:migrate:reset` | Reset the database and run all migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:status` | Check migration status |
| `pnpm db:seed` | Seed the database with full test data (users, courses, questions, quizzes, and mock responses). User credentials match the Shibboleth IdP test accounts. |
| `pnpm db:seed:basic` | Seed the database with a minimal dataset (users, a course, and modules only). Useful for manual testing without pre-existing quiz data. |

## Working with the Schema Submodule

The Prisma schema and migrations are located in a submodule at `external/studycat-schema/`. This allows for a single source of truth for the database schema across multiple StudyCAT repositories.

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

The full setup guide is in the [studycat-service repository](https://github.com/StudyCAT-UofT/studycat-service). The short version for local development:

```bash
# In a separate terminal, clone and set up the service
git clone https://github.com/StudyCAT-UofT/studycat-service.git
cd studycat-service
make venv install
make submodule-update
make db-generate
cp .env.example .env   # configure DATABASE_URL to match studycat's .env
make run
```

The service runs on `http://localhost:8000` by default. You can verify it is healthy at `http://localhost:8000/v1/health`.

> **Note:** Both the web application and the quiz engine connect to the **same database**. Ensure `DATABASE_URL` in both `.env` files points to the same SQL Server instance.

## Testing

Run the full test suite:

```bash
pnpm test
```

Other testing commands:

| Command | Description |
|---------|-------------|
| `pnpm test:run` | Run tests once (no watch mode) |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:ui` | Open the Vitest UI for interactive test inspection |

Tests are also run automatically in CI on every push and pull request to `main` (see `.github/workflows/ci.yml`).

## Linting

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

For local development, running `pnpm db:seed` creates the test accounts (`instructor`, `student`) that match the Shibboleth IdP credentials. In production, users must be added in advance via the Students management page (`/students`) or by an administrator directly.

### Mock Shibboleth Login (Development Shortcut)

If you do not need to test the full Shibboleth flow, you can use the built-in mock login page instead. Set the following in your `.env`:

```
AUTH_MODE=shibboleth
ENABLE_MOCK_SHIBBOLETH=true
```

Then navigate to `http://localhost:3000/mock-shibboleth` to log in as any seeded user (e.g. `instructor` or `student`) without starting the Shibboleth Docker stack.
