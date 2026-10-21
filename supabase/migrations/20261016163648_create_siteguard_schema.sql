/*
# SiteGuard AI - Industrial Safety Inspection Platform Schema

## Overview
Creates the database schema for an AI-powered industrial safety and compliance inspection platform.
This is a single-tenant demo app with no sign-in screen, so all policies are scoped to anon + authenticated.

## New Tables
1. `facilities` - Industrial facilities being inspected
   - id (uuid PK)
   - name (text) - Facility name
   - location (text) - Geographic location
   - type (text) - Facility type (warehouse, chemical_plant, assembly_line)
   - created_at (timestamptz)

2. `inspections` - Inspection sessions for facilities
   - id (uuid PK)
   - facility_id (uuid FK -> facilities)
   - status (text) - running, completed, failed
   - started_at (timestamptz)
   - completed_at (timestamptz)
   - total_hazards (int) - Count of hazards found
   - compliance_score (numeric) - 0-100 score

3. `hazards` - Individual hazards detected during inspections
   - id (uuid PK)
   - inspection_id (uuid FK -> inspections)
   - facility_id (uuid FK -> facilities)
   - type (text) - Hazard type (fire, chemical, electrical, fall, ppe, structural)
   - severity (text) - critical, high, medium, low
   - location_label (text) - Where in the facility
   - zone_x (int) - X coordinate on floorplan (0-100)
   - zone_y (int) - Y coordinate on floorplan (0-100)
   - description (text)
   - regulation (text) - Applicable regulation code
   - status (text) - open, acknowledged, resolved
   - detected_at (timestamptz)

## Security
- RLS enabled on all tables
- All policies scoped TO anon, authenticated (single-tenant demo app, no sign-in)
- Full CRUD allowed for all roles since data is intentionally shared/public
*/

CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  type text NOT NULL DEFAULT 'warehouse',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_hazards integer DEFAULT 0,
  compliance_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  location_label text NOT NULL,
  zone_x integer DEFAULT 50,
  zone_y integer DEFAULT 50,
  description text,
  regulation text,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz DEFAULT now()
);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;

-- Facilities policies
DROP POLICY IF EXISTS "anon_select_facilities" ON facilities;
CREATE POLICY "anon_select_facilities" ON facilities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_facilities" ON facilities;
CREATE POLICY "anon_insert_facilities" ON facilities FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_facilities" ON facilities;
CREATE POLICY "anon_update_facilities" ON facilities FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_facilities" ON facilities;
CREATE POLICY "anon_delete_facilities" ON facilities FOR DELETE
  TO anon, authenticated USING (true);

-- Inspections policies
DROP POLICY IF EXISTS "anon_select_inspections" ON inspections;
CREATE POLICY "anon_select_inspections" ON inspections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspections" ON inspections;
CREATE POLICY "anon_insert_inspections" ON inspections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspections" ON inspections;
CREATE POLICY "anon_update_inspections" ON inspections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspections" ON inspections;
CREATE POLICY "anon_delete_inspections" ON inspections FOR DELETE
  TO anon, authenticated USING (true);

-- Hazards policies
DROP POLICY IF EXISTS "anon_select_hazards" ON hazards;
CREATE POLICY "anon_select_hazards" ON hazards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_hazards" ON hazards;
CREATE POLICY "anon_insert_hazards" ON hazards FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_hazards" ON hazards;
CREATE POLICY "anon_update_hazards" ON hazards FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_hazards" ON hazards;
CREATE POLICY "anon_delete_hazards" ON hazards FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inspections_facility ON inspections(facility_id);
CREATE INDEX IF NOT EXISTS idx_hazards_facility ON hazards(facility_id);
CREATE INDEX IF NOT EXISTS idx_hazards_inspection ON hazards(inspection_id);

-- Seed default facilities
INSERT INTO facilities (name, location, type) VALUES
  ('Warehouse Alpha', 'Austin, TX', 'warehouse'),
  ('Chemical Plant B', 'Houston, TX', 'chemical_plant'),
  ('Assembly Line 4', 'Detroit, MI', 'assembly_line')
ON CONFLICT DO NOTHING;
