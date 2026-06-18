# Safe Learning Spot Centre

A healing and self-discovery platform with 7 transformative courses designed to help people reclaim their sovereignty and break limiting patterns.

## Getting Started

### Backend Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY`: From your Stripe dashboard
   - `FRONTEND_URL`: Your frontend URL (localhost:3000 for development)

4. Create the database and run migrations:
   ```bash
   psql -U postgres -d safelearningspot -f database/schema.sql
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local`:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
safelearningspotcentre/
├── server.js                 # Express server
├── routes/                   # API routes
│   ├── auth.js              # Authentication endpoints
│   ├── courses.js           # Course content endpoints
│   ├── progress.js          # Progress tracking
│   ├── feedback.js          # User feedback
│   └── payment.js           # Stripe payment handling
├── middleware/              # Auth middleware
├── database/                # SQL schemas
├── Dockerfile               # Docker configuration
├── frontend/                # React application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API services
│   │   └── App.js          # Main app component
│   └── package.json
└── README.md
```

## Courses

1. **Friendship as Weaponry** - Boundaries & Energy Protection
2. **Relationships: 2-Step Verification** - Identifying Red Flags
3. **Energy Harvesting & Sacred Sexuality** - Energy Sovereignty
4. **Financial Truth & Reversal** - Understanding Money
5. **Family Patterns & Scapegoating** - Breaking Generational Cycles
6. **Institutional Brainwashing** - Understanding Societal Conditioning
7. **Media & Narrative Control** - Immunity to Propaganda

## Features

- **User Authentication**: Secure signup/login with JWT
- **Progress Tracking**: Auto-saves progress, allows resuming
- **Self-Paced Learning**: No time limits, no formal scoring
- **Private Reflection**: Questions and answers are user's to keep
- **Feedback System**: Optional feedback to help us improve
- **Payment Integration**: Stripe for one-time course access
- **Responsive Design**: Mobile-friendly interface

## Deployment to Railway

1. Push your code to GitHub
2. Connect your GitHub repository to Railway
3. Set up environment variables in Railway dashboard
4. Create PostgreSQL database add-on in Railway
5. Deploy

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verify token

### Courses
- `GET /api/courses` - Get all courses with user progress
- `GET /api/courses/:courseId` - Get specific course

### Progress
- `POST /api/progress/:courseId` - Save course progress
- `GET /api/progress/:courseId` - Get course progress
- `GET /api/progress` - Get all user progress

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/:courseId` - Get course feedback

### Payment
- `POST /api/payment/checkout` - Create Stripe checkout session
- `POST /api/payment/webhook` - Handle Stripe webhooks
- `GET /api/payment/access/:courseId` - Check course access

## Technology Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Axios, Stripe.js
- **Authentication**: JWT
- **Payment**: Stripe
- **Hosting**: Railway

## License

ISC
