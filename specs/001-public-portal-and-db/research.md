# Research: Public Portal and Database Foundation

**Feature**: 001-public-portal-and-db  
**Date**: 2026-10-23

## Decisions

### 1. Database Schema Design
**Decision**: Create 7 tables as specified with foreign keys and referential integrity  
**Rationale**: Meets FR-002 requirement for complete relational model  
**Tables**:
- users (id, name, email, password_hash, role, course_id, created_at)
- courses (id, name, code)
- themes (id, name)
- locations (id, name, capacity, description)
- resources (id, name, description)
- events (id, title, description, event_date, start_time, end_time, theme_id, course_id, location_id, user_id, speaker, realization, status, rejection_reason, created_at, updated_at)
- event_resources (event_id, resource_id) - composite key

### 2. Date/Time Handling
**Decision**: Use TEXT for dates (ISO 8601 YYYY-MM-DD) and times (HH:MM) for SQLite simplicity  
**Rationale**: Easy to query and compare, works well with better-sqlite3  
**Note**: JavaScript Date can parse ISO strings

### 3. 3-Month Window Calculation
**Decision**: Current month + next 2 months (total 3 months including current)  
**Rationale**: "mês atual e dos dois seguintes" means current month and the following two months  
**Implementation**: Get current date, calculate start of current month and end of month + 2 months

### 4. Seed Data Strategy
**Decision**: Generate seed data on first run if database is empty or missing  
**Rationale**: Auto-initialization as per FR-003  
**Content**: Include events in all states, with approved events spread across current and next 2 months

### 5. Public API Endpoint
**Decision**: Single endpoint like GET /api/public/events  
**Rationale**: Simple, returns JSON for frontend to consume and filter locally for search  
**Response**: Array of events with joined theme name, location name, etc.

### 6. Frontend Structure
**Decision**: Convert visitor view (#view-visitor) from mock.html to SolidJS component PublicPortal.tsx  
**Rationale**: Keep UI similar to mock, use SolidJS reactivity for local search  
**Search**: Client-side filter on loaded data (no server round-trip)

### 7. Password Hashing
**Decision**: Use Node.js crypto.scryptSync for zero dependencies (as per constitution)  
**Rationale**: Preferred over bcrypt to avoid extra deps, still secure  
**Note**: Only needed when auth is implemented later, but schema should support it

## Alternatives Considered

- Using better-sqlite3's built-in features vs manual queries - chose manual SQL for clarity
- Server-side search vs client-side - chose client-side for "local search" requirement
- Date objects vs strings - chose strings for SQLite compatibility

## Dependencies

- better-sqlite3: SQLite driver
- express or hono: HTTP server (constitution says "Express/Hono")
- solid-js, vite: Frontend framework
- @solidjs/router: If routing needed (likely)
