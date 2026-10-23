# Sistema de Gestão de Eventos Institucionais (SGEI) Constitution
<!-- Univille Software Engineering Challenge 2026 -->

## Core Principles

### I. Language Policy (NON-NEGOTIABLE)
All documentation (messages, specs, plan, tasks, contracts, etc.) MUST be in Brazilian Portuguese. All code and code comments MUST be in English. This ensures compliance with challenge requirements while maintaining international code standards.

### II. Technology Stack Constraints
The system MUST use: Node.js (Express/Hono + better-sqlite3) + SolidJS (Vite). Everything MUST be free/local with no external paid services. File economy is required - backend MUST be concentrated in `db.ts` (schema + seed) and `server.ts` (routes). Frontend MUST be lean, converting existing HTML mocks to SolidJS components.

### III. Real Database, No Mocked Data
SQLite MUST be used in file `database.sqlite`. Mocked/in-memory data is PROHIBITED. All data persistence MUST go through the real SQLite database. Passwords MUST be hashed using `bcrypt` or Node's native `crypto.scryptSync` (zero dependencies preferred).

### IV. Role-Based Access Control
Three profiles MUST be supported: Visitor (public access), `SOLICITANTE`, and `ADMIN`. Self-registration is PROHIBITED. Login is institutional or via password recovery by email. Authorization checks MUST be enforced at route level based on user profile.

### V. Conflict Detection (NON-NEGOTIABLE)
Time conflict detection MUST be enforced at submission (`AGUARDANDO_APROVACAO`) and approval (`APROVADO`) stages. An event MUST be blocked if there exists another event in the same `location_id` and `event_date` with `APROVADO` status where `start_time < existing.end_time AND end_time > existing.start_time`. This overlap rule is absolute and cannot be bypassed.

### VI. Event State Machine
Events MUST follow strict states: `RASCUNHO`, `AGUARDANDO_APROVACAO`, `REJEITADO` (requires `rejection_reason`), `APROVADO` (only Admin can edit/cancel), `CANCELADO`. State transitions MUST respect these rules with proper authorization checks.

## Additional Constraints

### Security Requirements
- All passwords MUST be hashed (bcrypt or crypto.scryptSync)
- No secrets or keys in codebase
- Authentication/authorization MUST be properly enforced
- SQL injection prevention via parameterized queries
- File uploads (if any) MUST be restricted and validated

### Data Integrity
- `database.sqlite` MUST be the single source of truth
- Schema changes require migration consideration
- Referential integrity MUST be maintained
- Conflict detection MUST be applied on both submission and approval

### Deployment
- System MUST run locally with no external dependencies
- All packages from npm registry only (free)
- No cloud services required

## Development Workflow

### Code Organization
- Backend: `db.ts` (schema + seed) and `server.ts` (routes) - keep minimal
- Frontend: Convert HTML mocks to SolidJS components in Vite setup
- Follow existing patterns and conventions in codebase

### Quality Gates
- All code in English, all docs in Brazilian Portuguese
- No mocked data in memory
- Passwords properly hashed
- Conflict detection tested for overlap cases
- Role permissions enforced
- State machine transitions validated

## Governance
This Constitution supersedes all other practices. Amendments require documentation, approval, and migration plan. All PRs/reviews MUST verify compliance with these principles. Complexity MUST be justified. Versioning follows semantic versioning.

**Version**: 1.0.0 | **Ratified**: 2026-10-23 | **Last Amended**: 2026-10-23
