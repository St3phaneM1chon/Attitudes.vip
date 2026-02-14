/**
 * VECTOR SEARCH SERVICE - pgvector for PostgreSQL 15
 * ====================================================
 * Provides semantic vector search capabilities using pgvector extension.
 * Supports HNSW and IVFFlat indexing for fast similarity search.
 *
 * Prerequisites:
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *
 * Usage:
 *   const { VectorSearchService } = require('./vectorSearch');
 *   const vectorSearch = new VectorSearchService(sequelize);
 *   await vectorSearch.initialize();
 *   await vectorSearch.upsertEmbedding('vendor', vendorId, embedding, metadata);
 *   const results = await vectorSearch.searchSimilar('vendor', queryEmbedding, 10);
 */

const { QueryTypes } = require('sequelize');

class VectorSearchService {
    constructor(sequelize, options = {}) {
        this.sequelize = sequelize;
        this.dimensions = options.dimensions || 1024; // BGE-M3 default
        this.distanceMetric = options.distanceMetric || 'cosine'; // cosine, l2, inner_product
        this.initialized = false;
    }

    /**
     * Initialize pgvector extension and create embeddings table
     */
    async initialize() {
        try {
            // Enable pgvector extension
            await this.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

            // Create unified embeddings table
            await this.sequelize.query(`
                CREATE TABLE IF NOT EXISTS embeddings (
                    id SERIAL PRIMARY KEY,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(255) NOT NULL,
                    embedding vector(${this.dimensions}),
                    content_text TEXT,
                    metadata JSONB DEFAULT '{}',
                    language VARCHAR(10) DEFAULT 'fr',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(entity_type, entity_id)
                );
            `);

            // Create HNSW index for cosine similarity (best for normalized embeddings)
            await this.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw
                ON embeddings
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            `);

            // Create indexes for filtering
            await this.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_embeddings_entity_type
                ON embeddings (entity_type);
            `);

            await this.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_embeddings_language
                ON embeddings (language);
            `);

            // GIN index for JSONB metadata queries
            await this.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_embeddings_metadata
                ON embeddings USING gin (metadata);
            `);

            this.initialized = true;
            return { success: true, message: 'pgvector initialized' };
        } catch (error) {
            // If pgvector extension is not available, log and degrade gracefully
            if (error.message.includes('could not open extension')) {
                console.warn('pgvector extension not available. Install with: apt-get install postgresql-15-pgvector');
                return { success: false, message: 'pgvector not installed' };
            }
            throw error;
        }
    }

    /**
     * Upsert an embedding for an entity
     * @param {string} entityType - Type of entity (vendor, venue, menu, etc.)
     * @param {string} entityId - Unique entity identifier
     * @param {number[]} embedding - Vector embedding (1024 dimensions for BGE-M3)
     * @param {object} metadata - Additional metadata for filtering
     * @param {string} contentText - Original text content
     * @param {string} language - Language code (fr, en, ar, etc.)
     */
    async upsertEmbedding(entityType, entityId, embedding, metadata = {}, contentText = '', language = 'fr') {
        const vectorStr = `[${embedding.join(',')}]`;

        await this.sequelize.query(`
            INSERT INTO embeddings (entity_type, entity_id, embedding, content_text, metadata, language, updated_at)
            VALUES (:entityType, :entityId, :embedding::vector, :contentText, :metadata::jsonb, :language, NOW())
            ON CONFLICT (entity_type, entity_id)
            DO UPDATE SET
                embedding = EXCLUDED.embedding,
                content_text = EXCLUDED.content_text,
                metadata = embeddings.metadata || EXCLUDED.metadata,
                language = EXCLUDED.language,
                updated_at = NOW();
        `, {
            replacements: {
                entityType,
                entityId,
                embedding: vectorStr,
                contentText,
                metadata: JSON.stringify(metadata),
                language,
            },
            type: QueryTypes.INSERT,
        });
    }

    /**
     * Search for similar entities using cosine similarity
     * @param {string} entityType - Filter by entity type (or null for all)
     * @param {number[]} queryEmbedding - Query vector
     * @param {number} limit - Max results
     * @param {object} filters - Additional filters { language, region, metadata_key }
     * @returns {Array<{entity_id, entity_type, similarity, content_text, metadata}>}
     */
    async searchSimilar(entityType, queryEmbedding, limit = 10, filters = {}) {
        const vectorStr = `[${queryEmbedding.join(',')}]`;

        let whereClause = '';
        const conditions = [];
        const replacements = { embedding: vectorStr, limit };

        if (entityType) {
            conditions.push('entity_type = :entityType');
            replacements.entityType = entityType;
        }

        if (filters.language) {
            conditions.push('language = :language');
            replacements.language = filters.language;
        }

        if (filters.region) {
            conditions.push("metadata->>'region' = :region");
            replacements.region = filters.region;
        }

        if (filters.metadata) {
            conditions.push('metadata @> :metadataFilter::jsonb');
            replacements.metadataFilter = JSON.stringify(filters.metadata);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        const results = await this.sequelize.query(`
            SELECT
                entity_id,
                entity_type,
                1 - (embedding <=> :embedding::vector) as similarity,
                content_text,
                metadata,
                language
            FROM embeddings
            ${whereClause}
            ORDER BY embedding <=> :embedding::vector
            LIMIT :limit;
        `, {
            replacements,
            type: QueryTypes.SELECT,
        });

        return results;
    }

    /**
     * Batch upsert multiple embeddings efficiently
     * @param {Array<{entityType, entityId, embedding, metadata, contentText, language}>} items
     */
    async batchUpsert(items) {
        if (!items.length) return 0;

        const transaction = await this.sequelize.transaction();
        let count = 0;

        try {
            for (const item of items) {
                await this.upsertEmbedding(
                    item.entityType,
                    item.entityId,
                    item.embedding,
                    item.metadata || {},
                    item.contentText || '',
                    item.language || 'fr'
                );
                count++;
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        return count;
    }

    /**
     * Delete embeddings for an entity
     */
    async deleteEmbedding(entityType, entityId) {
        await this.sequelize.query(`
            DELETE FROM embeddings WHERE entity_type = :entityType AND entity_id = :entityId;
        `, {
            replacements: { entityType, entityId },
            type: QueryTypes.DELETE,
        });
    }

    /**
     * Get statistics about stored embeddings
     */
    async getStats() {
        const stats = await this.sequelize.query(`
            SELECT
                entity_type,
                COUNT(*) as count,
                COUNT(DISTINCT language) as languages
            FROM embeddings
            GROUP BY entity_type
            ORDER BY count DESC;
        `, { type: QueryTypes.SELECT });

        const total = await this.sequelize.query(`
            SELECT COUNT(*) as total FROM embeddings;
        `, { type: QueryTypes.SELECT });

        return {
            total: parseInt(total[0].total),
            byType: stats,
        };
    }
}

module.exports = { VectorSearchService };
