# Publishing Safe Spot to the App Store & Google Play (Capacitor)

Your project is already configured for Capacitor 6 (`capacitor.config.json`,
`@capacitor/*` in `package.json`). This guide takes you from there to live apps
on both stores. Work top to bottom.

> **Reality check:** the technical wrapping is the easy part. The friction is the
> stores — accounts, fees, review, and (for iPhone) needing a Mac. Budget a few
> evenings, not an afternoon.

---

## 0. What you need before you start

| | Android (Google Play) | iOS (App Store) |
|---|---|---|
| Computer | Mac, Windows, or Linux | **Mac required** (Xcode is Mac-only) |
| Tools | Android Studio (free) + Node.js | Xcode (free) + Node.js |
| Account | Google Play Console — **$25 one-time** | Apple Developer Program — **$99 / year** |
| Big gotcha | New *personal* accounts must run a 12-tester closed test for 14 days | App Review may reject "website wrappers" (see §6) |

If you don't have a Mac, you can still ship Android now and do iOS later (a Mac,
or a cloud-Mac service / a developer friend with one, is the only requirement).

---

## 1. ⚠️ Fix `webDir` first (don't ship your secrets)

Right now `capacitor.config.json` has `"webDir": "."`. Capacitor copies that whole
folder *into the app*, which would bundle `node_modules/`, `server.js`, `routes/`,
and **`.env` (your live Stripe secret key)** into a shippable file. Never do that.

Make a clean web-only folder and point Capacitor at it:

1. Create a folder, e.g. `www/`.
2. Copy in **only** the things the browser needs: all the `.html`, `.css`, `.js`
   (`app.css`, `tts.js`, `slsc-*.js`, etc.), `manifest.json`, `sw.js`, and the
   image/icon/splash files.
3. **Leave out:** `node_modules/`, `.env*`, `server.js`, `routes/`, `middleware/`,
   `database/`, the `.md` guides, and the `*.py`/debug scripts.
4. In `capacitor.config.json` change `"webDir": "."` to `"webDir": "www"`.

A quick way to keep this in sync is a small copy script, but doing it by hand once
is fine to start.

---

## 2. Install and add the native projects

From the project folder, in a terminal:

```bash
npm install                 # installs Capacitor (already in package.json)
npx cap add android         # creates the android/ project
npx cap add ios             # creates the ios/ project (Mac only)
npx cap sync                # copies your web build + plugins into both
```

Generate the app icons and splash screens from a single source image (you already
have `@capacitor/assets`):

```bash
# put a 1024x1024 icon at resources/icon.png and a splash at resources/splash.png
npx @capacitor/assets generate
npx cap sync
```

After any future change to your web files: `npx cap copy` (or `npx cap sync` if you
changed plugins), then rebuild.

---

## 3. Android → Google Play

1. **Open the project:** `npx cap open android` (launches Android Studio).
2. **Set version:** in `android/app/build.gradle`, set `versionCode` (an integer you
   bump every upload) and `versionName` (e.g. `1.0.0`).
3. **Create a signing key** (once): Android Studio → Build → *Generate Signed
   Bundle/APK* → **Android App Bundle (.aab)** → create a new keystore and **back it
   up safely** (lose it and you can't update the app).
4. **Build the signed `.aab`.**
5. **Google Play Console** (after paying the $25): *Create app* → fill in:
   - Store listing (name, description, screenshots, feature graphic),
   - Content rating questionnaire,
   - Data safety form (what data you collect — you have `privacy.html` to draw on),
   - Privacy policy URL (link your live `privacy.html`),
   - Pricing (Free).
6. **Upload the `.aab`** to a release.
7. **The testing rule:** a new personal account must first run **Closed testing**
   with **12 testers opted in for 14 days** before *Production* unlocks. Add testers
   by email, share the opt-in link, wait out the 14 days, then promote to Production
   and submit for review. (An *organization* Play account skips this.)

Google review is usually quick (hours to a couple of days).

---

## 4. iOS → App Store (Mac required)

1. **Open the project:** `npx cap open ios` (launches Xcode).
2. **Signing:** select the app target → *Signing & Capabilities* → check *Automatically
   manage signing* and pick your Apple Developer **Team**. Confirm the Bundle
   Identifier is `com.safelearningspot.centre`.
3. **Version:** set *Version* (e.g. `1.0.0`) and *Build* (bump every upload).
4. **Archive:** set the device target to *Any iOS Device*, then *Product → Archive*.
5. **Upload:** in the Organizer window, *Distribute App → App Store Connect → Upload*.
6. **App Store Connect** (appstoreconnect.apple.com): create the app record, then fill:
   - Screenshots (specific sizes for iPhone and iPad),
   - Description, keywords, support URL,
   - **App Privacy** "nutrition labels" (what data you collect),
   - Pricing (Free),
   - Age rating.
7. Attach the uploaded build and **Submit for Review**.

Apple review typically takes 1–3 days and is stricter than Google (see next).

---

## 5. Updating later

Both stores want a *new build number* each time:

```bash
# edit your web files in www/, then:
npx cap copy
```

- Android: bump `versionCode`/`versionName`, rebuild the `.aab`, upload a new release.
- iOS: bump *Build*, re-Archive, upload, submit.

Because your content is bundled, content changes ship as app updates. (If you'd
rather push content without an app update, that's a different setup — ask and I can
explain the trade-offs.)

---

## 6. The Apple "wrapper" risk — and why you're well placed

Apple's **Guideline 4.2 (Minimum Functionality)** is used to reject apps that are
essentially just a website in a shell. To pass cleanly:

- **Lean on what you already have:** the app runs **fully offline** (service worker +
  bundled content), shows a native splash and status bar, and is configured for
  **local notifications** — these are real native behaviours, not a Safari shortcut.
- **Make it feel like an app:** no visible browser chrome, smooth navigation, the
  install/PWA banners hidden inside the app (they're irrelevant there).
- **Consider adding genuine native value** if you get pushback — e.g. push
  notifications for new courses, or downloadable content — which strengthens the case.
- If rejected, you can reply in Resolution Center explaining the offline-first,
  trauma-informed learning experience; many apps pass on the second try after
  clarifying.

Google Play's equivalent (minimum-functionality/spam policy) exists but rejections
for this are far less common.

---

## 7. Quick summary / order of play

1. Fix `webDir` to a clean `www/` (no secrets). **← do this first**
2. `npm install` → `npx cap add android` / `ios` → `npx cap sync`.
3. Generate icons/splash with `@capacitor/assets`.
4. Android: sign the `.aab`, set up Play Console, run the 12-tester closed test, go live.
5. iOS (Mac): archive in Xcode, fill App Store Connect, submit, handle any 4.2 feedback.
6. Each update: edit `www/` → `npx cap copy` → bump build number → re-upload.

**Costs:** $25 once (Google) + $99/year (Apple). **Time:** Android can be live in
days; iOS depends on review; the Google 14-day test is the main scheduled wait.
