-- REZ A.I PostgreSQL schema v1.
-- Run with a dedicated migration account. Do not grant application roles
-- direct access to user-owned tables before tenant-scoped access is wired.
BEGIN;

CREATE TABLE rez_users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at TIMESTAMPTZ,
    CONSTRAINT rez_users_email_normalized CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
    CONSTRAINT rez_users_email_unique UNIQUE (email)
);

CREATE TABLE rez_conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES rez_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nova conversa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rez_conversations_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    CONSTRAINT rez_conversations_owner_pair UNIQUE (id, user_id)
);
CREATE INDEX rez_conversations_user_updated_idx ON rez_conversations (user_id, updated_at DESC);

CREATE TABLE rez_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rez_messages_owned_conversation FOREIGN KEY (conversation_id, user_id)
        REFERENCES rez_conversations(id, user_id) ON DELETE CASCADE
);
CREATE INDEX rez_messages_conversation_created_idx ON rez_messages (conversation_id, created_at, id);

CREATE TABLE rez_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES rez_users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT rez_sessions_valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT rez_sessions_hash_is_hex CHECK (token_hash ~ '^[0-9a-f]{64}$')
);
CREATE INDEX rez_sessions_user_idx ON rez_sessions (user_id);
CREATE INDEX rez_sessions_expiry_idx ON rez_sessions (expires_at) WHERE revoked_at IS NULL;

-- Defense in depth: deny access to these tables unless a specific user-scoped
-- role/policy is deliberately configured later. The application must not
-- connect as the migration owner or a superuser.
ALTER TABLE rez_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rez_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rez_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rez_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rez_users FORCE ROW LEVEL SECURITY;
ALTER TABLE rez_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE rez_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE rez_sessions FORCE ROW LEVEL SECURITY;

COMMIT;
