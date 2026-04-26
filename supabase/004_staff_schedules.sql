-- Staff weekly schedule (recurring)
-- Each row = one day of week for one staff member.
-- If a staff member has no row for a given day → treated as using business hours.
-- start_time / end_time NULL means the staff member doesn't work that day.

CREATE TABLE staff_schedules (
  staff_id    UUID     NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time  TIME,    -- NULL = not working this day
  end_time    TIME,
  PRIMARY KEY (staff_id, day_of_week)
);

-- Time off / absences (sick leave, vacation, personal, etc.)
CREATE TABLE staff_time_off (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE        NOT NULL,
  end_date   DATE        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'other'
               CHECK (type IN ('sick', 'vacation', 'personal', 'other')),
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date >= start_date)
);

ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off  ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_all_schedules"  ON staff_schedules USING (true) WITH CHECK (true);
CREATE POLICY "service_all_time_off"   ON staff_time_off  USING (true) WITH CHECK (true);

-- Index for time-off date range queries
CREATE INDEX staff_time_off_dates ON staff_time_off (staff_id, start_date, end_date);
