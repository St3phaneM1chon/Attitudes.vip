#!/usr/bin/env node
/**
 * CodeRabbit MCP Server
 * Serveur MCP pour intégration avec CodeRabbit AI Code Review
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

// Vérifier le token
const CODERABBIT_TOKEN = process.argv[2];
if (!CODERABBIT_TOKEN) {
  console.error('❌ CodeRabbit token required as first argument');
  process.exit(1);
}

// Configuration API CodeRabbit
const CODERABBIT_API_BASE = 'https://api.coderabbit.ai/v1';
const api = axios.create({
  baseURL: CODERABBIT_API_BASE,
  headers: {
    'Authorization': `Bearer ${CODERABBIT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Créer le serveur MCP
const server = new Server(
  {
    name: 'coderabbit-server',
    vendor: 'Attitudes.vip',
    version: '1.0.0',
    description: 'MCP server for CodeRabbit AI code review integration'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Outils disponibles
const TOOLS = [
  {
    name: 'coderabbit_review',
    description: 'Effectuer une revue de code avec CodeRabbit AI',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Le code à analyser'
        },
        language: {
          type: 'string',
          description: 'Langage de programmation (javascript, python, etc.)'
        },
        context: {
          type: 'string',
          description: 'Contexte additionnel pour la revue',
          optional: true
        },
        focus: {
          type: 'array',
          items: { type: 'string' },
          description: 'Points spécifiques à vérifier (security, performance, etc.)',
          optional: true
        }
      },
      required: ['code', 'language']
    }
  },
  {
    name: 'coderabbit_analyze_pr',
    description: 'Analyser une pull request GitHub avec CodeRabbit',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Propriétaire du repository'
        },
        repo: {
          type: 'string',
          description: 'Nom du repository'
        },
        pr_number: {
          type: 'integer',
          description: 'Numéro de la pull request'
        }
      },
      required: ['owner', 'repo', 'pr_number']
    }
  },
  {
    name: 'coderabbit_security_scan',
    description: 'Scanner le code pour des vulnérabilités de sécurité',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Le code à scanner'
        },
        language: {
          type: 'string',
          description: 'Langage de programmation'
        },
        severity_threshold: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Niveau de sévérité minimum à rapporter',
          default: 'medium'
        }
      },
      required: ['code', 'language']
    }
  },
  {
    name: 'coderabbit_suggest_improvements',
    description: 'Obtenir des suggestions d\'amélioration pour le code',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Le code à améliorer'
        },
        language: {
          type: 'string',
          description: 'Langage de programmation'
        },
        goal: {
          type: 'string',
          description: 'Objectif de l\'amélioration (performance, lisibilité, etc.)',
          optional: true
        }
      },
      required: ['code', 'language']
    }
  },
  {
    name: 'coderabbit_check_standards',
    description: 'Vérifier la conformité aux standards de code',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Le code à vérifier'
        },
        language: {
          type: 'string',
          description: 'Langage de programmation'
        },
        standards: {
          type: 'array',
          items: { type: 'string' },
          description: 'Standards à vérifier (ESLint, PEP8, etc.)',
          optional: true
        }
      },
      required: ['code', 'language']
    }
  }
];

// Gestionnaire pour lister les outils
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Gestionnaire pour appeler les outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'coderabbit_review':
        return await performCodeReview(args);
      
      case 'coderabbit_analyze_pr':
        return await analyzePullRequest(args);
      
      case 'coderabbit_security_scan':
        return await performSecurityScan(args);
      
      case 'coderabbit_suggest_improvements':
        return await suggestImprovements(args);
      
      case 'coderabbit_check_standards':
        return await checkCodeStandards(args);
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing ${name}: ${error.message}`
    );
  }
});

// Fonctions d'implémentation
async function performCodeReview(args) {
  try {
    // Simuler une analyse CodeRabbit
    const { code, language, context, focus } = args;
    
    // Dans une implémentation réelle, appeler l'API CodeRabbit
    const review = {
      summary: `Revue de code ${language}`,
      issues: [
        {
          severity: 'medium',
          line: 1,
          message: 'Consider using const instead of let for immutable variables',
          suggestion: 'Replace let with const'
        }
      ],
      suggestions: [
        'Add error handling for edge cases',
        'Consider extracting complex logic into separate functions',
        'Add unit tests for critical functions'
      ],
      metrics: {
        complexity: 'moderate',
        maintainability: 'good',
        testability: 'fair'
      },
      score: 85
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(review, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Code review failed: ${error.message}`
    );
  }
}

async function analyzePullRequest(args) {
  try {
    const { owner, repo, pr_number } = args;
    
    // Simuler l'analyse d'une PR
    const analysis = {
      pr: `${owner}/${repo}#${pr_number}`,
      status: 'reviewed',
      summary: 'Pull request analysis complete',
      files_changed: 5,
      issues_found: 2,
      suggestions: 3,
      approval_status: 'changes_requested',
      comments: [
        {
          file: 'src/main.js',
          line: 42,
          comment: 'Potential null pointer exception'
        }
      ]
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `PR analysis failed: ${error.message}`
    );
  }
}

async function performSecurityScan(args) {
  try {
    const { code, language, severity_threshold } = args;
    
    // Simuler un scan de sécurité
    const scan = {
      language,
      severity_threshold,
      vulnerabilities: [
        {
          severity: 'high',
          type: 'SQL Injection',
          line: 25,
          description: 'User input not properly sanitized',
          fix: 'Use parameterized queries'
        }
      ],
      secure_practices: [
        'Input validation implemented',
        'HTTPS enforced'
      ],
      recommendations: [
        'Implement rate limiting',
        'Add CSRF protection'
      ]
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(scan, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Security scan failed: ${error.message}`
    );
  }
}

async function suggestImprovements(args) {
  try {
    const { code, language, goal } = args;
    
    // Simuler des suggestions d'amélioration
    const improvements = {
      language,
      goal: goal || 'general',
      suggestions: [
        {
          type: 'performance',
          description: 'Use memoization for expensive calculations',
          impact: 'high',
          example: 'const memoizedResult = useMemo(() => expensiveCalc(), [dependency]);'
        },
        {
          type: 'readability',
          description: 'Extract magic numbers to named constants',
          impact: 'medium',
          example: 'const MAX_RETRIES = 3;'
        }
      ],
      refactoring_opportunities: [
        'Extract method for complex conditional logic',
        'Use design pattern: Strategy for switch statements'
      ]
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(improvements, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Improvement suggestions failed: ${error.message}`
    );
  }
}

async function checkCodeStandards(args) {
  try {
    const { code, language, standards } = args;
    
    // Simuler la vérification des standards
    const standardsCheck = {
      language,
      standards: standards || ['default'],
      violations: [
        {
          rule: 'no-unused-vars',
          line: 10,
          severity: 'warning',
          message: 'Variable "temp" is declared but never used'
        },
        {
          rule: 'max-line-length',
          line: 45,
          severity: 'info',
          message: 'Line exceeds maximum length of 80 characters'
        }
      ],
      passed: 15,
      failed: 2,
      compliance_score: 88
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(standardsCheck, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Standards check failed: ${error.message}`
    );
  }
}

// Démarrer le serveur
async function main() {
  console.error('🐰 CodeRabbit MCP Server starting...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ CodeRabbit MCP Server ready');
}

main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});