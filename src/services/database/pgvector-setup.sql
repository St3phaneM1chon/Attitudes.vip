-- ============================================
-- PGVECTOR SETUP FOR ATTITUDESFRAMEWORK
-- ============================================
-- Run this script to enable vector search in PostgreSQL 15
--
-- Prerequisites:
--   sudo apt-get install postgresql-15-pgvector  (Linux)
--   brew install pgvector                         (macOS)
--
-- Usage:
--   psql -U attitudes_admin -d attitudes -f pgvector-setup.sql

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create unified embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,     -- vendor, venue, menu, invitation, etc.
    entity_id VARCHAR(255) NOT NULL,
    embedding vector(1024),               -- BGE-M3 dimensions
    content_text TEXT,                     -- Original text used for embedding
    metadata JSONB DEFAULT '{}',          -- Flexible metadata: region, religion, price_range, etc.
    language VARCHAR(10) DEFAULT 'fr',    -- fr, en, ar, he, zh, hi, es
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- 3. Create HNSW index (recommended for pgvector, best recall/speed trade-off)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Create filtering indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_entity_type ON embeddings (entity_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_language ON embeddings (language);
CREATE INDEX IF NOT EXISTS idx_embeddings_metadata ON embeddings USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_embeddings_updated ON embeddings (updated_at);

-- 5. Add vector columns to existing tables (optional, for direct embedding on entities)
-- Uncomment as needed:

-- ALTER TABLE vendors ADD COLUMN IF NOT EXISTS embedding vector(1024);
-- CREATE INDEX IF NOT EXISTS idx_vendors_embedding ON vendors USING hnsw (embedding vector_cosine_ops);

-- ALTER TABLE venues ADD COLUMN IF NOT EXISTS embedding vector(1024);
-- CREATE INDEX IF NOT EXISTS idx_venues_embedding ON venues USING hnsw (embedding vector_cosine_ops);

-- 6. Useful query examples:

-- Find 10 most similar vendors to a query embedding:
-- SELECT entity_id, 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
-- FROM embeddings
-- WHERE entity_type = 'vendor'
-- ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
-- LIMIT 10;

-- Find vendors by region with semantic search:
-- SELECT entity_id, metadata, 1 - (embedding <=> query_vec) as similarity
-- FROM embeddings
-- WHERE entity_type = 'vendor' AND metadata->>'region' = 'europe_west'
-- ORDER BY embedding <=> query_vec
-- LIMIT 10;

-- Verify installation:
SELECT 'pgvector installed successfully' AS status,
       (SELECT count(*) FROM pg_extension WHERE extname = 'vector') AS extension_exists;
