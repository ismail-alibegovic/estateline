-- Migration 015: Add sms value to activity_type enum
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'sms';
