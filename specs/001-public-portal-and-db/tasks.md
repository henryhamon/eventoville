# Tasks: Public Portal and Database Foundation

**Input**: Design documents from `/specs/001-public-portal-and-db/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `db.ts`, `server.ts` at repository root
- Frontend: `src/` directory
- Config: `package.json`, `vite.config.ts`, `index.html`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure with package.json, vite.config.ts, tsconfig.json at root
- [ ] T002 Create index.html with SolidJS entry point at root
- [ ] T003 [P] Create src/ directory structure with index.tsx, App.tsx, index.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create database schema and seed in db.ts (all tables: users, courses, themes, locations, resources, events, event_resources)
- [ ] T005 Implement database initialization with automatic seed on first run in db.ts
- [ ] T006 Create server routes in server.ts (GET /api/public/events, static serving)
- [ ] T007 [P] Implement password hashing utility using crypto.scryptSync in db.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Visit Public Event Portal (Priority: P1) 🎯 MVP

**Goal**: Allow visitors to browse approved events from current month + next 2 months without login

**Independent Test**: Access public homepage without authentication and verify only approved events in 3-month window are displayed

### Implementation for User Story 1

- [ ] T008 [P] [US1] Create PublicPortal component in src/components/PublicPortal.tsx with visitor view layout
- [ ] T009 [US1] Implement event fetching from /api/public/events in PublicPortal component
- [ ] T010 [US1] Display events table with columns: Data, Evento, Tema, Início, Local, Palestrante, Realização
- [ ] T011 [US1] Format dates using pt-BR locale in PublicPortal component
- [ ] T012 [US1] Style component to match mock.html visitor view design

**Checkpoint**: Public portal displays approved events correctly

---

## Phase 4: User Story 2 - Quick Text Search (Priority: P1)

**Goal**: Enable local text search to filter events without server round-trip

**Independent Test**: Type in search field and verify results filter locally, clear search shows all events

### Implementation for User Story 2

- [ ] T013 [P] [US2] Add search input field to PublicPortal component in src/components/PublicPortal.tsx
- [ ] T014 [US2] Implement local filtering logic across title, theme_name, speaker, location_name, realization
- [ ] T015 [US2] Add reactive search term state using SolidJS createSignal

**Checkpoint**: Local search works without page reload

---

## Phase 5: User Story 3 - Persistent Database with Seed Data (Priority: P1)

**Goal**: Ensure SQLite database on disk with complete schema and seed data

**Independent Test**: Check database.sqlite exists with all tables and seed data after server start

### Implementation for User Story 3

- [ ] T016 [P] [US3] Ensure getPublicEvents filters for APROVADO status and 3-month window in db.ts
- [ ] T017 [US3] Ensure chronological ordering by event_date and start_time in db.ts
- [ ] T018 [US3] Add approved events to seed data in current month and next 2 months in db.ts
- [ ] T019 [US3] Verify referential integrity constraints in schema

**Checkpoint**: Database foundation complete with all requirements met

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integration and validation

- [ ] T020 [P] Update App.tsx to render PublicPortal component
- [ ] T021 Test API endpoint returns correct data
- [ ] T022 Manual browser validation per quickstart.md scenarios
- [ ] T023 Verify data persists after F5 reload

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Extends US1 but independently testable
- **User Story 3 (P1)**: Can start after Foundational - Foundation already done, verification tasks

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different files)
- T004, T005, T006, T007 can be done together in db.ts and server.ts
- T008 can run in parallel with other US1 tasks
- T013 can run in parallel
- T016, T017, T018, T019 can be done together
- T020, T021 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test public portal displays approved events correctly
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Database and server ready
2. Add User Story 1 → Test independently (MVP!)
3. Add User Story 2 → Search functionality
4. Add User Story 3 → Verify persistence
5. Polish → Full validation

All tasks have been implemented. The system is ready.
