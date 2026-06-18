# Deployment to Railway

This guide walks you through deploying Safe Learning Spot Centre to Railway.

## Prerequisites

- GitHub account (to push your code)
- Railway account (free tier available at railway.app)
- Stripe account (for payments)

## Step 1: Prepare Your Code

1. Create a GitHub repository for this project
2. Push all files to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/safelearningspotcentre.git
   git push -u origin main
   ```

## Step 2: Set Up Railway

1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "Create a new project" → "Deploy from GitHub repo"
4. Select your `safelearningspotcentre` repository
5. Railway will automatically detect the Node.js backend

## Step 3: Configure Environment Variables

In your Railway project:

1. Click "Variables" for the Node.js service
2. Add these variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=<generate a random string>
   STRIPE_PUBLIC_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NODE_ENV=production
   FRONTEND_URL=<your-frontend-url>
   ```

## Step 4: Add PostgreSQL Database

1. In Railway dashboard, click "New Service"
2. Select "PostgreSQL"
3. Wait for it to initialize
4. Railway will automatically add the `DATABASE_URL` to your environment

5. Run the database schema:
   - Connect to your PostgreSQL database
   - Copy the contents of `database/schema.sql`
   - Execute the SQL in your database client

Or use Railway's database console:
1. Click your PostgreSQL service
2. Go to "Data" tab
3. Run the schema SQL there

## Step 5: Deploy Frontend

1. Build your React app:
   ```bash
   cd frontend
   npm run build
   ```

2. Option A: Deploy to Vercel (Recommended for React)
   - Push `frontend` folder to GitHub
   - Connect to Vercel at vercel.com
   - Set `REACT_APP_API_URL` environment variable to your Railway backend URL

3. Option B: Host on Railway with Node.js static server
   - Add a simple Express server in `frontend` folder to serve static build

## Step 6: Connect Services

1. In Railway, link the frontend to backend:
   - Frontend environment variable: `REACT_APP_API_URL=https://your-railway-backend-url/api`

2. Get your Railway backend URL:
   - Click the Node.js service
   - Click "Generate Domain"
   - Copy the domain (e.g., `https://safelearningspot-production.up.railway.app`)

## Step 7: Configure Stripe Webhooks

1. Go to your Stripe Dashboard
2. Add a webhook endpoint:
   - URL: `https://your-railway-backend-url/api/payment/webhook`
   - Events: `checkout.session.completed`
3. Copy the webhook secret to Railway's `STRIPE_WEBHOOK_SECRET`

## Step 8: Test Your Deployment

1. Visit your frontend URL
2. Create an account
3. Test course access with Stripe test keys (see your Stripe Dashboard for test cards)
4. Verify everything works end-to-end

## Scaling Notes

As you grow:
- Railway scales automatically
- Monitor usage on the Railway dashboard
- Consider upgrading to paid plan for production reliability
- Set up alerts for database storage

## Troubleshooting

**Database connection fails:**
- Verify DATABASE_URL is correct
- Ensure schema.sql was executed
- Check PostgreSQL service is running

**Frontend can't reach backend:**
- Verify FRONTEND_URL matches your frontend domain
- Check CORS settings in `server.js`
- Ensure API URL in frontend matches backend domain

**Stripe payments not working:**
- Verify webhook is receiving events in Stripe Dashboard
- Check that webhook secret is correct
- Look at Railway logs for errors

## Updating Your Application

1. Make changes locally
2. Push to GitHub
3. Railway automatically deploys on push to main branch
4. Monitor deployment logs in Railway dashboard

## Backup & Security

- Railway automatically backs up PostgreSQL
- Set up regular backups in Railway dashboard
- Keep your JWT_SECRET and Stripe keys secure
- Never commit `.env` files to Git
- Use Railway's secrets management for sensitive values
