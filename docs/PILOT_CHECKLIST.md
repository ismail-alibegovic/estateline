# Estateline v1.0 Real Agency Pilot Checklist

Use this checklist for the first real agency pilot. Do not treat internal test data as a completed pilot.

## Pilot flow

1. Agency signup
   - Owner creates account.
   - Production email/password flow works.
   - Redirects land on the correct dashboard.

2. Organization setup
   - Agency profile, currency, contact details, and business settings are entered.
   - Owner can reach billing/settings without developer help.

3. Team invitation
   - Owner invites at least one Manager/Agent/Assistant.
   - Invite email arrives.
   - Invitee accepts with the correct email.
   - Wrong-email acceptance is rejected.

4. Existing data import
   - Import contacts, properties, and leads from the agency's real CSV/XLSX data.
   - Validate column mapping, duplicate handling, error reporting, and summary output.

5. Properties
   - Create one apartment, one house, and one commercial/land-style listing if applicable.
   - Add photos/documents where available.
   - Verify Balkan-specific fields are sufficient for the agency's workflow.

6. Lead capture and assignment
   - Create/capture a lead.
   - Assign it to an agent.
   - Confirm the assigned user sees the lead and unauthorized users do not.

7. Viewing
   - Schedule a viewing from a lead/property context.
   - Confirm calendar/date handling and mobile usability.

8. Pipeline and deal
   - Move a lead through stages.
   - Convert one lead to a deal.
   - Record commission data.

9. Documents
   - Generate or attach one business document.
   - Verify generated/downloaded file naming and access permissions.

10. Reporting
    - Check dashboard/report numbers against the pilot records.
    - Confirm the agency understands what requires attention today.

11. Export
    - Export organization data.
    - Confirm files contain only the agency's data.

12. Billing
    - Run Stripe test-mode subscription flow before live payment.
    - Confirm plan state, portal access, cancellation, and failed-payment behavior.

## Observe during pilot

- Confusing steps.
- Unnecessary clicks.
- Missing regional fields.
- Mobile friction.
- Failed integrations.
- Reporting gaps.
- Onboarding friction.
- Slow imports or unclear validation errors.
- Any tenant/permission mismatch.

## Current pilot status

REAL USER PILOT REQUIRED
