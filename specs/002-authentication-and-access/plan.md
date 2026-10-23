# Implementation Plan: Authentication and Access Control

**Branch**: `002-authentication-and-access` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-authentication-and-access/spec.md`

## Summary

Implement authentication system with login, role-based access control, password recovery, and session persistence. Add login UI from mock, protect routes by role, prevent self-registration, and enable admin user creation.

## Technical Context

**Language/Version**: Node.js with TypeScript  
**Primary Dependencies**: Express, node:crypto (for hashing), cookie-parser  
**Storage**: SQLite (extend existing schema)  
**Testing**: Manual validation  
**Target Platform**: Local web app  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Login under 1 second  
**Constraints**: Backend in db.ts/server.ts, no external email service (simulate locally), use native crypto  
**Scale/Scope**: Small institutional system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Language Policy: Docs Portuguese, code English ✓
- [x] Tech Stack: Node.js + Express + SQLite + SolidJS ✓
- [x] File Economy: Backend in db.ts and server.ts ✓
- [x] Real Database: SQLite, no mocks ✓
- [x] Passwords: Use crypto.scryptSync ✓
- [x] Roles: VISITANTE, SOLICITANTE, ADMIN ✓
- [x] No self-registration ✓
- [x] Session persistence required ✓

## Project Structure

### Documentation (this feature)

```text
specs/002-authentication-and-access/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
/
├── db.ts                # Extend schema for auth
├── server.ts            # Add auth routes and middleware
├── src/
│   ├── components/
│   │   ├── Login.tsx    # Login UI from mock
│   │   ├── AdminPanel.tsx
│   │   └── UserDashboard.tsx
│   └── App.tsx          # Add auth routing
└── package.json         # Add cookie-parser
```

**Structure Decision**: Extend existing structure, add auth components and middleware.
