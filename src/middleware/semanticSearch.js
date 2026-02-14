/**
 * SEMANTIC SEARCH MIDDLEWARE
 * ===========================
 * Express middleware that adds semantic search capabilities to API routes.
 * Uses pgvector for vector similarity search on entities.
 *
 * Usage in routes:
 *   const { semanticSearch } = require('../middleware/semanticSearch');
 *
 *   // Add to any GET route:
 *   router.get('/vendors/search', semanticSearch('vendor'), (req, res) => {
 *       res.json(req.semanticResults);
 *   });
 *
 *   // Query: GET /vendors/search?q=photographe créatif pour mariage&lang=fr&limit=10
 */

const { VectorSearchService } = require('../services/database/vectorSearch');

let _vectorService = null;

/**
 * Initialize the vector service lazily with the app's sequelize instance
 */
function getVectorService(sequelize) {
    if (!_vectorService && sequelize) {
        _vectorService = new VectorSearchService(sequelize);
    }
    return _vectorService;
}

/**
 * Generate embedding from text using the configured embedding endpoint.
 * Falls back to a simple hash-based mock if no embedding service is available.
 *
 * In production, this should call BGE-M3 or another embedding model API.
 * @param {string} text - Text to embed
 * @returns {number[]} - 1024-dimensional embedding vector
 */
async function generateEmbedding(text) {
    // Try local embedding service (Aurelia's embedding server on port 8764)
    try {
        const response = await fetch('http://localhost:8764/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, model: 'bge-m3' }),
            signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
            const data = await response.json();
            return data.embedding;
        }
    } catch (e) {
        // Embedding service not available, fall back
    }

    // Try Anthropic-compatible embedding API if configured
    if (process.env.EMBEDDING_API_URL) {
        try {
            const response = await fetch(process.env.EMBEDDING_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.EMBEDDING_API_KEY || ''}`,
                },
                body: JSON.stringify({ input: text }),
                signal: AbortSignal.timeout(10000),
            });

            if (response.ok) {
                const data = await response.json();
                return data.data?.[0]?.embedding || data.embedding;
            }
        } catch (e) {
            // Fall through to mock
        }
    }

    // Mock embedding for development (deterministic hash-based)
    console.warn('semanticSearch: No embedding service available, using mock embeddings');
    return mockEmbedding(text, 1024);
}

/**
 * Deterministic mock embedding for development/testing
 */
function mockEmbedding(text, dim = 1024) {
    const embedding = new Array(dim);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }

    for (let i = 0; i < dim; i++) {
        hash = ((hash << 5) - hash) + i;
        hash = hash & hash;
        embedding[i] = (hash % 1000) / 1000.0;
    }

    // Normalize to unit vector
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / norm);
}

/**
 * Semantic search middleware factory
 * @param {string} entityType - The entity type to search (vendor, venue, menu, etc.)
 * @param {object} options - Additional options
 * @returns {Function} Express middleware
 */
function semanticSearch(entityType, options = {}) {
    return async (req, res, next) => {
        const query = req.query.q || req.query.query || req.query.search;

        if (!query) {
            req.semanticResults = { results: [], query: null, error: 'No search query provided (use ?q=...)' };
            return next();
        }

        try {
            const sequelize = req.app.get('sequelize');
            const vectorService = getVectorService(sequelize);

            if (!vectorService) {
                req.semanticResults = { results: [], query, error: 'Vector service not initialized' };
                return next();
            }

            // Ensure initialized
            if (!vectorService.initialized) {
                await vectorService.initialize();
            }

            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(query);

            // Build filters from query params
            const filters = {};
            if (req.query.lang || req.query.language) {
                filters.language = req.query.lang || req.query.language;
            }
            if (req.query.region) {
                filters.region = req.query.region;
            }

            const limit = parseInt(req.query.limit) || options.defaultLimit || 10;

            // Perform vector search
            const results = await vectorService.searchSimilar(
                entityType,
                queryEmbedding,
                limit,
                filters
            );

            req.semanticResults = {
                results,
                query,
                count: results.length,
                entityType,
            };

            next();
        } catch (error) {
            console.error('Semantic search error:', error.message);
            req.semanticResults = { results: [], query, error: error.message };
            next();
        }
    };
}

/**
 * Middleware to index an entity after creation/update
 * @param {string} entityType - The entity type
 * @param {Function} textExtractor - Function to extract searchable text from req.body
 * @returns {Function} Express middleware
 */
function indexEntity(entityType, textExtractor) {
    return async (req, res, next) => {
        // Run indexing after response is sent (non-blocking)
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const sequelize = req.app.get('sequelize');
                    const vectorService = getVectorService(sequelize);

                    if (!vectorService || !vectorService.initialized) return;

                    const text = textExtractor(req.body, req.params);
                    if (!text) return;

                    const embedding = await generateEmbedding(text);
                    const entityId = req.params.id || req.body.id;

                    if (entityId) {
                        await vectorService.upsertEmbedding(
                            entityType,
                            entityId,
                            embedding,
                            req.body.metadata || {},
                            text,
                            req.body.language || 'fr'
                        );
                    }
                } catch (error) {
                    console.error('Entity indexing error:', error.message);
                }
            }
        });

        next();
    };
}

module.exports = {
    semanticSearch,
    indexEntity,
    getVectorService,
    generateEmbedding,
};
