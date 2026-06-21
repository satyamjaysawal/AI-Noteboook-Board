-- PostgreSQL schema for NoteFlow
-- Usage: psql -U noteflow -d noteflow -f backend/db/schema.sql

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL,
    position JSONB NOT NULL DEFAULT '{"x": 100, "y": 100}',
    styling JSONB NOT NULL DEFAULT '{"backgroundColor": "#ffffff", "fontSize": 16}',
    "imageUrl" VARCHAR DEFAULT '',
    "userId" UUID,
    tags JSONB NOT NULL DEFAULT '[]',
    "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    "sourceHandle" VARCHAR,
    "targetHandle" VARCHAR,
    label VARCHAR NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source);
CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes("isPinned");