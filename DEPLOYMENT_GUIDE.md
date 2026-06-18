# Deployment & Mode Switching Guide

## Current Status: TEST MODE ✅

Everything is **FREE** right now while you test. All courses are unlocked and accessible without payment.

---

## How Test Mode Works

### Current Settings:
- **Backend** (`.env`): `TEST_MODE=true`
- **Frontend** (`.env.local`): `REACT_APP_TEST_MODE=true`
- **Result**: All courses free, full access to all modules

### What's Disabled in Test Mode:
- ❌ Payment processing (Stripe checkout disabled)
- ❌ Course access restrictions (all courses visible)
- ❌ Pricing checks

### What's Still Working:
- ✅ User authentication (signup/login)
- ✅ Module viewing and progress tracking
- ✅ Course completion marking
- ✅ Feedback submission
- ✅ All learning features

---

## Switching to Production (When Ready)

When you're ready to start charging:

### Step 1: Update Backend `.env`
```bash
# Change this line in .env:
TEST_MODE=false
```

### Step 2: Update Frontend `.env.local`
```bash
# Change this line in .env.local:
REACT_APP_TEST_MODE=false
```

### Step 3: Set Real Stripe Keys
```bash
# In .env, replace these with your LIVE Stripe keys:
STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxxx
```

### Step 4: Restart Both Servers
```bash
# Terminal 1 (Backend):
Ctrl + C
node server.js

# Terminal 2 (Frontend):
Ctrl + C
npm start
```

### Step 5: Test Purchase Flow
1. Log in
2. Click "Purchase Course Access"
3. You should be redirected to Stripe checkout
4. Complete test payment
5. Verify access is granted

---

## Pricing Configuration

### Current Setup (Hardcoded in Backend):

**In `/routes/payment.js`:**
```javascript
const COURSE_PRICE_CENTS = 4999; // $49.99
```

### To Change Pricing:

**Option A: Update Hardcoded Price**
```javascript
const COURSE_PRICE_CENTS = 2200; // £22.00 ($22)
```

**Option B: Create a Pricing Database Table** (Recommended for scalability)
```sql
CREATE TABLE pricing (
  course_id INTEGER PRIMARY KEY,
  price_cents INTEGER,
  currency VARCHAR(3),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Then fetch pricing dynamically:
```javascript
const pricingResult = await pool.query(
  'SELECT price_cents FROM pricing WHERE course_id = $1',
  [courseId]
);
```

---

## Environment Variables Reference

### Backend (`.env`)
```
TEST_MODE=true                           # Set to 'false' for production
NODE_ENV=development                     # Change to 'production' for deployment
STRIPE_SECRET_KEY=sk_test_xxxxx         # Update with live key for production
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx  # Update with live secret
```

### Frontend (`.env.local`)
```
REACT_APP_TEST_MODE=true                # Set to 'false' for production
REACT_APP_API_URL=http://localhost:5000/api  # Change for hosted backend
```

---

## What Each Course Currently Costs (When Production)

- **Single Course**: £22.00
- **All 7 Course Bundle**: £99.00

---

## Troubleshooting

### "TEST MODE" Message Still Showing
- Hard refresh browser: Ctrl + Shift + R (or Cmd + Shift + R on Mac)
- Clear browser cache
- Check that `REACT_APP_TEST_MODE=false` in `.env.local`

### Stripe Checkout Not Working
1. Verify `STRIPE_SECRET_KEY` and `STRIPE_PUBLIC_KEY` are valid live keys
2. Check that `TEST_MODE=false` in both files
3. Ensure `NODE_ENV=production` (optional but recommended)
4. Check browser console for error messages

### Users Still Getting Free Access in Production
1. Confirm `.env` has `TEST_MODE=false`
2. Restart backend server
3. Verify that `process.env.TEST_MODE` is reading the variable correctly
4. Check logs: `console.log('TEST MODE:', process.env.TEST_MODE);`

---

## Testing Stripe (While in Test Mode)

Even though courses are free, you can test Stripe integration:

1. Set `TEST_MODE=false` temporarily
2. Click "Purchase Course Access"
3. Use Stripe test card: **4242 4242 4242 4242**
4. Any future expiry date
5. Any 3-digit CVC
6. Process payment
7. Set `TEST_MODE=true` again when done

---

## Backup Important Files Before Production

- ✅ `.env` (environment variables)
- ✅ Database backups (regular schedule)
- ✅ Stripe API keys (store securely)
- ✅ JWT secret (keep private!)

---

## Questions?

Refer to the comments in:
- `/routes/payment.js` - Payment logic
- `/frontend/src/pages/CourseView.js` - Frontend access control

Happy testing! 🚀
