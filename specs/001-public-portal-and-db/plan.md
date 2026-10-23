# Implementation Plan: Public Portal and Database Foundation

**Branch**: `001-public-portal-and-db` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-public-portal-and-db/spec.md`

## Summary

Implement the foundation of the Event Management System: create a complete relational SQLite schema with seed data in `db.ts`, build Express/Hono server routes in `server.ts`, and convert the public visitor view from the HTML mock to a SolidJS frontend. The public portal must display only approved events from the current month and next two months with local text search.

## Technical Context

**Language/Version**: Node.js (latest LTS), TypeScript  
**Primary Dependencies**: Express/Hono, better-sqlite3, SolidJS, Vite, bcrypt or crypto (native)  
**Storage**: SQLite file `database.sqlite`  
**Testing**: Manual browser validation as specified  
**Target Platform**: Local development (macOS/Linux/Windows)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Public page loads under 2 seconds, instant local search  
**Constraints**: Free/local only, no mocked in-memory data, backend in db.ts + server.ts, Portuguese docs/English code  
**Scale/Scope**: Small institutional system, ~10-20 events in seed data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Language Policy: Docs in Portuguese, code/comments in English ✓
- [x] Tech Stack: Node.js + Express/Hono + better-sqlite3 + SolidJS + Vite ✓
- [x] File Economy: Backend in db.ts (schema+seed) and server.ts (routes) ✓
- [x] Real Database: SQLite in database.sqlite, no in-memory mocks ✓
- [x] Passwords: Will use bcrypt or crypto.scryptSync when auth added (not needed for public portal) ✓
- [x] Roles: Visitor public access (no auth required) ✓
- [x] No conflict detection needed for public read-only view ✓
- [x] Frontend converts HTML mocks to SolidJS ✓

## Project Structure

### Documentation (this feature)

```text
specs/001-public-portal-and-db/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
/
├── db.ts                # Schema + seed (backend)
├── server.ts            # Routes (backend)
├── database.sqlite      # Created at runtime
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── App.tsx
│   ├── index.tsx
│   ├── components/
│   │   ├── PublicPortal.tsx  # Visitor view from mock
│   │   └── ...
│   └── styles/
└── docs/
    └── mocks-html/
        └── mock.html        # Reference mock
```

**Structure Decision**: Web application with backend files at root (db.ts, server.ts) per constitution requirements, frontend in src/ with SolidJS components converted from HTML mock.

## Complexity Tracking

No violations - all requirements align with constitution.
