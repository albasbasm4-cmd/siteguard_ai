/*
# Add source column to hazards

## Overview
Adds a `source` column to track how each hazard was classified: 'ai', 'demo', or 'inspector'.

## Changes
1. Modified Tables
   - `hazards`
     - `source` (text, nullable) — Classification source: 'ai' | 'demo' | 'inspector'
     - `confidence` (numeric, nullable) — AI confidence score 0-1

## Security
- No RLS changes — existing policies cover all columns.
*/

ALTER TABLE hazards ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE hazards ADD COLUMN IF NOT EXISTS confidence numeric;
