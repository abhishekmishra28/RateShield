Objective:
Expose the Token Bucket algorithm through a REST API.

Tasks Completed:

- Created bucket store using Map
- Implemented rate limit controller
- Added POST /api/v1/check endpoint
- Connected route to Express application
- Tested allow/deny flow using Postman

Learning:

- Controllers should contain request handling logic
- Services should contain business logic
- Each client requires its own bucket state
- API endpoints should remain independent of the algorithm implementation

Next Goal:

Persist client configuration in PostgreSQL and replace hardcoded bucket settings.