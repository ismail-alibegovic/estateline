# Estateline — Verified Status & Remaining Plan

Status: latest `master` plus signup/onboarding polish, deployed on Zo service `estateline`.
Live: https://estateline-sprypine.zocomputer.io
Last verified: 2026-08-17 08:05 UTC / 2026-08-17 10:05 Europe/Sarajevo.

## Verified done

- Build passes: Next.js 14 production build, 87 pages, 48 API routes.
- Service restarted after build via Zo service `svc_2PzJuRJA_6I`.
- Public routes verified: `/`, `/en/login`, `/en/signup`, `/en/forgot-password`, `/en/reset-password`.
- Auth middleware verified: dashboard routes redirect unauthenticated users and load after login with `test@estateline.ba`.
- Dashboard QA verified in browser: dashboard, properties, leads, reports, pipeline settings, document templates.
- Dashboard schema bugs fixed:
  - home metrics now use `leads.budget_min/budget_max` and `deals.price`, not removed `budget/amount` columns.
  - reports no longer selects missing `leads.budget`.
- PDF template generator verified:
  - `POST /api/documents/generate` returns `200 OK` with `application/pdf`.
  - Unicode Bosnian/Croatian/Serbian characters `č ć š đ ž Č Ć Š Đ Ž` work through embedded DejaVu Sans fonts.
  - Output verified as valid PDF 1.7, ~791 KB.
- Hourly / 6h Estateline automations are inactive.
- Prefixed Zo Secrets supported for Supabase:
  - `ESTATELINE_SUPABASE_URL`
  - `ESTATELINE_SUPABASE_ANON_KEY`
  - `ESTATELINE_SUPABASE_SERVICE_ROLE_KEY`
- Production warning cleanup completed:
  - `next-intl` trailing-slash env is normalized to a string without changing URL behavior.
  - `getRequestConfig` uses `requestLocale`, not the deprecated `locale` parameter.
  - Sentry client config moved to `instrumentation-client.ts` with router transition instrumentation.
  - App `<img>` lint warnings replaced with `next/image`.
- Signup/onboarding conversion flow verified:
  - signup now auto-generates a clean URL slug from the agency name, including BCS diacritic normalization.
  - successful signup routes new agencies to `/dashboard/onboarding`, not straight to the dashboard.
  - controlled live E2E verified signup → onboarding → first listing → dashboard, with throwaway Supabase rows cleaned up.
- Password reset flow verified:
  - forgot-password endpoint returns the same success response even when Supabase rejects a provider-specific email, avoiding account/error leakage.
  - reset-password page hydrates Supabase recovery sessions from implicit `#access_token` links before calling `updateUser`.
  - `/api/auth/callback` handles PKCE-style `?code=` auth links as a fallback.
  - controlled live E2E verified recovery link → reset page → password update → login with the new password, with throwaway auth user cleaned up.
- Automated test infrastructure verified:
  - unit tests pass: 28/28.
  - `check:env` and `check:i18n` pass.
  - Playwright uses system Chromium when bundled browsers are unavailable.
  - Playwright skips local `webServer` startup when `BASE_URL` targets the live service.
  - live E2E passes against `https://estateline-sprypine.zocomputer.io`: 2/2 tests.
  - DB-level migration/RLS/RPC scripts now support `ESTATELINE_DATABASE_URL` fallback, but still require the real Postgres connection string.
- Project-prefixed integration secrets supported:
  - Stripe: `ESTATELINE_STRIPE_SECRET_KEY`, `ESTATELINE_STRIPE_WEBHOOK_SECRET`, `ESTATELINE_STRIPE_PRICE_*`.
  - Email: `ESTATELINE_RESEND_API_KEY`, `ESTATELINE_EMAIL_FROM`.
  - SMS/WhatsApp: `ESTATELINE_TWILIO_*`, `ESTATELINE_WHATSAPP_VERIFY_TOKEN`.
  - AI: `ESTATELINE_GEMINI_API_KEY`.
  - Rate limiting: `ESTATELINE_UPSTASH_REDIS_REST_URL`, `ESTATELINE_UPSTASH_REDIS_REST_TOKEN`.
  - authenticated live smoke verified billing mock fallback, billing portal fallback, and AI rule-engine fallback.

## Verified done (2026-08-19 session)

- Homepage redesigned to match login/dashboard brand system (navy gradient, Cormorant serif, gold accent).
- Integrations status page: `/api/integrations/status` reads real backend env states; settings/integrations UI shows connected/missing grid.
- Public lead form production polish: `/lead-form` locale-agnostic (middleware-excluded), query-param embed flow (`?org=` / `?property=`), API validates org slug + property ownership, BCS diacritic-safe slug input, Suspense-wrapped (no CSR deopt).
- Dashboard analytics widgets: pipeline bars now dynamic from real lead stage counts; property status distribution widget added; monthly revenue computed from closed deals this month (no hardcoded values); OLX sync timestamp from activity log.
- Settings/profile schema fix: uses `users.full_name` instead of non-existent `first_name/last_name` columns.
- Settings/team schema fix: same `full_name` correction for `organization_members` join.
- Viewings page empty state added (locale-aware).
- Gemini AI integration live: model upgraded from dead `gemini-1.5-flash` to `gemini-3.6-flash`; `start-prod.sh` exports `.env.local` so `next start` process sees `ESTATELINE_*` secrets.
- Full dashboard QA: all 19 pages pass with 0 console errors and 0 failed requests.
- All changes pushed to GitHub master through `67e64b0`.

## Known open items

1. `.github/workflows/ci.yml` is modified locally but not pushed because the connected GitHub OAuth token lacks `workflow` scope.
   - Change: Node 18 → Node 20, `npm ci` → `npm ci --legacy-peer-deps`.
   - To push it manually: refresh GitHub auth with workflow scope, then commit and push this file.
2. Build still emits one non-blocking Edge-runtime warning from `@supabase/ssr` in middleware. Retained because middleware performs real Supabase auth validation before dashboard render.
3. Payment/email/SMS integrations still depend on real environment secrets (Stripe/Resend/Twilio/Upstash).
4. `ESTATELINE_DATABASE_URL` needed for DB-level migration/RLS/RPC smoke tests.
5. `.env.local` is gitignored and contains real prefixed secrets; it must be present on the server for `next start` to see them.

## Completed (2026-08-19 session)

4. ✅ Activity timeline component as a reusable dashboard widget — `ActivityTimeline.tsx`, integrated into dashboard and lead detail.
5. ✅ Real-time notifications — `NotificationBell.tsx` with Supabase realtime subscriptions for new leads and upcoming viewings.
6. ✅ Lead-to-deal conversion flow with automatic property linking — `/api/leads/[id]/convert` endpoint + modal UI on lead detail.
7. ✅ Advanced search/filter with saved views on properties and leads — price range, property type filter, lead source filter, `SavedViews.tsx` component with localStorage persistence.

## Remaining (requires user credentials)

1. Refresh GitHub workflow scope and push `.github/workflows/ci.yml` — blocked by missing `workflow` scope on GitHub token.
2. Add real values for `ESTATELINE_STRIPE_*`, `ESTATELINE_RESEND_*`, `ESTATELINE_TWILIO_*`, `ESTATELINE_UPSTASH_*` if moving to sale/demo mode.
3. Add `ESTATELINE_DATABASE_URL` for DB-level smoke tests.
