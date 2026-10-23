# Feature Specification: Reports and CSV Export

**Feature Branch**: `005-reports-export`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: Reports with filters and CSV export

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Reports (Priority: P1)

Admin needs to generate reports with filters and export to CSV.

**Why this priority**: Required for institutional accountability.

**Independent Test**: Apply filters, view results, export CSV.

**Acceptance Scenarios**:

1. **Given** Admin in reports section, **When** applying filters (date range, course, theme), **Then** results filtered
2. **Given** filtered results, **When** viewing table, **Then** all required fields displayed
3. **Given** filtered results, **When** exporting CSV, **Then** CSV contains exactly same records and fields

---

### Edge Cases

- Special characters in names/descriptions (must be handled in CSV)
- Empty results
- Date range validation

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Reports MUST have filters: Data Inicial, Data Final, Curso/Coordenação, Tema
- **FR-002**: Table MUST show: Nome do evento, Data, Horário inicial/final, Tema, Curso/Coordenação, Centro de Custo, Local, Solicitante, Estado (Status)
- **FR-003**: Export MUST generate CSV with exactly the filtered records and fields shown
- **FR-004**: CSV MUST support special characters
- **FR-005**: Only Admin can access reports

### Success Criteria

- **SC-001**: Filters work correctly
- **SC-002**: CSV export matches displayed data exactly
- **SC-003**: Special characters handled properly

## Assumptions

- All filters can be combined
- Date filters are inclusive
- CSV uses comma delimiter with proper escaping
