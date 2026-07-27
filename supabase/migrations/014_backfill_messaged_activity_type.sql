-- Migration 014: Backfill historical messaged activity rows
UPDATE public.activity_log
SET type = 'messaged'
WHERE type = 'note'
  AND (metadata->>'action' = 'messaged' OR description LIKE 'WhatsApp message%');
