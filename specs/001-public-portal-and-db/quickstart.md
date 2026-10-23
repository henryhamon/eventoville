# Quickstart: Public Portal and Database Foundation

**Feature**: 001-public-portal-and-db  
**Date**: 2026-10-23

## Prerequisites

- Node.js installed
- Dependencies installed (npm install)

## Setup

1. Ensure database schema and seed are implemented in `db.ts`
2. Ensure API routes are implemented in `server.ts`
3. Ensure frontend components are in `src/`
4. Start the development server

## Validation Scenarios

### Scenario 1: Database Initialization
**Steps**:
1. Delete `database.sqlite` if exists
2. Start the server
3. Check that `database.sqlite` is created

**Expected**:
- File exists on disk
- Contains all tables: users, courses, themes, locations, resources, events, event_resources
- Has seed data with events in various states
- Has approved events in current/next 2 months

### Scenario 2: Public Portal Access (No Auth)
**Steps**:
1. Open browser to http://localhost:PORT (or configured port)
2. View the page without logging in

**Expected**:
- Public visitor view is displayed (#view-visitor equivalent)
- No login required
- Page loads in under 2 seconds

### Scenario 3: Approved Events Only
**Steps**:
1. View public portal
2. Check event list

**Expected**:
- Only events with status APROVADO are shown
- No RASCUNHO, AGUARDANDO_APROVACAO, REJEITADO, or CANCELADO events visible

### Scenario 4: 3-Month Window
**Steps**:
1. Check event dates in the list
2. Compare with current date

**Expected**:
- All events have event_date in current month or next 2 months
- Events outside this window are not shown
- Events are ordered chronologically by date and time

### Scenario 5: Columns Display
**Steps**:
1. Look at the events table/grid

**Expected**:
- Columns visible: Data, Evento, Tema, Início, Local, Palestrante, Realização
- All data populated correctly

### Scenario 6: Local Text Search
**Steps**:
1. Type text in search field
2. Observe filtering
3. Clear search field

**Expected**:
- List filters locally without page reload
- Searches across event title, theme, speaker, location, realization
- Clearing search shows all events again

### Scenario 7: Persistence After Reload
**Steps**:
1. View public portal
2. Press F5 (reload page)
3. View again

**Expected**:
- Same events displayed
- Data persists from database.sqlite
- No data loss

## Manual Verification Checklist

- [ ] database.sqlite created on disk
- [ ] All 7 tables exist with correct schema
- [ ] Foreign keys enforced
- [ ] Seed data loaded
- [ ] Public page accessible without auth
- [ ] Only approved events shown
- [ ] Only events in 3-month window shown
- [ ] Events ordered chronologically
- [ ] All 7 columns displayed
- [ ] Local search works
- [ ] Data persists after F5 reload
