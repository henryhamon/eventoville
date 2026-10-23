# API Contracts: Event Requests

### POST /api/events
Create event (draft or submit)

### PUT /api/events/:id/submit
Submit draft for approval (checks conflicts)

### PUT /api/events/:id/approve (Admin only)
Approve event (checks conflicts again)

### PUT /api/events/:id/reject (Admin only)
Reject with reason

### DELETE /api/events/:id
Delete draft
