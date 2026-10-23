# Feature Specification: Public Portal and Database Foundation

**Feature Branch**: `001-public-portal-and-db`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "001-public-portal-and-db)

O QUE é: Especificar a fundação do banco de dados relacional com seed inicial e a Página Inicial Pública para consulta de eventos.

POR QUE é necessário: Garantir persistência real imediata em disco e permitir que visitantes consultem a agenda institucional oficial da Univille com transparência e sem atrito de login.

Requisitos Funcionais e Escopo:

Criar o modelo relacional completo (users, courses, themes, locations, resources, events, event_resources) assegurando integridade referencial.
Garantir carga automática de dados fictícios (seed) cobrindo estados do ciclo de vida e eventos aprovados na janela temporal exigida.
Exibir na vitrine pública apenas eventos aprovados do mês atual e dos dois seguintes (janela de 3 meses), ordenados cronologicamente, com colunas: Data, Evento, Tema, Início, Local, Palestrante e Realização.
Incluir busca rápida local por texto." 

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visit Public Event Portal (Priority: P1)

A visitor wants to browse the official Univille institutional event agenda without logging in, to see upcoming approved events.

**Why this priority**: Core functionality - provides immediate value with no authentication barrier, meeting transparency requirements.

**Independent Test**: Can be fully tested by accessing the public homepage without login and viewing approved events in the 3-month window.

**Acceptance Scenarios**:

1. **Given** no user is logged in, **When** visiting the public homepage, **Then** the system displays only approved events from current month and next two months, ordered chronologically
2. **Given** the public homepage is displayed, **When** viewing the events list, **Then** each event shows: Date, Event name, Theme, Start time, Location, Speaker, and Realização (organizer/realization)
3. **Given** there are approved events and events in other states, **When** viewing the public portal, **Then** only approved events are visible (drafts, pending, rejected, cancelled are hidden)

---

### User Story 2 - Quick Text Search (Priority: P1)

A visitor wants to quickly search events by text to find specific topics, speakers, or event names.

**Why this priority**: Essential for usability when browsing institutional agenda.

**Independent Test**: Can be tested by entering search terms and verifying results filter locally.

**Acceptance Scenarios**:

1. **Given** the public events list is displayed, **When** typing in the quick search field, **Then** the list filters locally to show only events matching the search text
2. **Given** a search is active, **When** clearing the search field, **Then** all approved events in the 3-month window are shown again

---

### User Story 3 - Persistent Database with Seed Data (Priority: P1)

The system must have a real SQLite database on disk with complete relational schema and initial seed data covering all lifecycle states.

**Why this priority**: Foundation requirement - ensures real persistence and provides test data.

**Independent Test**: Can be verified by checking database.sqlite exists with all tables and seed data loaded.

**Acceptance Scenarios**:

1. **Given** the system starts for the first time, **When** initialized, **Then** database.sqlite is created on disk with all required tables (users, courses, themes, locations, resources, events, event_resources)
2. **Given** the database is initialized, **When** checked, **Then** referential integrity constraints are enforced between related tables
3. **Given** the database is initialized, **When** checked, **Then** seed data is loaded covering different event states and includes approved events in the required time window

---

### Edge Cases

- What happens when there are no approved events in the current/next two months? (Show empty state)
- How does system handle events that span midnight? (Must respect start_time and end_time correctly)
- What happens if database.sqlite doesn't exist on first run? (Must auto-create and seed)
- How does search behave with special characters or accents? (Local search should handle reasonably)
- What if an event is approved but date is outside the 3-month window? (Must not be displayed on public portal)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create and maintain a SQLite database in file `database.sqlite` on disk
- **FR-002**: System MUST define complete relational schema with tables: `users`, `courses`, `themes`, `locations`, `resources`, `events`, `event_resources` with referential integrity
- **FR-003**: System MUST automatically load seed data on initialization covering event lifecycle states (RASCUNHO, AGUARDANDO_APROVACAO, REJEITADO, APROVADO, CANCELADO)
- **FR-004**: Public homepage MUST display only events with status `APROVADO`
- **FR-005**: Public homepage MUST display only approved events where event_date is in current month or the next two months (3-month window)
- **FR-006**: Public homepage MUST order events chronologically by event_date and start_time
- **FR-007**: Public homepage MUST display columns: Data (Date), Evento (Event), Tema (Theme), Início (Start time), Local (Location), Palestrante (Speaker), Realização (Realization/Organizer)
- **FR-008**: Public homepage MUST include a local text search that filters the displayed events without server round-trip
- **FR-009**: Seed data MUST include approved events within the required 3-month window for demonstration
- **FR-010**: All data MUST be persisted in real SQLite database (no in-memory mock data)

### Key Entities *(include if feature involves data)*

- **users**: User accounts with roles (VISITANTE, SOLICITANTE, ADMIN), authentication data (hashed passwords), institutional info
- **courses**: Academic courses/departments
- **themes**: Event themes/categories
- **locations**: Event locations/spaces with capacity
- **resources**: Available resources/equipment
- **events**: Core event entity with title, description, dates/times, status, speaker, realization/organizer, foreign keys to theme/course/location/user
- **event_resources**: Junction table linking events to required resources (many-to-many)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can view the public event agenda without authentication in under 2 seconds
- **SC-002**: Public portal displays exactly approved events from the 3-month window (current + 2 following months), with no other states visible
- **SC-003**: All 7 required columns are displayed for each event in the public listing
- **SC-004**: Local text search filters results instantly without page reload
- **SC-005**: Database.sqlite is created on disk on first run with complete schema and populated seed data
- **SC-006**: Referential integrity is enforced for all foreign key relationships

## Assumptions

- Current date is used to determine the 3-month window (current month + next 2 months)
- "Realização" refers to the entity/organizer responsible for the event (may be stored as text or related entity)
- "Palestrante" (speaker/presenter) is stored as text in the events table
- Local search searches across event name, theme, speaker, location, and realization fields
- Seed data will include realistic fictitious data for demonstration purposes
- Database initialization happens automatically on server start
- Frontend uses the existing HTML mock as reference for conversion to SolidJS components
