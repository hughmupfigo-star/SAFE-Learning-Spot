# Data Privacy Implementation Guide

## How to Ensure Your Privacy Promise Is Real

### 1. Database Security Checklist

#### Password Storage ✓
```javascript
// In routes/auth.js - verify this is being used:
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);
```
- Passwords are HASHED, never stored plain text
- Bcrypt with 10 salt rounds (industry standard)
- Even admins cannot see user passwords

#### Data Isolation ✓
Each table has `user_id` to ensure:
- Users can only see their own data
- No cross-user data leaks
- Row-level security enforced

```sql
-- Example: Only user can see their own progress
SELECT * FROM course_progress 
WHERE user_id = $1;  -- Always filter by current user
```

#### Field Encryption
For extra sensitive data, encrypt before storing:
```javascript
const crypto = require('crypto');
const encrypted = crypto.createCipher('aes-256-cbc', KEY).update(data);
```

---

### 2. API Security - NO Data Leaks

#### Rule: Every API endpoint must authenticate & authorize

✓ CORRECT - User can only access their own data:
```javascript
router.get('/progress/:courseId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;  // From auth token
  
  // Only fetch THIS user's progress
  const result = await pool.query(
    'SELECT * FROM course_progress WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
});
```

✗ WRONG - Would leak all users' data:
```javascript
// DON'T DO THIS:
router.get('/progress/:courseId', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM course_progress WHERE course_id = $1'
  );  // No user_id filter!
});
```

---

### 3. What NOT to Add (Privacy Red Flags)

#### ❌ Never Add These:
```javascript
// NO Google Analytics
<script async src="https://www.googletagmanager.com/..."></script>

// NO Facebook Pixel
<img src="https://facebook.com/tr?id=..."/>

// NO Mixpanel or Segment
analytics.track('user_action', {...});

// NO localStorage of user behavior
localStorage.setItem('user_behavior', tracking_data);

// NO third-party cookies
document.cookie = "tracking_id=...";

// NO email to marketing services
await sendToMailchimp(user.email);
```

#### ✓ What's OK:
```javascript
// Essential error logging (NO user data)
console.error('Course load failed', { timestamp, error_type });

// Your own server logs (encrypted)
db.logs.insert({ action: 'login', timestamp });

// Stripe integration (payments only)
const session = await stripe.checkout.sessions.create({...});
```

---

### 4. Data Deletion - Delete Everything

When user deletes account, remove ALL traces:

```javascript
async function deleteUserAccount(userId) {
  // Delete in correct order (respecting foreign keys)
  await db.query('DELETE FROM course_feedback WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM course_progress WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM course_access WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM pending_payments WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  
  // Verify deletion
  const result = await db.query('SELECT COUNT(*) FROM users WHERE id = $1', [userId]);
  if (result.rows[0].count === 0) {
    console.log('User completely deleted');
  }
}
```

---

### 5. Environment Variables - Keep Secrets Safe

#### .env (Backend) - NEVER commit this:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
STRIPE_SECRET_KEY=sk_test_...
```

#### .gitignore - Block accidental commits:
```
.env
.env.local
*.log
node_modules/
```

Never upload .env to GitHub!

---

### 6. HTTPS Only - Encryption in Transit

#### Your backend (server.js):
```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### Frontend API calls - always HTTPS:
```javascript
// ✓ CORRECT
const API_URL = 'https://api.safelearningspot.com/api';

// ✗ WRONG
const API_URL = 'http://api.safelearningspot.com/api';  // Not encrypted!
```

---

### 7. Audit Trail - Track Access

Log who accesses what (for your own audit):

```javascript
async function logUserAction(userId, action, details) {
  await db.query(
    'INSERT INTO audit_log (user_id, action, details, timestamp) VALUES ($1, $2, $3, NOW())',
    [userId, action, JSON.stringify(details)]
  );
}

// Usage:
await logUserAction(userId, 'course_completed', { courseId: 1 });
await logUserAction(userId, 'feedback_submitted', { courseId: 2 });
```

Never expose this log to users or third parties.

---

### 8. Deployment Checklist

Before going live, verify:

- [ ] HTTPS enabled (SSL certificate)
- [ ] Database backups encrypted
- [ ] No hardcoded secrets in code
- [ ] .env file NOT in git
- [ ] All API endpoints require authentication
- [ ] User can only access own data
- [ ] Payment data handled by Stripe only
- [ ] No third-party analytics/tracking
- [ ] Delete account function tested
- [ ] Privacy policy visible on site

---

### 9. Regular Security Checks

#### Monthly:
- Review access logs
- Check for unusual database queries
- Verify no new third-party integrations

#### Quarterly:
- Audit user permissions
- Test data deletion
- Review API endpoints for leaks

#### Annually:
- Security assessment
- Update privacy policy if needed
- Penetration testing (optional)

---

### 10. Tell Users How to Delete

Add to your site/app:

```
Account Settings > Delete Account

⚠️ This cannot be undone.
All your data will be permanently deleted:
- Course progress
- Feedback
- Account information
- Everything

[Confirm Delete]
```

Then actually execute the delete function above.

---

## The Bottom Line

**Your privacy promise is kept by:**
1. ✓ Encrypting passwords (bcrypt)
2. ✓ Encrypting data in transit (HTTPS)
3. ✓ Restricting access (authentication + authorization)
4. ✓ NOT using third-party trackers
5. ✓ Allowing users to delete everything
6. ✓ Never selling or sharing data
7. ✓ Being transparent about what you collect

**Not by:**
- ✗ Just writing a policy
- ✗ Hoping nobody hacks you
- ✗ "Anonymizing" data (often can be re-identified)
- ✗ Burying opt-outs
- ✗ Changing terms later

This is actual privacy. Not marketing privacy.
