# PilotOps — Claude Code Guide

## Project layout

```
pilot_ops/                  ← npm workspace root
├── client/                 ← React 19 + Vite + TypeScript (port 5173)
│   └── src/
│       ├── api/            ← typed fetch wrappers (one file per resource)
│       ├── components/     ← shared UI (modals, navbar, layout)
│       ├── context/        ← AuthContext: JWT token + current user
│       ├── pages/          ← one file per route
│       └── types/          ← shared TypeScript interfaces
└── server/                 ← Express 5 + TypeScript (port 3001)
    ├── openapi.yaml        ← OpenAPI 3.0.3 spec (served at /api/docs)
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    └── src/
        ├── controllers/
        ├── middleware/     ← authenticate.ts, authorize.ts
        └── routes/
```

## Dev commands

```bash
# From repo root
npm install                        # install all workspaces

npm run dev:server                 # API server with hot-reload
npm run dev:client                 # Vite dev server

# From server/
npm run db:migrate                 # run pending Prisma migrations
npm run db:seed                    # seed sample data (idempotent — safe to re-run)
npm run db:studio                  # Prisma Studio GUI
```

API docs (Swagger UI): http://localhost:3001/api/docs

## Database

- **SQLite** via `@prisma/adapter-libsql` + `@libsql/client`
- The adapter must be instantiated and passed to `PrismaClient` — the standard Prisma pattern without an adapter does NOT work here
- Correct pattern (used everywhere in the codebase):
  ```ts
  import { PrismaLibSql } from '@prisma/adapter-libsql';
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
  const prisma  = new PrismaClient({ adapter });
  ```
- When writing one-off Node scripts (e.g. migration helpers), wrap logic in `async function main()` — top-level await is not supported in CJS
- After any schema change: create a migration SQL file under `server/prisma/migrations/<timestamp>_<name>/migration.sql`, run `npx prisma migrate dev`, then `npx prisma generate`

## Auth

- JWT issued on login/register, signed with `JWT_SECRET` in `server/.env`
- Middleware in `server/src/middleware/`:
  - `authenticate` — verifies JWT, attaches `req.auth.userId`
  - `authorizeRoles(...roles)` — checks the user holds at least one of the given roles
- Default seed password for all users: `welcome123`
- Admin account: `carlos_mendoza / welcome123`

## Roles & access rules

Seven roles: `STUDENT`, `GUEST`, `INSTRUCTOR`, `PILOT`, `STAFF`, `ADMIN`, `OTHER`

Critical rule — two APIs look similar but have different auth gates:
| Endpoint | Auth required |
|---|---|
| `GET /api/users` | 🛡️ ADMIN or STAFF only |
| `GET /api/instructor-rates` | 🔒 Any authenticated user |

Use `/api/instructor-rates` (not `/api/users`) whenever the client needs instructor data visible to students. Getting this wrong causes students to see empty lists with no error.

Frontend role checks use `useAuth()`:
```ts
const { user } = useAuth();
const isAdminOrStaff = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;
const isInstructor   = user?.roles.some(r => r === 'INSTRUCTOR') ?? false;
```

## Key business rules

- A reservation requires `user_id` + at least one of `aircraft_id` / `instructor_id`
- Solo aircraft reservation (no instructor) requires the `PILOT` role
- Creating/updating a reservation auto-creates/syncs linked `InstructorSchedule` (type `INSTRUCTION`) and `AircraftSchedule` (type `RESERVED`) entries
- Canceling a reservation (`status: CANCELED`) cascades to delete both linked schedule entries
- `INSTRUCTION`-type schedule entries are read-only on the frontend — they cannot be edited or deleted directly
- Inactive instructors (`status: INACTIVE`) must not appear in reservation dropdowns or the instructors page for non-admin users

## Frontend conventions

- **No comments** unless the reason is non-obvious
- Role-gated UI uses `canEdit`, `isAdminOrStaff`, `isInstructor` boolean flags derived from `useAuth()`
- Complex conditional rendering in JSX uses the IIFE pattern: `{(() => { ... })()}`
- CSS follows BEM-like modifier classes: `block--modifier` (e.g. `instr-card--inactive`)
- All paginated API responses return `{ data: T[], total, page, pageSize }`
- Date range filters: `date_from`/`date_to` = overlap window (used by day-view grids); `start_from`/`start_to` = `date_start` range (used by list-view filters)

## Files to keep in sync

When adding a new field to a model, update all of:
1. `server/prisma/schema.prisma`
2. `server/prisma/migrations/` — new migration SQL file
3. `server/src/controllers/<resource>Controller.ts` — both create and update handlers, and the `SORTABLE` set if sortable
4. `client/src/types/<resource>.ts` — TypeScript interface
5. `client/src/components/<Resource>FormModal.tsx` — form field
6. `client/src/pages/<Resource>Page.tsx` — table column
7. `server/openapi.yaml` — schema and request body

## Environment

`server/.env`:
```
DATABASE_URL=file:./dev.db
JWT_SECRET=your_secret_here
PORT=3001
```
