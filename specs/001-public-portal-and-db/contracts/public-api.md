# API Contracts: Public Portal

**Feature**: 001-public-portal-and-db  
**Date**: 2026-10-23

## Public Endpoints (No Authentication Required)

### GET /api/public/events
Get approved events for public display (current month + next 2 months).

**Request**:
- Method: GET
- URL: /api/public/events
- Headers: None required
- Query params: None

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "title": "Workshop de Inteligência Artificial",
    "description": "Introdução ao Machine Learning",
    "event_date": "2026-10-25",
    "start_time": "14:00",
    "end_time": "16:00",
    "theme_id": 1,
    "theme_name": "Tecnologia",
    "location_id": 1,
    "location_name": "Auditório Principal",
    "speaker": "Prof. João Silva",
    "realization": "Departamento de Computação",
    "status": "APROVADO"
  }
]
```

**Behavior**:
- Returns only events with status = 'APROVADO'
- Filters to events where event_date is in current month or next 2 months
- Ordered by event_date ASC, start_time ASC
- Includes joined data: theme_name, location_name
- No authentication required

**Error Responses**:
- 500 Internal Server Error: Database error

### GET /
Serve public portal HTML/SPA (frontend)

**Request**: GET /
**Response**: HTML page with public portal (visitor view)

## Notes

- Search is performed client-side on the returned data (local search)
- All dates in ISO format YYYY-MM-DD
- All times in HH:MM format
