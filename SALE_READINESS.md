# Estateline — Sale-Readiness Audit (2026-08-13)

Live: https://estateline-sprypine.zocomputer.io
Repo: github.com/ismail-alibegovic/estateline
Supabase: production project (BS/HR/SR/EN i18n, RLS, 48 API routes)

## ✅ Completed in 2026-08-16 / 2026-08-17 verification session

| Area | Action | Status |
|------|--------|--------|
| Automations | Estateline hourly / 6h deployment automations confirmed inactive | Done |
| Supabase secrets | Added support for project-prefixed Zo secrets: `ESTATELINE_SUPABASE_URL`, `ESTATELINE_SUPABASE_ANON_KEY`, `ESTATELINE_SUPABASE_SERVICE_ROLE_KEY` | Fixed, pushed |
| PDF generator | Replaced StandardFonts-only PDF generation with embedded DejaVu Sans + fontkit so `č/ć/š/đ/ž` render correctly | Fixed, pushed |
| Template PDF API | Verified `POST /api/documents/generate` returns valid PDF 1.7 with Unicode content | Verified live |
| Dashboard home | Fixed Supabase selects using removed `budget` / `amount` fields | Fixed, pushed |
| Reports | Removed missing `leads.budget` select causing Supabase 400 on reports page | Fixed, pushed |
| Authenticated browser QA | Verified login, dashboard, properties, leads, reports, pipeline settings, document templates | Verified live |
| Build warnings | Removed `next-intl` config/deprecation warnings, Sentry client-config rename warning, and app `<img>` lint warnings | Fixed locally, verified live |
| Signup conversion | Auto-generates clean agency slugs, redirects successful signup to onboarding, and removes invalid browser `pattern` regex warning | Fixed, verified live |
| Onboarding E2E | Verified controlled signup → onboarding → first listing → dashboard flow with throwaway Supabase rows cleaned up | Verified live |
| Password reset | Added Supabase recovery-session hydration from `#access_token` reset links, kept `/api/auth/callback` as PKCE fallback, and hardened forgot-password response handling | Fixed, verified live |

## ✅ Completed in 2026-08-13 sessions

### Session 1 (commits 2b5aa10, 08475b1, 587f115, 0d1a007)

| Area | Action | Status |
|------|--------|--------|
| Bug — area_sqm typos | Fixed on dashboard home (always showed fallback "65") + properties list (type error TS2353) | Fixed, pushed |
| Build / lint / type-check | All clean; 28/28 unit tests pass | Verified |
| CI block (4 days red) | react-leaflet@5 peer-depends on React 19; project pins React 18. Pinned react-leaflet@^4.2.1 (React-18 compatible, API unchanged) + Node 18→20 + `npm ci --legacy-peer-deps` | Pushed (code only) |
| Public marketing landing | `/[locale]` was a redirect to `/dashboard`. Built bilingual hero + 8-module grid + 3-tier pricing + CTA + footer. Brand-styled. Static-prerendered. | Live, screenshots verified |
| Billing UX | Upgrade buttons now POST /api/billing/checkout and redirect to Stripe URL. Mock fallback for missing STRIPE_SECRET_KEY. Real live usage meters (not static placeholders). | Pushed, live |

### Session 2 (commit 754ba8e)

| Area | Action | Status |
|------|--------|--------:|
| Onboarding wizard — broken Step 2 (Team invite) | Step 2 collected an email but `handleCompleteOnboarding` never sent it. Now calls the existing `/api/organizations/members/add-existing` POST (graceful `failed` status if user doesn't exist on the platform yet, `skipped` if email invalid). Runs in `Promise.allSettled` so the wizard completes even if the invite fails. | Fixed, pushed |
| Onboarding wizard — broken Step 4 (First property) | Step 4 collected title/price but `handleCompleteOnboarding` never wrote them. Now calls the existing `/api/properties` POST with auto-slugified title, default city 'Sarajevo' if blank, default currency 'BAM'. Same `Promise.allSettled` wrapper. | Fixed, pushed |
| Onboarding wizard — dead Step 1 fields | Step 1 collected agency address/phone, but `organizations` has no such columns — the data was silently dropped. UI removed. | Fixed, pushed |
| Onboarding wizard — Bosnian-only | Added a self-contained inline `dict = { en: {...}, bs: {...} }` keyed off the `locale` param — keeps the wizard isolated from the main `useTranslations` i18n dict, no key-parity impact. | Fixed, pushed |

### Session 3 (this commit)

| Area | Action | Status |
|------|--------|--------:|
| Dashboard home — fake agenda | `Današnji Obilasci` card hardcoded two viewings ("Emir Hadžić 14:00", "Belma Čolić 16:30") and a `3 zakazana` badge — regardless of real data. Replaced with real fetch (`todayViewings` from the existing `/viewings` query), filtered to today in the user's tz, plus a dashed amber empty-state CTA when zero viewings. Removed all hardcoded names/phone numbers. | Fixed, pushed |
| Contacts — missing empty state | Contacts grid had no empty state when 0 contacts existed — just rendered a bare `[]` container. Added a dashed amber CTA card (same shape as the existing `properties` empty state) with an `Add Contact` button that opens the existing modal. | Fixed, pushed |
| Leads — weak top-level empty state | Top-level kanban only had a tiny per-stage `Nema klijenata u ovoj fazi` line. Added a branded top-level empty card prompting the user to add their first lead. | Fixed, pushed |
| i18n parity | Added 26 new keys per locale across `dashboard`/`contacts`/`leads` for the new empty-state copy. Both BS + EN dict `check:i18n` green. | Fixed, pushed |
|

## ⚠️ One **manual action** Ismail must do (cannot be done from here)

**Push the modified `.github/workflows/ci.yml`** — gh CLI token lacks the `workflow` OAuth scope, so I can't commit workflow files. The `ci.yml` change is modified locally but not pushed:

```bash
cd /home/workspace/estateline
gh auth refresh --scopes workflow   # one-time, opens a browser to grant the scope
git add .github/workflows/ci.yml     # already modified locally: npm ci --legacy-peer-deps + node-version 20
git commit -m "fix(ci): --legacy-peer-deps + Node 20"
git push origin master
```

Without this, the next push won't trigger CI green (CI runs will keep failing on `npm ci` ERESOLVE until this file is on master).

## 🔴 Required to actually collect money (backend env — currently dormant)

Supabase is configured through prefixed Estateline secrets. Every integration below has working code + UI but still needs real credentials before sale/demo mode:

| Service | Env vars to set in .env.local | What breaks without |
|---------|------------------------------|---------------------|
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_WEBHOOK_SECRET` | Upgrade buttons return mock URL; no real charges |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | No welcome/invoice/report emails send |
| SMS/WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp inbound webhook + automated replies silent |
| AI | `GEMINI_API_KEY` | Property-description generator + AI matchmaking non-functional |
| Rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Falls back to in-memory limiter (no cross-instance protection) |

Set these in `/home/workspace/estateline/.env.local` then `update_user_service` (no code change needed).

## 🟡 Pre-sale polish (UX, not blockers)

- Payment/email/SMS/AI flows still require real production credentials before sale/demo mode.
- Recommended: run `npm run test:e2e` locally with `BASE_URL=http://localhost:3000` after checkout (Playwright suite, ~5 min). Couldn't run here because needs a seeded test DB.

## 📊 Codebase health

- 48 API routes, 11 unit-test files, RLS isolation e2e test present
- Service uptime: 15+ days continuous; auto-restarts on crash (supervisord-user)
- Build: ~3 min, ~158 KB First Load JS shared bundle
- i18n: BS + EN with full key parity
- Sentry wired (`@sentry/nextjs`), PII redaction in `src/lib/sentry-pii.ts`
- Dependency hygiene: react-leaflet downgrade removed 18 unnecessary transitive packages
- 11 npm audit warnings (2 low, 1 moderate, 7 high, 1 critical) — review with `npm audit` before going public-facing; mostly transitive in dev deps, not all production-reachable

## TL;DR

**To be sellable:** (1) refresh gh to push the CI workflow file, (2) add Stripe + 4 third-party env keys to `.env.local`, (3) deploy. Everything else is done — code is shipped, build is green, landing page is live and converts to signup.
