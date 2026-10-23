# Tasks: Authentication and Access Control

**Input**: Design documents from `/specs/002-authentication-and-access/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `db.ts`, `server.ts` at repository root
- Frontend: `src/` directory
- Dependencies: `package.json`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and prepare structure

- [ ] T001 [P] Add cookie-parser to package.json
- [ ] T002 [P] Install dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Add password_reset_tokens table to db.ts schema
- [ ] T004 Add getDb export to db.ts
- [ ] T005 Add cookie-parser middleware to server.ts
- [ ] T006 Implement session store (Map) in server.ts
- [ ] T007 Implement requireAuth and requireAdmin middleware in server.ts

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - User Login (Priority: P1) 🎯 MVP

**Goal**: Users can authenticate with credentials and session persists

**Independent Test**: Login with valid/invalid credentials, verify session after reload

### Implementation for User Story 1

- [ ] T008 [P] [US1] Implement POST /api/auth/login in server.ts
- [ ] T009 [P] [US1] Implement POST /api/auth/logout in server.ts
- [ ] T010 [P] [US1] Implement GET /api/auth/me in server.ts
- [ ] T011 [US1] Create Login component in src/components/Login.tsx from mock
- [ ] T012 [US1] Integrate login UI with auth API

**Checkpoint**: Login works with session persistence

---

## Phase 4: User Story 2 - Role-Based Access Control (Priority: P1)

**Goal**: Enforce role restrictions

**Independent Test**: SOLICITANTE blocked from admin areas

### Implementation for User Story 2

- [ ] T013 [P] [US2] Protect admin routes with requireAdmin middleware in server.ts
- [ ] T014 [US2] Add role checking in frontend components

**Checkpoint**: Role-based access enforced

---

## Phase 5: User Story 3 - No Self-Registration (Priority: P1)

**Goal**: Prevent public registration, only admin can create users

**Independent Test**: No public registration endpoint exists

### Implementation for User Story 3

- [ ] T015 [P] [US3] Implement POST /api/admin/users with requireAdmin in server.ts
- [ ] T016 [US3] Ensure no public registration endpoint exists
- [ ] T017 [US3] Add admin UI for user creation

**Checkpoint**: Self-registration blocked, admin creation works

---

## Phase 6: User Story 4 - Password Recovery (Priority: P2)

**Goal**: Password recovery via email with temporary tokens

**Independent Test**: Generate token, validate, reset password

### Implementation for User Story 4

- [ ] T018 [P] [US4] Implement POST /api/auth/forgot-password in server.ts
- [ ] T019 [P] [US4] Implement POST /api/auth/reset-password in server.ts
- [ ] T020 [US4] Add password recovery UI components

**Checkpoint**: Password recovery flow works

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integration and validation

- [ ] T021 [P] Update App.tsx with auth routing
- [ ] T022 Test all auth scenarios
- [ ] T023 Validate with test credentials

---

## Dependencies & Execution Order

### Phase Dependencies
- Setup → Foundational → User Stories → Polish

### Parallel Opportunities
- T001, T002 can run in parallel
- T003-T007 can be done in parallel across files
- Auth routes can be implemented in parallel
- Frontend components can be developed in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Setup + Foundational
2. User Story 1 (Login)
3. Test and validate

All authentication features implemented.
