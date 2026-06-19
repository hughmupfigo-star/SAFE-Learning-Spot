# Complete Module Access & Display Debugging Guide

## Current Status
All course modules should be free and accessible in test mode. Each course has 6-7 detailed modules with UK English content.

---

## STEP 1: Restart Both Servers (Critical)

### Backend Server
```bash
# In your backend directory
# Stop any running process (Ctrl+C)
# Then restart:
node server.js
```

**Expected output:**
```
DATABASE_URL: postgresql://postgres:***@localhost:5432/safelearningspot
NODE_ENV: development
Safe Learning Spot Centre API running on port 5000
```

### Frontend Server
```bash
# In your frontend directory
# Stop any running process (Ctrl+C)
# Then restart:
npm start
```

**Expected output:**
```
Compiled successfully!
You can now view safe-learning-spot-centre in the browser.
Local: http://localhost:3000
```

---

## STEP 2: Hard Refresh Browser (Critical)

1. **Windows/Linux:** `Ctrl+Shift+R` (or `Ctrl+F5`)
2. **Mac:** `Cmd+Shift+R`
3. Wait 3-5 seconds for the page to fully load

---

## STEP 3: Open Developer Console & Check for Errors

1. Press `F12` to open Developer Tools
2. Click the **Console** tab
3. Look for messages like:
   - `TEST_MODE env var: true` ✓ Good
   - `testMode boolean: true` ✓ Good
   - `Test mode active - granting free access` ✓ Good
   - Any red error messages? ✗ Bad

### If you see errors in red:
Screenshot them and note the exact error message.

---

## STEP 4: Verify Environment Variables Are Loaded

### Check Backend (.env file)
File: `C:\Users\rosek\Downloads\safelearningspotcentre\.env`

Should contain:
```
TEST_MODE=true
```

### Check Frontend (.env.local file)
File: `C:\Users\rosek\Downloads\safelearningspotcentre\frontend\.env.local`

Should contain:
```
REACT_APP_TEST_MODE=true
REACT_APP_API_URL=http://localhost:5000/api
```

**Note:** After editing `.env` or `.env.local`, you MUST restart the respective server (backend or frontend).

---

## STEP 5: Verify API Endpoints Are Working

### Test 1: Check if Backend is Running
Open a new tab in your browser and visit:
```
http://localhost:5000/api/health
```

**Expected response:**
```json
{"status":"API is running"}
```

If this fails, your backend is not running or has an error.

### Test 2: Check if Courses API is Working
Make sure you're logged in first, then open browser console and run:
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/courses', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Courses:', data));
```

You should see all 7 courses logged to console with their modules.

### Test 3: Check if Payment API (Test Mode) is Working
In browser console, run:
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/payment/access/1', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Has Access:', data));
```

**Expected response:**
```json
{"hasAccess":true}
```

If you get `{"hasAccess":false}`, then TEST_MODE is not properly set on the backend.

---

## STEP 6: Navigate to a Course & Check Display

1. Go to Dashboard (http://localhost:3000/dashboard)
2. Click on any course card (e.g., "Friendship as Weaponry")
3. You should see:
   - ✓ Course title and subtitle
   - ✓ Module list on the left sidebar (6 modules)
   - ✓ Module content in the main area (NOT a paywall)
   - ✓ Detailed text content with multiple paragraphs
   - ✓ "Reflection Questions" section
   - ✓ Previous/Next module navigation buttons
   - ✓ Theme toggle (☀️ or 🌙) in header

If you see a **paywall** instead of the module content, see "Troubleshooting Paywall" below.

---

## STEP 7: Test Dark/Light Mode Toggle

1. In the course view, look for the sun/moon icon (☀️ or 🌙) in the header
2. Click it
3. The entire page should switch between dark and light themes
4. Test on the Dashboard too

If the toggle doesn't work, see "Troubleshooting Theme Toggle" below.

---

## TROUBLESHOOTING

### Problem: Still Seeing Paywall Instead of Module Content

**Cause:** `hasAccess` is false, which means TEST_MODE isn't being recognized.

**Fix:**
1. Verify `/frontend/.env.local` has `REACT_APP_TEST_MODE=true`
2. Stop the frontend server and restart it
3. Do a hard refresh (Ctrl+Shift+R)
4. Check browser console - should show `testMode boolean: true`

If console still shows `testMode boolean: false`:
- The .env.local file isn't being read
- Try deleting `node_modules` in frontend folder and reinstalling:
  ```bash
  cd frontend
  rm -rf node_modules
  npm install
  npm start
  ```

### Problem: Modules Not Loading (Blank Page or "Loading...")

**Cause:** API call to `/api/courses/{courseId}` is failing.

**Fix:**
1. Check backend is running: http://localhost:5000/api/health
2. Check browser console for network errors (Network tab)
3. Look for failed requests in red
4. Verify database connection (PostgreSQL running?)

### Problem: Theme Toggle Not Showing or Not Working

**Cause:** AuthContext not providing theme state, or CSS variables not loading.

**Fix:**
1. Check if theme toggle icon appears in course header (upper right)
2. If missing, check that `AuthContext` is imported in CourseView.js
3. If showing but not working:
   - Clear browser cache (DevTools > Storage > Clear Site Data)
   - Hard refresh
   - Check App.js has theme toggle functionality

### Problem: Modules List Shows Numbers But No Content

**Cause:** Module object might not have content property.

**Fix:**
1. Check routes/coursesData.js exists and has all courses with modules
2. Verify each module has: `id`, `title`, and `content`
3. All 7 courses should be in the file (see courses list below)

---

## Course Structure Verification

You should have exactly 7 courses with these module counts:

| Course | ID | Modules | Status |
|--------|----|---------| -------|
| Friendship as Weaponry | 1 | 6 | ✓ |
| Relationships: 2-Step Verification | 2 | 7 | ✓ |
| Energy Harvesting & Sacred Sexuality | 3 | 6 | ✓ |
| Financial Truth & Reversal | 4 | 7 | ✓ |
| Family Patterns & Scapegoating | 5 | 6 | ✓ |
| Institutional Brainwashing | 6 | 7 | ✓ |
| Media & Narrative Control | 7 | 6 | ✓ |

**Verify:** In browser console on Dashboard, run:
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/courses', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('Total courses:', data.length);
  data.forEach(c => console.log(`${c.id}. ${c.title} (${c.modules ? c.modules.length : 0} modules)`));
});
```

---

## Quick Checklist

- [ ] Backend server running (port 5000)?
- [ ] Frontend server running (port 3000)?
- [ ] Hard refresh done (Ctrl+Shift+R)?
- [ ] `.env` has `TEST_MODE=true`?
- [ ] `frontend/.env.local` has `REACT_APP_TEST_MODE=true`?
- [ ] Console shows `testMode boolean: true`?
- [ ] Health check works: http://localhost:5000/api/health?
- [ ] Courses list loads (7 courses)?
- [ ] Can click course and see module content (no paywall)?
- [ ] Theme toggle works (☀️ ↔ 🌙)?

---

## If All Else Fails

1. **Check database connection:**
   ```bash
   # In terminal, test PostgreSQL connection
   psql postgresql://postgres:Tonifigo222$@localhost:5432/safelearningspot
   ```
   If this fails, PostgreSQL isn't running or credentials are wrong.

2. **Check for port conflicts:**
   - Backend uses port 5000
   - Frontend uses port 3000
   - If either is taken, stop that service or change ports

3. **Check file permissions:**
   - Ensure `.env` and `frontend/.env.local` can be read
   - They should be in the project root directories

4. **Clear everything and restart fresh:**
   ```bash
   # Backend
   cd /your/backend/path
   rm -rf node_modules package-lock.json
   npm install
   node server.js
   
   # Frontend (in new terminal)
   cd /your/frontend/path
   rm -rf node_modules package-lock.json
   npm install
   npm start
   ```

---

## Next Steps

Once you've completed these steps and verified everything works:

1. Take a screenshot showing:
   - A course with full module content visible
   - The module list showing multiple modules
   - The reflection questions section

2. Test the theme toggle (switch to light mode and back)

3. Try navigating between modules using Previous/Next buttons

Then we can move forward with any additional refinements!
