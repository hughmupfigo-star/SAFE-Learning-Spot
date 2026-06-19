# Quick Start Guide

Get Safe Learning Spot Centre running locally in 10 minutes.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL installed locally
- A text editor (VS Code recommended)

## 1. Set Up Backend

```bash
# Navigate to root directory
cd safelearningspotcentre

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your local database
# DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/safelearningspot
```

## 2. Set Up Database

```bash
# Create PostgreSQL database (if not exists)
createdb safelearningspot

# Import schema
psql safelearningspot < database/schema.sql
```

## 3. Get Stripe Keys (Optional - for testing)

1. Go to https://dashboard.stripe.com
2. Get your test keys
3. Add them to `.env`:
   ```
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   ```

## 4. Start Backend

```bash
npm run dev
```

Backend runs at `http://localhost:5000`

## 5. Set Up Frontend

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Note: .env.local should point to your backend
# REACT_APP_API_URL=http://localhost:5000/api
# REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
```

## 6. Start Frontend

```bash
npm start
```

Frontend runs at `http://localhost:3000`

## Testing the Platform

1. **Sign Up**
   - Go to http://localhost:3000
   - Create a new account

2. **View Courses**
   - You'll see all 7 courses on the dashboard
   - Courses start locked (need payment)

3. **Test Without Payment**
   - Edit `backend/routes/payment.js`
   - Temporarily comment out access check to test course viewing
   - Or use Stripe test card: `4242 4242 4242 4242`

4. **Try a Course**
   - Select a course
   - View modules and reflection questions
   - Mark as complete

## Project Structure

```
safelearningspotcentre/
├── server.js              # Express server
├── package.json           # Backend dependencies
├── routes/               # API endpoints
├── middleware/           # Auth middleware
├── database/schema.sql   # Database schema
├── Dockerfile            # Docker config
└── frontend/             # React app
    ├── public/
    ├── src/
    │   ├── pages/        # Login, Dashboard, CourseView
    │   ├── components/   # Reusable UI
    │   ├── services/     # API & Stripe
    │   └── App.js        # Main app
    └── package.json
```

## Common Issues

**Port 5000 already in use:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**PostgreSQL connection failed:**
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify user has permission to create database

**Frontend can't reach backend:**
- Ensure backend is running on 5000
- Check REACT_APP_API_URL in .env.local
- Clear browser cache and restart frontend

## Next Steps

- Customize course content
- Set up Stripe for real payments
- Deploy to Railway (see DEPLOYMENT.md)
- Add custom domain
- Set up email notifications
