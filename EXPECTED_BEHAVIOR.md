# Expected Behavior - Safe Learning Spot Centre

This document shows exactly what you should see when everything is working correctly.

---

## ✓ EXPECTED BEHAVIOR: Login & Dashboard

### After Logging In
You should see the Dashboard with:

1. **Header Section**
   - "Safe Learning Spot Centre" title
   - Your email or user info
   - Theme toggle (☀️ for dark mode, 🌙 for light mode)
   - Logout button

2. **Hero Section**
   - Title: "You came here to learn something"
   - Subtitle explaining the courses
   - "About The Framework" section describing the approach

3. **Course Grid**
   Shows 7 course cards in a grid layout:
   
   ```
   01 - FRIENDSHIP AS WEAPONRY          02 - RELATIONSHIPS: 2-STEP VERIFICATION
   Boundaries & Energy Protection        Identifying Red Flags...
   [ACCESS COURSE] → click to enter      [ACCESS COURSE] → click to enter
   6 MODULES | SELF-PACED               7 MODULES | SELF-PACED
   
   03 - ENERGY HARVESTING...            04 - FINANCIAL TRUTH & REVERSAL
   Energy Sovereignty & Reclaiming Power Understanding Money & Building Wealth
   [ACCESS COURSE]                       [ACCESS COURSE]
   6 MODULES | SELF-PACED               7 MODULES | SELF-PACED
   
   (and 3 more courses below...)
   ```

Each card shows:
- Large numbered display (01-07) in faded gray
- Course title in white
- Subtitle in gray
- Description text in gray
- Module count ("6 MODULES")
- Duration ("SELF-PACED")
- "[ACCESS COURSE]" button

---

## ✓ EXPECTED BEHAVIOR: Course View (Module Display)

### After Clicking a Course

You should see:

1. **Header**
   - Back button (← Back)
   - Theme toggle (☀️ or 🌙)
   - Course title (e.g., "Friendship as Weaponry")
   - Course subtitle (e.g., "Boundaries & Energy Protection")
   - Badge: "✓ Completed" (if you've completed it)

2. **Left Sidebar**
   - **Modules List** section with:
     - All 6-7 modules listed as numbered buttons (1, 2, 3, etc.)
     - Currently viewing module has white background
     - Other modules have gray background
     - Hover effect makes them lighter
   
   - **Progress Indicator** showing:
     - Progress bar (visual indicator)
     - Text like "Module 1 of 6"

3. **Main Content Area** (NOT a paywall)
   
   Shows the **actual module content:**
   
   ```
   [Module Title]
   
   [Multi-paragraph detailed content in UK English]
   
   [Reflection Questions section]
   - "What in this module resonated with you?..."
   - "Can you see this pattern in your own life?..."
   - "What's one small thing you could do differently?..."
   - [Additional reflection questions]
   
   [Navigation Buttons]
   [← Previous Module]  [Next Module →]
   
   (On last module: [← Previous Module]  [✓ Mark Course Complete])
   ```

---

## ✗ WRONG BEHAVIOR: Paywall Instead of Content

### If You See This, Something Is Wrong:

```
╔═══════════════════════════════════════════════════╗
║                                                     ║
║           UNLOCK THIS COURSE                        ║
║                                                     ║
║  Get lifetime access to Friendship as Weaponry    ║
║  for £22                                           ║
║                                                     ║
║  Or get all 7 courses for £99                     ║
║                                                     ║
║  [Purchase Course Access]                         ║
║                                                     ║
║  ✓ TEST MODE: All courses are free while testing ║
║                                                     ║
╚═══════════════════════════════════════════════════╝
```

**Why is this happening?**
- TEST_MODE is not properly set
- Or .env.local doesn't have REACT_APP_TEST_MODE=true
- Or servers haven't been restarted after setting TEST_MODE
- Or browser cache needs clearing

**Fix:**
See the "Troubleshooting Paywall" section in DEBUG_GUIDE.md

---

## ✓ EXPECTED BEHAVIOR: Theme Toggle

### Dark Mode (Default)
- Background: Black (#0a0a0a)
- Text: White
- Cards: Dark gray
- Borders: Subtle gray

### Light Mode
- Background: White
- Text: Dark/black
- Cards: Light gray
- Borders: Light gray
- All text remains readable

**How to test:**
1. Click the moon emoji (🌙) in dark mode
2. Page should flash white and become light
3. Click the sun emoji (☀️) in light mode
4. Page should flash dark and become dark again

---

## ✓ EXPECTED BEHAVIOR: Module Navigation

### Previous/Next Buttons
- On Module 1: "← Previous Module" button is **disabled** (grayed out)
- On Module 1-5: Both "← Previous" and "Next Module →" are **active**
- On Last Module: "← Previous" is active, "Next Module →" is **replaced** with "✓ Mark Course Complete"

### Clicking Next Module
- Smoothly scrolls to top of page
- New module content loads
- Sidebar shows new module as active (white background)
- Progress bar updates
- Progress text updates (e.g., "Module 2 of 6")

### Marking Course Complete
- On the last module, click "✓ Mark Course Complete"
- Success message appears
- A badge "✓ Completed" appears in the course header
- Next time you visit dashboard, course shows as completed

---

## ✓ EXPECTED BEHAVIOR: Feedback Section

### After Marking Course Complete
- A "💬 Give us Feedback" button appears below the navigation
- Click it to expand a feedback form
- Form has textarea with placeholder "Your feedback here..."
- Submit button is disabled until you type something
- After submitting: "Thank you. Your feedback helps us heal better." message appears
- Form closes after 2 seconds

---

## ✓ EXPECTED BEHAVIOR: Browser Console (F12)

### What You Should See When Loading a Course:

```
Course loaded: {id: 1, title: "Friendship as Weaponry", modules: Array(6), ...}
TEST_MODE env var: true
testMode boolean: true
Test mode active - granting free access
```

### If You See This Instead:

```
Course loaded: {id: 1, title: "Friendship as Weaponry", modules: Array(6), ...}
TEST_MODE env var: undefined
testMode boolean: false
Production mode - checking payment access
```

**Problem:** REACT_APP_TEST_MODE is not set in frontend/.env.local
**Solution:** Add `REACT_APP_TEST_MODE=true` to frontend/.env.local and restart frontend server

---

## ✓ EXPECTED BEHAVIOR: All 7 Courses

Verify all courses are present by clicking through them:

1. **Friendship as Weaponry** (6 modules)
   - Module 1: Energy as Currency
   - Module 2: The Energy Vampire Archetype
   - Module 3: Boundaries That Stick
   - Module 4: The Cost of Nice
   - Module 5: Reclaiming Your Space
   - Module 6: Friendship Without Weaponry

2. **Relationships: 2-Step Verification** (7 modules)
   - Module 1: The Patterns That Predict
   - Module 2: Love-Bombing & The Initial Mask
   - Module 3: The Micro-Aggressions That Scale
   - Module 4: Dysfunction Archetypes
   - Module 5: Your Role in Dysfunction
   - Module 6: The Exit
   - Module 7: Choosing Differently

3. **Energy Harvesting & Sacred Sexuality** (6 modules)
   - Module 1: The Energy Body
   - Module 2: Energy Harvesting Tactics
   - Module 3: The Weaponisation of Sexuality
   - Module 4: What Sacred Sexuality Actually Is
   - Module 5: Your Body As Territory
   - Module 6: Energy Restoration & Sovereignty

4. **Financial Truth & Reversal** (7 modules)
   - Module 1: The Language of Money
   - Module 2: How the System Keeps You Poor
   - Module 3: The Debt Trap Architecture
   - Module 4: Building True Wealth
   - Module 5: The Frequency of Abundance
   - Module 6: Money As Sovereignty
   - Module 7: The Next Economy

5. **Family Patterns & Scapegoating** (6 modules)
   - Module 1: The Scapegoat Role
   - Module 2: Am I The Scapegoat?
   - Module 3: The Purpose of Scapegoating
   - Module 4: Generational Wounding
   - Module 5: Breaking the Cycle
   - Module 6: Rebuilding Family or Exiting Completely

6. **Institutional Brainwashing** (7 modules)
   - Module 1: The Institution as Training Ground
   - Module 2: School: Manufacturing Compliance
   - Module 3: Work: The Adult School
   - Module 4: Religion & Spirituality: Weaponised Meaning
   - Module 5: Government & Governance
   - Module 6: Independence & De-Programming
   - Module 7: Thinking For Yourself

7. **Media & Narrative Control** (6 modules)
   - Module 1: Narratives As Weapons
   - Module 2: The Architecture of Propaganda
   - Module 3: Media Literacy in the Attention Economy
   - Module 4: The Hero & The Villain
   - Module 5: Algorithmic Narratives
   - Module 6: Building Narrative Immunity

---

## Checklist: Everything Working?

- [ ] Dashboard shows 7 course cards
- [ ] Course 1 loads with 6 modules visible
- [ ] Course 2 loads with 7 modules visible
- [ ] Course 3 loads with 6 modules visible
- [ ] Can read full module content (multiple paragraphs)
- [ ] Can navigate between modules (Previous/Next buttons)
- [ ] Progress bar updates as you progress
- [ ] Theme toggle works (☀️ ↔ 🌙)
- [ ] Dark mode is readable
- [ ] Light mode is readable
- [ ] Can mark course complete
- [ ] Feedback button appears after completing
- [ ] Browser console shows TEST_MODE messages
- [ ] No red errors in console

Once all these are checked ✓, you're ready to deploy! 🚀

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Seeing paywall instead of content | TEST_MODE not set on frontend | Check `frontend/.env.local` has `REACT_APP_TEST_MODE=true` |
| Modules list appears but no content | API call failing | Check backend is running on port 5000 |
| Theme toggle doesn't work | CSS variables not loading | Clear browser cache, hard refresh (Ctrl+Shift+R) |
| Page shows "Loading..." forever | Backend not running | Run `node server.js` in backend directory |
| Blank page/no error | Frontend not running | Run `npm start` in frontend directory |
| "Failed to load course" error | Multiple issues | Check DEBUG_GUIDE.md troubleshooting section |

