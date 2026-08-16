# Estateline — Verified Status & Remaining Plan

Status: `71dad89` on GitHub master, deployed on Zo service `estateline`.
Live: https://estateline-sprypine.zocomputer.io
Last verified: 2026-08-16 22:57 UTC / 2026-08-17 00:57 Europe/Sarajevo.

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

## Known open items

1. `.github/workflows/ci.yml` is modified locally but not pushed because the connected GitHub OAuth token lacks `workflow` scope.
   - Change: Node 18 → Node 20, `npm ci` → `npm ci --legacy-peer-deps`.
   - To push it manually: refresh GitHub auth with workflow scope, then commit and push this file.
2. Build still emits non-blocking warnings:
   - `next-intl` config warning: `env._next_intl_trailing_slash` expected string.
   - `next-intl` deprecated `locale` parameter in `getRequestConfig`.
   - Sentry recommends moving `sentry.client.config.ts` to `instrumentation-client.ts`.
   - Several `<img>` lint warnings where `next/image` could be used.
3. Payment/email/SMS/AI integrations still depend on real environment secrets.
4. Full Playwright E2E remains separate from this browser smoke QA.

## Next practical work

1. Fix the remaining warnings in small isolated commits.
2. Refresh GitHub workflow scope and push `.github/workflows/ci.yml`.
3. Add production env secrets for Stripe, Resend, Twilio/WhatsApp, Gemini, and Upstash if the app is moving to sale/demo mode.
4. Run full Playwright suite against seeded test data.
