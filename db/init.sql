-- Profile POC Database Schema
-- Runs automatically on first docker compose up

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- RAW DATA SNAPSHOTS (imported from production, read-only)
-- ============================================================

CREATE TABLE raw_schools (
  id SERIAL PRIMARY KEY,
  urn INTEGER UNIQUE NOT NULL,
  data JSONB NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE raw_products (
  id SERIAL PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENTITY PROFILES (LLM-generated, evolving schema)
-- ============================================================

CREATE TABLE entity_profiles (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,

  schema_version TEXT NOT NULL DEFAULT '1.0',
  structured_fields JSONB NOT NULL DEFAULT '{}',

  raw_data JSONB,
  profile_text TEXT,
  profile_embedding vector(1024),

  profiled_at TIMESTAMPTZ DEFAULT NOW(),
  profiled_by TEXT DEFAULT 'titan-v2',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_profiles_type ON entity_profiles(entity_type);
CREATE INDEX idx_profiles_entity ON entity_profiles(entity_type, entity_id);
CREATE INDEX idx_profiles_embedding ON entity_profiles
  USING hnsw (profile_embedding vector_cosine_ops);
CREATE INDEX idx_profiles_structured ON entity_profiles
  USING gin (structured_fields);

-- ============================================================
-- PRECOMPUTED SIMILARITIES
-- ============================================================

CREATE TABLE entity_similarities (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  similar_entity_id TEXT NOT NULL,

  similarity_score NUMERIC(5,4),
  structured_score NUMERIC(5,4),
  embedding_score NUMERIC(5,4),
  graph_score NUMERIC(5,4),

  explanation TEXT,

  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, source_entity_id, similar_entity_id)
);

CREATE INDEX idx_similarities_lookup
  ON entity_similarities(entity_type, source_entity_id, similarity_score DESC);
