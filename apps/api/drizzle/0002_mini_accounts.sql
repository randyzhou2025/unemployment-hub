CREATE TABLE IF NOT EXISTS mini_users (
 id text PRIMARY KEY, app_id text NOT NULL, openid text NOT NULL,
 nickname text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 last_active_at timestamptz NOT NULL DEFAULT now(), UNIQUE(app_id, openid)
);
CREATE INDEX IF NOT EXISTS mini_users_activity_idx ON mini_users(last_active_at DESC);
CREATE TABLE IF NOT EXISTS mini_sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES mini_users(id),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mini_session_expiry_idx ON mini_sessions(expires_at);
CREATE TABLE IF NOT EXISTS mini_daily_activity (
 user_id text NOT NULL REFERENCES mini_users(id), day text NOT NULL,
 first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
 visits integer NOT NULL DEFAULT 1, PRIMARY KEY(user_id,day)
);
CREATE INDEX IF NOT EXISTS mini_daily_day_idx ON mini_daily_activity(day);
