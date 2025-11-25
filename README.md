# Attendance System API

A production-ready REST API for attendance management with location-based clock-in/out, leave management, and role-based access control.

## Features

- User authentication with JWT
- Location-based clock-in/clock-out
- Leave request management
- Attendance correction requests
- Role-based access control (Admin, Manager, User)
- Password reset via email
- Audit logging
- Rate limiting
- Security headers with Helmet

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, express-rate-limit

## Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/asafarviv55/nodejs-attendance-system.git
cd nodejs-attendance-system

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 5000 |
| `TZ` | Timezone | UTC |
| `DB_HOST` | Database host | localhost |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration | 1h |
| `EMAIL_USER` | SMTP email | - |
| `EMAIL_PASS` | SMTP password | - |

## API Endpoints

### Health Check
- `GET /api/health` - Check API status

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Attendance
- `POST /api/attendance/clockin` - Clock in (requires location)
- `POST /api/attendance/clockout` - Clock out (requires location)
- `GET /api/attendance/reports` - Get attendance reports
- `POST /api/attendance/request-correction` - Request attendance correction
- `POST /api/attendance/respond-correction` - Respond to correction (Manager)
- `GET /api/attendance/correction-requests` - Get pending corrections

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/roles` - Get all roles
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

### Profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile

### Leave Management
- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/requests` - Get all leave requests (Manager)
- `POST /api/leave/approve-deny` - Approve/deny leave (Manager)

### Locations (Admin only)
- `GET /api/locations` - Get authorized locations
- `POST /api/locations` - Add authorized location
- `DELETE /api/locations/:index` - Remove authorized location

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utility functions
```

## Docker

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api
```

## Database Schema

Required tables:
- `users` - User accounts
- `roles` - User roles
- `attendance` - Clock in/out records
- `leave_requests` - Leave requests
- `attendance_correction_requests` - Correction requests
- `audit_log` - Action audit trail

## Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: 100 requests per 15 minutes
- **bcrypt**: Password hashing
- **JWT**: Stateless authentication
- **CORS**: Configurable origins

## License

MIT
