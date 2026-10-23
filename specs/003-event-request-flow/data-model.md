# Data Model: Event Request Flow

**Feature**: 003-event-request-flow  
**Date**: 2026-10-23

## Extended events table

Add fields:
- requester_name TEXT (free text, independent of user)
- target_audience TEXT
- justification TEXT
- objective TEXT
- needs_ceremonial INTEGER DEFAULT 0 (0/1 for No/Yes)
- needs_certificates INTEGER DEFAULT 0
- observations TEXT
- cost_center TEXT
- rejection_reason TEXT (already exists)

## Conflict Detection Query
```sql
SELECT COUNT(*) FROM events 
WHERE location_id = ? 
  AND event_date = ? 
  AND status = 'APROVADO'
  AND start_time < ? 
  AND end_time > ?
```
Where ? are existing event's end_time, new event's start_time
