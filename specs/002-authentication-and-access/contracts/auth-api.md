# API Contracts: Authentication

**Feature**: 002-authentication-and-access  
**Date**: 2026-10-23

## Endpoints

### POST /api/auth/login
Authenticate user

**Request**:
```json
{
  "email": "admin@univille.br",
  "password": "admin123"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@univille.br",
    "role": "ADMIN"
  }
}
```

**Response** (401 Unauthorized):
```json
{
  "error": "Invalid credentials"
}
```

### POST /api/auth/logout
Logout user

**Response** (200 OK):
```json
{
  "message": "Logged out"
}
```

### GET /api/auth/me
Get current user

**Response** (200 OK):
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@univille.br",
    "role": "ADMIN"
  }
}
```

**Response** (401 Unauthorized):
```json
{
  "error": "Not authenticated"
}
```

### POST /api/auth/forgot-password
Request password reset

**Request**:
```json
{
  "email": "user@univille.br"
}
```

**Response** (200 OK):
```json
{
  "message": "Password reset token generated",
  "token": "abc123..."
}
```

### POST /api/auth/reset-password
Reset password with token

**Request**:
```json
{
  "token": "abc123...",
  "newPassword": "newpass123"
}
```

**Response** (200 OK):
```json
{
  "message": "Password updated"
}
```

### POST /api/admin/users (Protected - ADMIN only)
Create user (admin only)

**Request**:
```json
{
  "name": "New User",
  "email": "new@univille.br",
  "password": "pass123",
  "role": "SOLICITANTE",
  "course_id": 1
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": 3,
    "name": "New User",
    "email": "new@univille.br",
    "role": "SOLICITANTE"
  }
}
```
