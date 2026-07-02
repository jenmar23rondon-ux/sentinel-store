CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  importance INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('open', 'done')),
  due_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vision_items (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  analysis TEXT NOT NULL,
  provider TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_mime_type TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('schedule', 'message', 'email', 'reminder', 'automation')),
  title TEXT NOT NULL,
  target TEXT,
  draft TEXT,
  scheduled_for TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'done', 'cancelled')),
  source TEXT NOT NULL CHECK (source IN ('chat', 'manual')),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  application_date TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL CHECK (status IN ('applied', 'screening', 'interview', 'offer', 'rejected')),
  notes TEXT,
  recruiter_name TEXT,
  recruiter_email TEXT,
  salary_expectation TEXT,
  next_action_reminder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('location', 'app_usage', 'notification', 'activity')),
  title TEXT NOT NULL,
  detail TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  duration_minutes INTEGER,
  app_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  activity_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  career_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  location_insights BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO notification_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(type);
CREATE INDEX IF NOT EXISTS idx_activity_events_occurred_at ON activity_events(occurred_at);
