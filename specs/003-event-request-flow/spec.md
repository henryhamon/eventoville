# Feature Specification: Event Request Flow and Conflict Prevention

**Feature Branch**: `003-event-request-flow`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: Event request flow for Solicitante and conflict prevention

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Event Request (Priority: P1)

A Solicitante needs to create event requests as draft or submit for approval.

**Why this priority**: Core functionality for the reservation process.

**Independent Test**: Can create draft, edit, delete, and submit for approval.

**Acceptance Scenarios**:

1. **Given** authenticated Solicitante, **When** creating event request, **Then** form has all required fields
2. **Given** incomplete form, **When** saving as draft, **Then** event saved in RASCUNHO status (editable/deletable)
3. **Given** complete form, **When** submitting, **Then** event goes to AGUARDANDO_APROVACAO after validation

---

### User Story 2 - Conflict Prevention (Priority: P1)

System must prevent scheduling conflicts in same location on same date with overlapping times.

**Why this priority**: Critical business rule - prevents double-booking.

**Independent Test**: Try to book overlapping time in same location, verify blocked.

**Acceptance Scenarios**:

1. **Given** approved event in Location A 14:00-16:00, **When** submitting new event in same location same day 15:00-17:00, **Then** blocked due to overlap
2. **Given** approved event 14:00-16:00, **When** submitting 16:00-18:00, **Then** allowed (adjacent, no overlap)
3. **Given** events in different locations same time, **When** submitting, **Then** allowed
4. **Given** conflict exists, **When** Admin approves event, **Then** blocked again on approval

---

### User Story 3 - Event State Management (Priority: P1)

Events follow specific states with proper permissions.

**Why this priority**: Ensures proper workflow control.

**Independent Test**: Test state transitions with different roles.

**Acceptance Scenarios**:

1. **Given** draft event, **When** Solicitante edits/deletes, **Then** allowed
2. **Given** AGUARDANDO_APROVACAO event, **When** Solicitante cancels, **Then** can cancel
3. **Given** REJEITADO event, **When** Admin rejects, **Then** must provide rejection reason
4. **Given** APROVADO event, **When** Solicitante tries to edit, **Then** blocked (only Admin)
5. **Given** APROVADO event, **When** viewing public portal, **Then** displayed

---

### Edge Cases

- What if end time equals start time of another event? (Adjacent - allowed per requirement)
- Can same user have multiple drafts? (Yes)
- What happens to CANCELADO events? (Not shown in public portal, kept in history)
- Course/Coordenação defines Centro de Custo automatically
- Local determines available resources dynamically

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Event request form MUST include all specified fields
- **FR-002**: Each event occupies single location and single day
- **FR-003**: "Solicitante" field is free text independent of authenticated user
- **FR-004**: Curso/Coordenação defines Centro de Custo automatically
- **FR-005**: Local determines dynamically selectable resources
- **FR-006**: Events can be saved as RASCUNHO (editable/deletable by Solicitante)
- **FR-007**: Submitting moves event to AGUARDANDO_APROVACAO with validation
- **FR-008**: REJEITADO requires mandatory rejection reason from Admin
- **FR-009**: APROVADO events published to public portal automatically
- **FR-010**: Only Admin can edit/cancel APROVADO events
- **FR-011**: Conflict check on submission (AGUARDANDO_APROVACAO)
- **FR-012**: Conflict check on approval (APROVADO)
- **FR-013**: Same location, same date, overlapping intervals blocked
- **FR-014**: Different locations allowed simultaneously
- **FR-015**: Adjacent times (end == start) not considered overlap
- **FR-016**: CANCELADO events not shown in public portal but kept in history

### Key Entities *(include if feature involves data)*

- **events**: Extend with all form fields (target_audience, justification, objective, requester_name, needs_ceremonial, needs_certificates, observations, cost_center)
- **event_resources**: Already exists for resource selection

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Solicitante can create and manage drafts successfully
- **SC-002**: Conflict detection blocks overlapping events in same location
- **SC-003**: Adjacent times are allowed (no false conflicts)
- **SC-004**: State transitions follow rules correctly
- **SC-005**: Approved events appear in public portal
- **SC-006**: Rejected events require justification
- **SC-007**: Only Admin can modify approved events

## Assumptions

- Centro de Custo is derived from course/coordination
- Resources are linked to locations (can be selected based on location)
- Conflict check uses: same location_id, same event_date, start_time < existing.end_time AND end_time > existing.start_time (for APROVADO events)
- "Solicitante" name is text field, not tied to logged user
- Events in CANCELADO status after being submitted remain in history
