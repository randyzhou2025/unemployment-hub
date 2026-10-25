CREATE TABLE IF NOT EXISTS contents (
 id text PRIMARY KEY, draft jsonb NOT NULL, draft_version integer NOT NULL DEFAULT 1,
 state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','review','published')),
 current_revision integer NOT NULL DEFAULT 0, withdrawn integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_revisions (
 content_id text NOT NULL REFERENCES contents(id), revision integer NOT NULL,
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(content_id,revision)
);
CREATE INDEX IF NOT EXISTS content_kind_idx ON contents ((draft->>'kind'));
CREATE TABLE IF NOT EXISTS sources(id text PRIMARY KEY,data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS admin_users(username text PRIMARY KEY,password_hash text NOT NULL,role text NOT NULL CHECK(role IN ('editor','reviewer','admin')));
CREATE TABLE IF NOT EXISTS admin_sessions(token_hash text PRIMARY KEY,username text NOT NULL REFERENCES admin_users(username),expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS session_expiry_idx ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS audit_logs(id text PRIMARY KEY,actor text NOT NULL,action text NOT NULL,entity_id text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS feedbacks(id text PRIMARY KEY,content_id text,message text NOT NULL,state text NOT NULL DEFAULT 'open',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app_config(key text PRIMARY KEY,value jsonb NOT NULL);
