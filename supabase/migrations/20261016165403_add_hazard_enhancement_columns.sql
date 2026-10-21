/*
# Add fine, corrective action, and photo columns to hazards

## Overview
Adds three new columns to the `hazards` table to support enhanced hazard reporting:
estimated fines, recommended corrective actions, and photo preview URLs.

## Changes
1. Modified Tables
   - `hazards`
     - `estimated_fine` (integer, nullable) — Estimated OSHA fine in USD
     - `corrective_action` (text, nullable) — Recommended corrective action
     - `photo_url` (text, nullable) — URL to a hazard photo preview

## Security
- No RLS policy changes needed — existing policies already cover all columns.
- All new columns are nullable so existing rows are unaffected.
*/

ALTER TABLE hazards ADD COLUMN IF NOT EXISTS estimated_fine integer;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS corrective_action text;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS photo_url text;
