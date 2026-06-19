# Architecture Overview

## System Design

Safe Learning Spot Centre is a full-stack web application with the following architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│ - Dashboard: Browse courses                                │
│ - CourseView: Learn modules, track progress                │
│ - Auth: Login/Signup                                       │
│ - Payment: Stripe checkout                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS/REST API
┌─────────────────┴───────────────────────────────────────────┐
│                Backend (Node.js/Express)                    │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Routes                                               │   │
│ │ - /api/auth/*      (Login, Signup, Token Verify)    │   │
│ │ - /api/courses/*   (Get all, Get by ID)             │   │
│ │ - /api/progress/*  (Save, Get progress)             │   │
│ │ - /api/feedback/*  (Submit, Get feedback)           │   │
│ │ - /api/payment/*   (Checkout, Webhook, Access)      │   │
│ └──────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Services                                             │   │
│ │ - JWT Authentication                                │   │
│ │ - Stripe Payment Processing                         │   │
│ │ - Email (optional)                                  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ SQL
┌─────────────────┴───────────────────────────────────────────┐
│              Database (PostgreSQL)                          │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ - users                                              │   │
│ │ - course_access (who paid for what)                 │   │
│ │ - course_progress (who completed what)              │   │
│ │ - course_feedback (improvement suggestions)         │   │
│ │ - pending_payments (payment tracking)               │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Authentication
```
User → [Signup/Login] → API validates → JWT token issued
                                    ↓
                        Token stored in localStorage
                                    ↓
                        Sent with every API request
```

### Course Access
```
User → [Browse Courses] → API returns all 7 courses
                                    ↓
                        Check access via /api/payment/access/:id
                                    ↓
          ┌─────────────────────────┴──────────────────────┐
          │                                                  │
      Has Access                                      No Access
          │                                                  │
    Show Content                                  Show Paywall
          │                                                  │
      Locked until paid                    → [Stripe Checkout]
                                                    ↓
                                    Webhook confirms payment
                                                    ↓
                                        Grant course access
```

### Progress Tracking
```
User → [Opens Module] → Auto-loads progress
                            ↓
      User completes module & clicks "Mark Complete"
                            ↓
         Progress saved to database with timestamp
                            ↓
         Progress persists across sessions
```

## Security

### Authentication
- JWT tokens with 30-day expiration
- Passwords hashed with bcryptjs (10 rounds)
- Token verification on protected routes
- Tokens stored in localStorage (no cookies to avoid CSRF)

### Payment Security
- Stripe handles all card processing (PCI compliance)
- Webhook signature verification
- Server-side payment confirmation before granting access
- No card data stored locally

### Data Protection
- HTTPS enforced in production
- CORS configured to allow only frontend origin
- SQL injection prevention via parameterized queries
- Input validation on all endpoints

## Database Schema

### users
```sql
id (PK) | email | password_hash | first_name | last_name | created_at
```

### course_access
```sql
id (PK) | user_id (FK) | course_id | granted_at
UNIQUE(user_id, course_id) -- prevents duplicate purchases
```

### course_progress
```sql
id (PK) | user_id (FK) | course_id | completed | created_at | updated_at
UNIQUE(user_id, course_id) -- one progress record per user per course
```

### course_feedback
```sql
id (PK) | user_id (FK) | course_id | feedback | created_at
```

### pending_payments
```sql
id (PK) | user_id (FK) | course_id | stripe_session_id | created_at
```

## API Design

### Request/Response Format
```json
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "secure123",
  "firstName": "Jane",
  "lastName": "Doe"
}

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe"
  },
  "token": "eyJhbGc..."
}
```

### Error Handling
```json
{
  "error": "User already exists with this email"
}
```

All errors return appropriate HTTP status codes:
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

## Deployment Architecture

### On Railway
```
┌──────────────────────────────────────────┐
│         Railway Project                   │
│ ┌──────────────┐    ┌──────────────┐    │
│ │  Node.js     │    │  PostgreSQL  │    │
│ │  API Server  │←→  │  Database    │    │
│ │              │    │              │    │
│ │ Domain:      │    │ Managed by   │    │
│ │ *.railway.app│   │ Railway      │    │
│ └──────────────┘    └──────────────┘    │
└──────────────────────────────────────────┘
         ↑
         │
         │ HTTPS
         │
    ┌────┴──────────┐
    │  Frontend     │
    │  (Vercel or   │
    │   elsewhere)  │
    └───────────────┘
```

## Scaling Considerations

### Current Capacity (Free Tier)
- ~100 concurrent users
- Limited to free PostgreSQL storage
- Suitable for pilot launch

### Growth Path
1. Monitor usage via Railway dashboard
2. When hitting limits, upgrade Railway plan
3. Add caching (Redis) for course content
4. Implement API rate limiting
5. Set up CDN for frontend (Vercel handles this)
6. Add logging/monitoring (Sentry, DataDog)

## Performance Optimizations

### Frontend
- Code splitting with React Router
- Lazy loading of course modules
- LocalStorage for auth token (no extra API calls)
- CSS optimized for minimal transfers

### Backend
- Database indexes on frequently queried fields
- JWT caching to reduce token verification overhead
- Connection pooling with PostgreSQL
- Gzip compression for responses

### Database
- Indexes on user_id, course_id foreign keys
- Unique constraints to prevent duplicates
- Timestamps for audit trails

## Future Enhancements

1. **Email Notifications**
   - Course access confirmation
   - Milestone reminders
   - Weekly digest of feedback

2. **Analytics**
   - Course completion rates
   - Time spent per module
   - Feedback trends

3. **Community Features**
   - Discussion forums (private)
   - Group cohorts
   - Facilitated group sessions

4. **Admin Dashboard**
   - Manage users
   - View feedback
   - Course analytics
   - Payment reports

5. **Mobile App**
   - React Native for iOS/Android
   - Offline mode for modules
   - Push notifications
