#!/usr/bin/env node

/**
 * Serveur MCP pour Perplexity AI
 * Utilise l'API Perplexity pour les recherches avancées
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

class PerplexityServer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.server = new Server(
      {
        name: 'perplexity-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Liste des outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'perplexity_search',
            description: 'Search using Perplexity AI for comprehensive, up-to-date information',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to send to Perplexity'
                },
                model: {
                  type: 'string',
                  description: 'Model to use (llama-3.1-sonar-small-128k-online, llama-3.1-sonar-large-128k-online, llama-3.1-sonar-huge-128k-online)',
                  default: 'llama-3.1-sonar-large-128k-online'
                },
                max_tokens: {
                  type: 'integer',
                  description: 'Maximum tokens in response',
                  default: 1000
                },
                temperature: {
                  type: 'number',
                  description: 'Temperature for response randomness (0.0-2.0)',
                  default: 0.2
                }
              },
              required: ['query']
            }
          },
          {
            name: 'perplexity_chat',
            description: 'Have a conversation with Perplexity AI for detailed analysis and reasoning',
            inputSchema: {
              type: 'object',
              properties: {
                messages: {
                  type: 'array',
                  description: 'Array of messages for conversation',
                  items: {
                    type: 'object',
                    properties: {
                      role: {
                        type: 'string',
                        enum: ['system', 'user', 'assistant']
                      },
                      content: {
                        type: 'string'
                      }
                    },
                    required: ['role', 'content']
                  }
                },
                model: {
                  type: 'string',
                  description: 'Model to use for chat',
                  default: 'llama-3.1-sonar-large-128k-online'
                }
              },
              required: ['messages']
            }
          }
        ]
      };
    });

    // Gestionnaire d'appel d'outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'perplexity_search':
          return this.handleSearch(request.params.arguments);
        
        case 'perplexity_chat':
          return this.handleChat(request.params.arguments);
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async handleSearch(args) {
    try {
      const { query, model = 'llama-3.1-sonar-large-128k-online', max_tokens = 1000, temperature = 0.2 } = args;

      if (!query) {
        throw new McpError(ErrorCode.InvalidParams, 'Query is required');
      }

      // Construire la requête pour Perplexity
      const response = await this.callPerplexityAPI({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Provide comprehensive, accurate, and up-to-date information. Include sources when available.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: max_tokens,
        temperature: temperature,
        stream: false
      });

      return {
        content: [
          {
            type: 'text',
            text: `# Perplexity Search Results\n\n**Query:** ${query}\n\n**Response:**\n\n${response.choices[0].message.content}\n\n**Model Used:** ${model}\n**Tokens Used:** ${response.usage?.total_tokens || 'N/A'}`
          }
        ]
      };

    } catch (error) {
      console.error('Perplexity search error:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Perplexity search failed: ${error.message}`
      );
    }
  }

  async handleChat(args) {
    try {
      const { messages, model = 'llama-3.1-sonar-large-128k-online' } = args;

      if (!messages || !Array.isArray(messages)) {
        throw new McpError(ErrorCode.InvalidParams, 'Messages array is required');
      }

      const response = await this.callPerplexityAPI({
        model: model,
        messages: messages,
        stream: false
      });

      return {
        content: [
          {
            type: 'text',
            text: response.choices[0].message.content
          }
        ]
      };

    } catch (error) {
      console.error('Perplexity chat error:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Perplexity chat failed: ${error.message}`
      );
    }
  }

  async callPerplexityAPI(payload) {
    try {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Attitudes.vip MCP Server/1.0'
        },
        timeout: 30000 // 30 secondes
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || 'Perplexity API error');
      }

      return response.data;

    } catch (error) {
      if (error.response) {
        throw new Error(`Perplexity API error ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('No response from Perplexity API - check your connection');
      } else {
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Perplexity MCP server running on stdio');
  }
}

// Point d'entrée
async function main() {
  const apiKey = process.argv[2] || process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('Error: Perplexity API key is required');
    console.error('Usage: node perplexity-server.js <api-key>');
    console.error('Or set PERPLEXITY_API_KEY environment variable');
    process.exit(1);
  }

  try {
    const server = new PerplexityServer(apiKey);
    await server.run();
  } catch (error) {
    console.error('Failed to start Perplexity MCP server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerplexityServer;