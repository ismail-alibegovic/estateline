-- Migration 013: Add messaged value to activity_type enum
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'messaged';
