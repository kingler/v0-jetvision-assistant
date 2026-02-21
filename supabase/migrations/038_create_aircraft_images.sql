-- Migration: 038_create_aircraft_images
-- Purpose: Store web-searched aircraft images per model for pre-production fallback.
-- Lifecycle: This table supports the temporary image search fallback.
-- When real Avinode tailPhotoUrl images are consistently available,
-- this table can be dropped.

CREATE TABLE IF NOT EXISTS aircraft_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aircraft_model TEXT NOT NULL,
  aircraft_category TEXT,
  year_of_manufacture INTEGER,
  image_type TEXT NOT NULL CHECK (image_type IN ('exterior', 'interior')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  source TEXT,
  width INTEGER,
  height INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aircraft_model, image_type, url)
);

CREATE INDEX IF NOT EXISTS idx_aircraft_images_model
  ON aircraft_images(aircraft_model);

CREATE INDEX IF NOT EXISTS idx_aircraft_images_lookup
  ON aircraft_images(aircraft_model, image_type);

-- RLS: Allow service_role full access, authenticated users read-only
ALTER TABLE aircraft_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on aircraft_images"
  ON aircraft_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read aircraft_images"
  ON aircraft_images
  FOR SELECT
  TO authenticated
  USING (true);
