# Implementation Plan: Event Request Flow and Conflict Prevention

**Branch**: `003-event-request-flow` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-event-request-flow/spec.md`

## Summary

Implement Solicitante event request flow with draft/submission management, conflict detection on submission and approval, and full UI integration matching mock.html. Add all form fields, dynamic dependencies (course->cost center, location->resources), and state transitions.

## Technical Context

**Language/Version**: Node.js with TypeScript  
**Primary Dependencies**: Express, SolidJS, better-sqlite3 equivalent (node:sqlite)  
**Storage**: SQLite (extend events table)  
**Testing**: Manual validation  
**Target Platform**: Local web app  
**Project Type**: Web application  
**Performance Goals**: Fast form interactions  
**Constraints**: Backend in db.ts/server.ts, conflict detection must be enforced  
**Scale/Scope**: Event management workflow

## Constitution Check

- [x] Language: Portuguese docs, English code ✓
- [x] Stack: Node.js + Express + SQLite + SolidJS ✓
- [x] File economy: db.ts and server.ts ✓
- [x] Conflict detection on submission and approval ✓
- [x] State machine rules ✓
- [x] No mocks in memory ✓

## Project Structure

### Source Code
```text
/
├── db.ts                # Extend events schema
├── server.ts            # Add event request routes with conflict check
├── src/
│   ├── components/
│   │   ├── EventRequestForm.tsx
│   │   ├── MyRequests.tsx
│   │   └── ...
│   └── App.tsx
```
