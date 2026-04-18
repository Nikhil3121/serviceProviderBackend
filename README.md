# ⚡ Service Provider Backend

A **production-ready**, **scalable**, and **secure** REST API backend built with Node.js, Express, and MongoDB Atlas. Designed to handle **2,000–3,000 users/day** with enterprise-grade security, caching, queuing, and monitoring.

---

## 🏗️ Architecture Overview

```
service-provider-backend/
├── src/
│   ├── config/          # DB, Redis, Cloudinary, Swagger configuration
│   ├── controllers/     # Route handlers (thin — delegate to services)
│   ├── middlewares/     # Auth, CAPTCHA, rate limiting, upload, validation
│   ├── models/          # Mongoose schemas (User, OTP, Contact, Project)
│   ├── routes/          # Express routers (versioned under /api/v1)
│   ├── services/        # Business logic (email, OTP, token, captcha)
│   ├── jobs/            # BullMQ queue workers (email, SMS)
│   ├── templates/       # HTML email templates
│   ├── utils/           # ApiError, ApiResponse, helpers, logger
│   ├── validators/      # Joi schemas for all input validation
│   ├── app.js           # Express app setup (middleware stack)
│   └── server.js        # HTTP server + graceful shutdown
├── docker/              # Nginx config, Mongo init script
├── logs/                # Auto-generated log files (Winston)
├── .github/workflows/   # GitHub Actions CI/CD pipeline
├── Dockerfile           # Multi-stage production Docker image
├── docker-compose.yml   # Full stack local/production setup
├── postman_collection.json
└── .env.example
```

---

## ✅ Feature Checklist

| Feature                         | Status |
|---------------------------------|--------|
| JWT Auth (Access + Refresh)     | ✅ |
| Role-based Access (admin/user)  | ✅ |
| Bcrypt Password Hashing         | ✅ |
| Refresh Token Rotation          | ✅ |
| Account Lock (brute force)      | ✅ |
| Email Verification              | ✅ |
| Phone OTP Verification          | ✅ |
| OTP Rate Limiting               | ✅ |
| Forgot/Reset Password           | ✅ |
| Google reCAPTCHA (v2/v3)        | ✅ |
| HTML Email Templates            | ✅ |
| Twilio SMS OTP                  | ✅ |
| Fast2SMS OTP (India)            | ✅ |
| Contact Form + Admin Notify     | ✅ |
| Project CRUD (admin)            | ✅ |
| Image Upload (Cloudinary)       | ✅ |
| Soft Delete (users/projects)    | ✅ |
| Helmet.js Security Headers      | ✅ |
| CORS Configuration              | ✅ |
| NoSQL Injection Protection      | ✅ |
| XSS Protection                  | ✅ |
| HTTP Parameter Pollution Guard  | ✅ |
| Redis Caching                   | ✅ |
| BullMQ Email/SMS Queue          | ✅ |
| Winston Logging (file rotation) | ✅ |
| Pagination (all list endpoints) | ✅ |
| Full-text Search (projects)     | ✅ |
| DB Indexes (optimized)          | ✅ |
| Swagger / OpenAPI Docs          | ✅ |
| Postman Collection              | ✅ |
| Docker + Docker Compose         | ✅ |
| Nginx Reverse Proxy Config      | ✅ |
| GitHub Actions CI/CD            | ✅ |
| Graceful Shutdown               | ✅ |
| Admin Dashboard Stats           | ✅ |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.x
- MongoDB Atlas account (or local MongoDB)
- Redis (optional — app degrades gracefully without it)
- SMTP credentials (Gmail App Password recommended)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/service-provider-backend.git
cd service-provider-backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your actual credentials
nano .env
```

**Minimum required variables to get started:**
```env
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<64+ char random string>
JWT_REFRESH_SECRET=<64+ char random string>
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
ADMIN_EMAIL=admin@yourdomain.com
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Run in Development

```bash
npm run dev
# Server starts at http://localhost:5000
# Swagger docs at http://localhost:5000/api/docs
```

### 4. Run in Production

```bash
NODE_ENV=production npm start
```

---

## 🐳 Docker Setup

### Development (with local MongoDB + Redis)

```bash
# Copy and configure environment
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

### Production (with Nginx)

```bash
# Add SSL certs to docker/ssl/ as fullchain.pem + privkey.pem
# Update nginx.conf with your domain name

docker-compose --profile production up -d
```

---

## 📡 API Reference

**Base URL:** `http://localhost:5000/api/v1`  
**Swagger UI:** `http://localhost:5000/api/docs`

### Response Format

All responses follow this consistent structure:

```json
// Success
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}

// Paginated list
{
  "success": true,
  "message": "Data fetched",
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" }
  ]
}
```

### Authentication

Include the access token in all protected requests:
```
Authorization: Bearer <accessToken>
```

### Endpoints Summary

#### 🔐 Auth — `/api/v1/auth`
| Method | Path                   | Auth | Description                      |
|--------|------------------------|------|----------------------------------|
| POST   | /signup                | ❌   | Register new user                |
| POST   | /login                 | ❌   | Login, returns token pair        |
| GET    | /verify-email          | ❌   | Verify email via token link      |
| POST   | /verify-otp            | ❌   | Verify phone OTP                 |
| POST   | /resend-otp            | ❌   | Resend phone OTP                 |
| POST   | /forgot-password       | ❌   | Send password reset email        |
| POST   | /reset-password        | ❌   | Reset password with token        |
| POST   | /resend-verification   | ❌   | Resend verification email        |
| POST   | /refresh               | ❌   | Rotate refresh token             |
| GET    | /me                    | ✅   | Get current user profile         |
| POST   | /change-password       | ✅   | Change password                  |
| POST   | /logout                | ✅   | Logout current session           |
| POST   | /logout-all            | ✅   | Logout all devices               |

#### 👤 User — `/api/v1/users/me`
| Method | Path     | Auth | Description              |
|--------|----------|------|--------------------------|
| GET    | /        | ✅   | Get profile              |
| PATCH  | /        | ✅   | Update profile (name)    |
| POST   | /avatar  | ✅   | Upload avatar image      |
| DELETE | /avatar  | ✅   | Remove avatar            |
| DELETE | /        | ✅   | Deactivate account       |

#### 📦 Projects — `/api/v1/projects`
| Method | Path                     | Auth  | Role  | Description         |
|--------|--------------------------|-------|-------|---------------------|
| GET    | /                        | ❌    | any   | List projects (paginated, filterable) |
| GET    | /categories              | ❌    | any   | List categories with counts |
| GET    | /:slugOrId               | ❌    | any   | Get single project  |
| POST   | /                        | ✅    | admin | Create project      |
| PUT    | /:id                     | ✅    | admin | Update project      |
| DELETE | /:id                     | ✅    | admin | Soft delete project |
| DELETE | /:id/images/:publicId    | ✅    | admin | Delete project image |

#### 📬 Contact — `/api/v1/contact`
| Method | Path | Auth | Description              |
|--------|------|------|--------------------------|
| POST   | /    | ❌   | Submit contact form      |

#### 🛡️ Admin — `/api/v1/admin` (admin role required)
| Method | Path              | Description                       |
|--------|-------------------|-----------------------------------|
| GET    | /dashboard        | Stats, growth charts, recent users |
| GET    | /users            | List all users (search, filter, paginate) |
| GET    | /users/:id        | Get single user                   |
| PATCH  | /users/:id        | Update user role/status           |
| DELETE | /users/:id        | Soft delete user                  |
| GET    | /contacts         | List all contacts (filter by status) |
| GET    | /contacts/:id     | Get contact (marks as read)       |
| PATCH  | /contacts/:id     | Update status/notes               |
| DELETE | /contacts/:id     | Hard delete contact               |

### Query Parameters (List Endpoints)

| Param    | Example           | Description                    |
|----------|-------------------|--------------------------------|
| page     | ?page=2           | Page number (default: 1)       |
| limit    | ?limit=20         | Items per page (max: 100)      |
| sort     | ?sort=-createdAt  | Field to sort (- = descending) |
| search   | ?search=john      | Full text / regex search       |
| category | ?category=web     | Filter by category             |
| status   | ?status=new       | Filter contacts by status      |
| role     | ?role=admin       | Filter users by role           |
| featured | ?featured=true    | Filter featured projects       |

---

## 🔒 Security Architecture

### Authentication Flow
```
Client → POST /auth/login → validates credentials
       ← { accessToken (15m), refreshToken (7d) }

Client → GET /auth/me (Authorization: Bearer <accessToken>)
       ← { user data }

# When accessToken expires:
Client → POST /auth/refresh { refreshToken }
       ← { new accessToken, new refreshToken }  ← Rotation!
```

### Account Lock Policy
- After **5** failed login attempts → account locked for **2 hours**
- All lock state stored in MongoDB (survives server restarts)
- Successful login resets the counter

### OTP Security
- OTPs are **bcrypt-hashed** before storing (not plaintext)
- Maximum **5 wrong attempts** per OTP → auto-invalidated
- TTL index ensures expired OTPs are auto-deleted by MongoDB
- Previous OTPs invalidated when a new one is requested

### Token Reuse Detection
- If a refresh token is reused after rotation → **all sessions terminated**
- Maximum **5 concurrent sessions** per user

---

## 📊 Performance

### Caching Strategy (Redis)
| Data                    | Cache TTL |
|-------------------------|-----------|
| Project list            | 5 minutes |
| Single project          | 5 minutes |
| Categories list         | 10 minutes |
| Admin dashboard stats   | 1 minute  |

Cache is invalidated automatically on create/update/delete operations.

### Database Indexes
Every commonly queried field is indexed. Key compound indexes:
- `{ email: 1 }` unique
- `{ phone: 1 }` unique  
- `{ isDeleted: 1, isActive: 1 }` — soft delete filter
- `{ category: 1, isActive: 1 }` — project filtering
- `{ title: text, description: text, tags: text }` — full-text search
- `{ expiresAt: 1 }` TTL on OTPs — auto cleanup

---

## 📧 Email Configuration

### Gmail Setup
1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate a password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

### Custom SMTP (Recommended for production)
Use services like **Mailgun**, **SendGrid**, **AWS SES**, or **Postmark** for better deliverability.

---

## 📱 SMS / OTP Configuration

### Twilio
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Fast2SMS (India — cheaper alternative)
```env
SMS_PROVIDER=fast2sms
FAST2SMS_API_KEY=your_api_key
```

> In **development mode**, OTPs are logged to the console if SMS sending fails.

---

## 📋 Logging

Logs are stored in the `logs/` directory with daily rotation:
- `combined-YYYY-MM-DD.log` — all logs
- `error-YYYY-MM-DD.log` — errors only
- `exceptions-YYYY-MM-DD.log` — uncaught exceptions

Logs auto-expire after **14 days** and are gzip-compressed.

In production (JSON format for log aggregators like Datadog/CloudWatch):
```json
{"level":"info","message":"User logged in: john@example.com","timestamp":"2024-01-15 10:30:45","service":"service-provider-api"}
```

---

## 🚀 Deployment Guide

### Option 1: Render / Railway (Easiest)
1. Push code to GitHub
2. Connect repo in Render/Railway dashboard
3. Set environment variables in the platform dashboard
4. Deploy — they handle everything else

### Option 2: AWS EC2 / DigitalOcean Droplet (Docker)
```bash
# On your server:
git clone <repo>
cd service-provider-backend
cp .env.example .env
# Configure .env
docker-compose up -d
```

### Option 3: Manual VPS
```bash
# Install Node.js 20, PM2, MongoDB, Redis
npm install -g pm2
npm install --production
pm2 start src/server.js --name "sp-api" -i max
pm2 save
pm2 startup
```

### Environment Variables for Production
```env
NODE_ENV=production
COOKIE_SECURE=true
RECAPTCHA_VERSION=v3
LOG_LEVEL=warn
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 🔧 Scripts

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start with nodemon (hot reload) |
| `npm start`       | Production start               |
| `npm test`        | Run Jest tests                 |
| `npm run lint`    | ESLint check                   |
| `npm run lint:fix`| ESLint auto-fix                |
| `npm run docker:build` | Build Docker image        |
| `npm run docker:run`   | Start with docker-compose |
| `npm run docker:stop`  | Stop docker-compose       |

---

## 🆘 Troubleshooting

**MongoDB connection fails:**
- Check your `MONGODB_URI` includes correct username/password
- Whitelist your IP in MongoDB Atlas Network Access

**Emails not sending:**
- Verify SMTP credentials. For Gmail, use App Password (not account password)
- Check `logs/error-*.log` for SMTP errors

**Redis connection refused:**
- App works without Redis (cache disabled, queues use direct send)
- Start Redis: `redis-server` or use Docker

**OTP not received:**
- Check `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- In development, OTP is logged to console as fallback

**CAPTCHA always failing:**
- In development, set `RECAPTCHA_SECRET_KEY=` empty to skip verification
- Ensure frontend sends token as `captchaToken` in request body

---

## 📄 License

MIT — free to use for personal and commercial projects.

---

*Built with ❤️ for production. Secure by default, scalable by design.*
