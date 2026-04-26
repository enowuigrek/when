-- Allow 'system' as theme value (uses prefers-color-scheme)
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_theme_check;
ALTER TABLE settings ADD CONSTRAINT settings_theme_check
  CHECK (theme IN ('dark', 'light', 'system'));
