# Quickstart: Authentication and Access Control

**Feature**: 002-authentication-and-access  
**Date**: 2026-10-23

## Test Credentials (from seed)

- Admin: admin@univille.br / admin123
- Solicitante: solicitante@univille.br / sol123

## Validation Scenarios

### Scenario 1: Login with Valid Credentials
**Steps**:
1. Go to login page
2. Enter admin@univille.br / admin123
3. Submit

**Expected**: Login successful, user profile returned with role ADMIN

### Scenario 2: Login with Invalid Credentials
**Steps**:
1. Enter wrong password
2. Submit

**Expected**: Login rejected with error

### Scenario 3: Session Persistence
**Steps**:
1. Login successfully
2. Press F5 to reload page

**Expected**: Still logged in, session persists

### Scenario 4: Role-Based Access - Solicitante Blocked from Admin
**Steps**:
1. Login as solicitante@univille.br
2. Try to access admin area

**Expected**: Access blocked

### Scenario 5: No Self-Registration
**Steps**:
1. Try to access public registration

**Expected**: No registration option available

### Scenario 6: Admin Creates User
**Steps**:
1. Login as admin
2. Create new user

**Expected**: User created successfully

### Scenario 7: Password Recovery
**Steps**:
1. Request password reset for email
2. Get token
3. Reset password with token

**Expected**: Password updated
