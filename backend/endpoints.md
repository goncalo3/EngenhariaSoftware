# API Endpoints

Base URL: `http://localhost/api`

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new user account |
| POST | `/auth/login` | Authenticate user, sets httpOnly cookie |
| POST | `/auth/logout` | Clear auth cookie |

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users |
| GET | `/users/me/teams` | Get current user's teams |
| GET | `/users/:userId/teams` | Get all teams a user is in |
| GET | `/teams/:teamId/users` | Get all users in a team |

## Incidents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/teams/:teamId/incidents` | Create new incident |
| GET | `/teams/:teamId/incidents` | List all team incidents |
| GET | `/teams/:teamId/incidents/:incidentId` | Get single incident |
| PATCH | `/teams/:teamId/incidents/:incidentId` | Update incident (role-based) |

### Incident Update Permissions

| Field | User | Manager | Admin |
|-------|------|---------|-------|
| `title` | ✅ (if reporter) | ✅ | ✅ |
| `status` | ✅ (if assigned) | ✅ | ✅ |
| `assigned_to_user_id` | ❌ | ✅ | ✅ |

### Incident Status Values
- `pending`
- `under_review`
- `escalated`
- `resolved`

## Team Roles
- `user` - Basic member
- `manager` - Can assign incidents, change status
- `admin` - Full access including delete
