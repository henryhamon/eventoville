# Data Model: Authentication and Access Control

**Feature**: 002-authentication-and-access  
**Date**: 2026-10-23

## Entities

### users (existing - extend if needed)
Already exists. Fields: id, name, email, password_hash, role, course_id, created_at

### password_reset_tokens (new)
Temporary tokens for password recovery.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| token | TEXT | NOT NULL UNIQUE | Random token |
| user_id | INTEGER | NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE | User reference |
| expires_at | TEXT | NOT NULL | Expiration timestamp |
| used | INTEGER | DEFAULT 0 | 0 = not used, 1 = used |
| created_at | TEXT | DEFAULT (datetime('now')) | Creation timestamp |

### sessions (conceptual - using cookies)
Session tokens stored in memory or could be added to DB. Using in-memory map for simplicity.

## Relationships
- password_reset_tokens.user_id → users.id (many-to-one, cascade delete)

## Validation Rules
- Password reset tokens expire after set time
- Tokens can only be used once
- Only ADMIN can create users
- No public registration
- Passwords must be hashed with crypto.scryptSync
