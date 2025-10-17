# StudyCAT

StudyCAT is a computer-adaptive practice tool for large university classes. It is a web application that allows students to take quizzes that use Item Response Theory (IRT)-based Computerized Adaptive Testing (CAT) and allows instructors to manage the quizzes and students.

## Architecture

The StudyCAT web application is built with:

- [Next.js App Router](https://nextjs.org)
- [Mantine](https://mantine.dev)
- [Prisma](https://prisma.io)
- [PostgreSQL](https://www.postgresql.org)
- [Docker](https://www.docker.com)

The core backend routes can be found in the `app/api` directory.

The StudyCAT quiz engine service can be found in the [studycat-service](https://github.com/StudyCAT-UofT/studycat-service) repository.

## Prerequisites

- [Docker](https://www.docker.com)
- [Node.js](https://nodejs.org)
- [pnpm](https://pnpm.io)

## Getting Started

First, clone the repository:

```bash
git clone https://github.com/StudyCAT-UofT/studycat.git
cd studycat
```

Then, install the dependencies:

```bash
pnpm install
```

Create a `.env` file in the root directory and copy the contents of the `.env.example` file into it:

```bash
cp .env.example .env
```

Then, start the local database server:

```bash
docker compose up -d
```

Migrate the database and generate the Prisma client:

```bash
pnpm db:migrate
pnpm db:generate
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Database

The database is hosted on a local PostgreSQL server using Docker. The database credentials are stored in the `.env` file.

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

## Working with the Schema Submodule

The Prisma schema and migrations are located in a submodule at `external/studycat-schema/`. This allows for a single source of truth for the database schema across multiple StudyCAT repositories.

### Available Database Scripts

The following pnpm scripts are available for working with the database:

- `pnpm db:generate` - Generate the Prisma client
- `pnpm db:migrate` - Run migrations in development mode
- `pnpm db:migrate:deploy` - Deploy migrations in production
- `pnpm db:migrate:reset` - Reset the database and run all migrations
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:status` - Check migration status
- `pnpm db:seed` - Seed the database with initial test data

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

## Deploying

WIP.
