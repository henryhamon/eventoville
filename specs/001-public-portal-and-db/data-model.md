# Data Model: Public Portal and Database Foundation

**Feature**: 001-public-portal-and-db  
**Date**: 2026-10-23

## Entities

### users
User accounts for authentication and authorization.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL | Full name |
| email | TEXT | NOT NULL UNIQUE | Email address (institutional) |
| password_hash | TEXT | NOT NULL | Hashed password |
| role | TEXT | NOT NULL CHECK(role IN ('VISITANTE','SOLICITANTE','ADMIN')) | User role |
| course_id | INTEGER | FOREIGN KEY REFERENCES courses(id) | Associated course (optional) |
| created_at | TEXT | DEFAULT (datetime('now')) | Creation timestamp |

### courses
Academic courses/departments.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL | Course name |
| code | TEXT | NOT NULL UNIQUE | Course code |

### themes
Event themes/categories.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL UNIQUE | Theme name |

### locations
Event locations/spaces.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL UNIQUE | Location name |
| capacity | INTEGER | | Maximum capacity |
| description | TEXT | | Location description |

### resources
Available resources/equipment.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL UNIQUE | Resource name |
| description | TEXT | | Resource description |

### events
Core event entity.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| title | TEXT | NOT NULL | Event title (Evento) |
| description | TEXT | | Event description |
| event_date | TEXT | NOT NULL | Event date (YYYY-MM-DD) |
| start_time | TEXT | NOT NULL | Start time (HH:MM) |
| end_time | TEXT | NOT NULL | End time (HH:MM) |
| theme_id | INTEGER | FOREIGN KEY REFERENCES themes(id) | Event theme |
| course_id | INTEGER | FOREIGN KEY REFERENCES courses(id) | Associated course |
| location_id | INTEGER | NOT NULL FOREIGN KEY REFERENCES locations(id) | Event location |
| user_id | INTEGER | FOREIGN KEY REFERENCES users(id) | Creator/requester |
| speaker | TEXT | | Speaker/presenter (Palestrante) |
| realization | TEXT | NOT NULL | Organizer/realization (Realização) |
| status | TEXT | NOT NULL CHECK(status IN ('RASCUNHO','AGUARDANDO_APROVACAO','REJEITADO','APROVADO','CANCELADO')) | Event status |
| rejection_reason | TEXT | | Reason for rejection (required if REJEITADO) |
| created_at | TEXT | DEFAULT (datetime('now')) | Creation timestamp |
| updated_at | TEXT | DEFAULT (datetime('now')) | Last update timestamp |

### event_resources
Junction table for event resources (many-to-many).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| event_id | INTEGER | NOT NULL FOREIGN KEY REFERENCES events(id) ON DELETE CASCADE | Event reference |
| resource_id | INTEGER | NOT NULL FOREIGN KEY REFERENCES resources(id) ON DELETE CASCADE | Resource reference |

**Primary Key**: (event_id, resource_id)

## Relationships

- users.course_id → courses.id (many-to-one, optional)
- events.theme_id → themes.id (many-to-one)
- events.course_id → courses.id (many-to-one)
- events.location_id → locations.id (many-to-one, required)
- events.user_id → users.id (many-to-one)
- event_resources.event_id → events.id (many-to-one, cascade delete)
- event_resources.resource_id → resources.id (many-to-one, cascade delete)

## Validation Rules

- Events in REJEITADO status MUST have rejection_reason (enforced by application logic)
- Events in APROVADO status: only Admin can edit/cancel (enforced by authorization)
- Time conflicts checked on submission (AGUARDANDO_APROVACAO) and approval (APROVADO)
- Public portal shows only APROVADO events in current month + next 2 months
- Passwords must be hashed (not plain text)

## State Transitions

- RASCUNHO → AGUARDANDO_APROVACAO (by creator)
- AGUARDANDO_APROVACAO → APROVADO (by Admin, after conflict check)
- AGUARDANDO_APROVACAO → REJEITADO (by Admin, requires rejection_reason)
- APROVADO → CANCELADO (by Admin only)
- REJEITADO can be edited back to RASCUNHO/AGUARDANDO_APROVACAO by creator
