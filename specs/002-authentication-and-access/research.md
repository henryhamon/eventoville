# Research: Authentication and Access Control

**Feature**: 002-authentication-and-access  
**Date**: 2026-10-23

## Decisions

### 1. Session Management
**Decision**: Use HTTP cookies with signed tokens (or simple token in cookie)  
**Rationale**: Persists across reloads (F5), works with browser  
**Implementation**: Store session token in httpOnly cookie, validate on requests

### 2. Password Hashing
**Decision**: Use crypto.scryptSync (already in db.ts)  
**Rationale**: Constitution requires bcrypt or crypto.scryptSync, no extra deps

### 3. Password Reset Tokens
**Decision**: Generate random tokens, store in DB with expiration  
**Rationale**: Secure, trackable, can invalidate after use  
**Table**: password_reset_tokens (token, user_id, expires_at, used)

### 4. Authentication Middleware
**Decision**: Add middleware in server.ts to check auth and roles  
**Rationale**: Centralize access control

### 5. Login UI
**Decision**: Convert login section from mock.html to SolidJS component  
**Rationale**: Match existing design pattern

### 6. No Self-Registration
**Decision**: Don't create public /register endpoint, only admin can create users via protected endpoint  
**Rationale**: Explicit requirement

## Dependencies

- cookie-parser: Parse cookies (add to package.json)
