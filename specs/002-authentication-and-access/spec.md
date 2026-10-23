# Feature Specification: Authentication and Access Control

**Feature Branch**: `002-authentication-and-access`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: Authentication and access control requirements

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Login (Priority: P1)

Users need to authenticate with their institutional credentials to access role-specific features.

**Why this priority**: Core security requirement for accessing protected functionality.

**Independent Test**: Can test login with valid/invalid credentials and verify correct profile is returned.

**Acceptance Scenarios**:

1. **Given** valid credentials for a user, **When** logging in, **Then** system authenticates and returns user profile with role
2. **Given** invalid credentials, **When** logging in, **Then** system rejects login with appropriate error
3. **Given** a logged-in user, **When** page is reloaded, **Then** session persists in browser

---

### User Story 2 - Role-Based Access Control (Priority: P1)

Different user roles must have appropriate access restrictions.

**Why this priority**: Critical security requirement - prevents unauthorized access.

**Independent Test**: Test access to admin areas with different roles.

**Acceptance Scenarios**:

1. **Given** a SOLICITANTE user, **When** trying to access admin areas, **Then** access is blocked
2. **Given** an ADMIN user, **When** accessing admin areas, **Then** access is granted
3. **Given** unauthenticated user, **When** trying to access protected areas, **Then** access is denied

---

### User Story 3 - No Self-Registration (Priority: P1)

Public users cannot create accounts themselves - only administrators can create users.

**Why this priority**: Enforces institutional control as specified.

**Independent Test**: Verify public registration is blocked, only admin can create users.

**Acceptance Scenarios**:

1. **Given** a public visitor, **When** trying to access registration, **Then** self-registration is not available
2. **Given** an ADMIN user, **When** creating a new user, **Then** account is created successfully
3. **Given** a SOLICITANTE user, **When** trying to create users, **Then** access is blocked

---

### User Story 4 - Password Recovery (Priority: P2)

Users can recover/reset their passwords via email with temporary tokens.

**Why this priority**: Important for user account recovery.

**Independent Test**: Generate token, validate it, reset password successfully.

**Acceptance Scenarios**:

1. **Given** a valid email, **When** requesting password recovery, **Then** temporary token is generated
2. **Given** a valid temporary token, **When** resetting password, **Then** password is updated with new hash
3. **Given** an expired/invalid token, **When** resetting password, **Then** request is rejected

---

### Edge Cases

- What happens with expired tokens? (Must be rejected)
- How are sessions handled after logout? (Cleared properly)
- What if user tries to reuse a token? (Should be invalidated after use)
- How does system handle multiple login attempts? (Basic protection)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST have user authentication with fields: email (institutional), password_hash, role, name
- **FR-002**: Login route MUST validate credentials and return user profile with role
- **FR-003**: System MUST enforce role-based access control (VISITANTE, SOLICITANTE, ADMIN)
- **FR-004**: SOLICITANTE users MUST NOT access administrative areas
- **FR-005**: Public users MUST NOT be able to self-register (no public registration endpoint)
- **FR-006**: Only ADMIN users MUST be able to create new users
- **FR-007**: Password recovery MUST generate temporary tokens
- **FR-008**: Password reset MUST validate temporary tokens before updating password
- **FR-009**: Passwords MUST be updated using secure hashing
- **FR-010**: Sessions MUST persist in browser (cookies or session storage)
- **FR-011**: Unauthenticated access to protected resources MUST fail with appropriate error
- **FR-012**: Tokens MUST be temporary and validated on use

### Key Entities *(include if feature involves data)*

- **users**: Already exists with role, email, password_hash - may need password_reset_tokens
- **password_reset_tokens**: Temporary tokens for password recovery (token, user_id, expires_at, used)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Valid login returns correct user profile in under 1 second
- **SC-002**: Invalid login is rejected with appropriate error message
- **SC-003**: SOLICITANTE cannot access admin areas (100% blocked)
- **SC-004**: Public users cannot self-register
- **SC-005**: Password recovery flow works with temporary tokens
- **SC-006**: Sessions persist after browser reload (F5)
- **SC-007**: Unauthenticated requests to protected endpoints are properly rejected

## Assumptions

- Sessions use HTTP cookies for persistence
- Password reset tokens expire after reasonable time (e.g., 1 hour)
- Email sending is simulated locally (no actual email sent, just token generation)
- Existing user model in db.ts will be extended as needed
- Authentication middleware will be added to server.ts
