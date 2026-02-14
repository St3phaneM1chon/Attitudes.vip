/**
 * Serveur WebSocket autonome
 * Lance le serveur WebSocket sur un port séparé
 */

const http = require('http');
const WebSocketServer = require('../src/services/websocket/websocket-server');
require('dotenv').config();

const PORT = process.env.WS_PORT || 3001;

// Créer le serveur HTTP
const httpServer = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'websocket',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Initialiser le serveur WebSocket
const wsServer = new WebSocketServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://staging.attitudes.vip',
      'https://attitudes.vip'
    ],
    credentials: true
  }
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('[WS Server] Uncaught Exception:', error);
  // Ne pas crash le serveur
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WS Server] Unhandled Rejection at:', promise, 'reason:', reason);
  // Ne pas crash le serveur
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WS Server] SIGTERM received, shutting down gracefully...');
  await wsServer.shutdown();
  httpServer.close(() => {
    console.log('[WS Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[WS Server] SIGINT received, shutting down gracefully...');
  await wsServer.shutdown();
  httpServer.close(() => {
    console.log('[WS Server] HTTP server closed');
    process.exit(0);
  });
});

// Démarrer le serveur
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     WebSocket Server - AttitudesFramework  ║
╚═══════════════════════════════════════════╝

🚀 Server running on port ${PORT}
📡 WebSocket endpoint: ws://localhost:${PORT}
🏥 Health check: http://localhost:${PORT}/health

Environment: ${process.env.NODE_ENV || 'development'}
`);
});

// Monitoring périodique
setInterval(() => {
  const metrics = wsServer.getMetrics();
  console.log('[WS Server] Metrics:', {
    ...metrics,
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
}, 300000); // Toutes les 5 minutes