ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS facebook_url    TEXT,
  ADD COLUMN IF NOT EXISTS website_url     TEXT,
  ADD COLUMN IF NOT EXISTS color_accent    TEXT NOT NULL DEFAULT '#d4a26a',
  ADD COLUMN IF NOT EXISTS theme           TEXT NOT NULL DEFAULT 'dark'
    CHECK (theme IN ('dark', 'light'));
