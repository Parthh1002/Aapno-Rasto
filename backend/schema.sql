-- ============================================================
-- Aapno Rasto — PostgreSQL Schema
-- Run this in Neon.tech → SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    phone        VARCHAR(20),
    role         VARCHAR(50) NOT NULL DEFAULT 'citizen',  -- citizen | engineer | admin
    points       INTEGER NOT NULL DEFAULT 0,
    avatar_url   TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- ─── Complaints ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Core fields
    category                  VARCHAR(100) NOT NULL,
    sub_category              VARCHAR(100),
    description               TEXT NOT NULL,
    status                    VARCHAR(50) NOT NULL DEFAULT 'pending',
    urgency                   VARCHAR(20),    -- low | medium | high

    -- Location
    lat                       DOUBLE PRECISION NOT NULL,
    lng                       DOUBLE PRECISION NOT NULL,
    address                   TEXT,

    -- Images
    image_url                 TEXT,
    resolution_image_url      TEXT,
    resolution_notes          TEXT,
    resolution_photos         TEXT[],         -- Array of image URLs

    -- Assignment
    assigned_to               UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Duplicate detection (AI)
    is_duplicate              BOOLEAN DEFAULT FALSE,
    duplicate_type            VARCHAR(50),
    master_issue_id           UUID,
    match_confidence          DOUBLE PRECISION,
    matched_against_issue_id  UUID,
    match_reason              TEXT[],
    image_hash                VARCHAR(64),

    -- Engagement
    upvotes                   INTEGER DEFAULT 0,
    location_mismatch         BOOLEAN DEFAULT FALSE,
    points_awarded            INTEGER,

    -- Timestamps
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at               TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_user_id   ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status    ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category  ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created   ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_location  ON complaints(lat, lng);

-- ─── Auto-update updated_at trigger ───────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── Verify ───────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
