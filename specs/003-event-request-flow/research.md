# Research: Event Request Flow and Conflict Prevention

**Feature**: 003-event-request-flow  
**Date**: 2026-10-23

## Decisions

### 1. Conflict Detection Logic
**Decision**: Check for overlap where start_time < existing.end_time AND end_time > existing.start_time  
**Rationale**: Matches requirement - adjacent times (end == start) don't overlap  
**Scope**: Same location_id, same event_date, events with status APROVADO

### 2. Events Table Extension
**Decision**: Add columns for all form fields  
**Rationale**: Need to store target_audience, justification, objective, requester_name (free text), needs_ceremonial, needs_certificates, observations, cost_center  
**Also track**: user_id for creator, status, rejection_reason

### 3. Dynamic Dependencies
**Decision**: 
- Course selection sets cost_center from course name/code
- Location selection filters available resources (via location_resources or just show all with note)
**Rationale**: Frontend can handle dynamic behavior

### 4. State Transitions
**Decision**: Enforce in backend
- RASCUNHO: editable/deletable by creator
- Submit: validate, check conflicts, move to AGUARDANDO_APROVACAO
- Admin approve: check conflicts again, move to APROVADO
- Admin reject: require rejection_reason, move to REJEITADO
- Cancel: allowed in certain states

### 5. UI Components
**Decision**: Create EventRequestForm and MyRequests components matching mock style
