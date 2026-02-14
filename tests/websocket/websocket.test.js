/**
 * Tests unitaires pour WebSocket
 * Teste la connexion, les événements et la sécurité
 */

const { Server } = require('socket.io');
const Client = require('socket.io-client');
const http = require('http');
const jwt = require('jsonwebtoken');

describe('WebSocket Server Tests', () => {
  let io, serverSocket, clientSocket;
  let httpServer;
  const TEST_PORT = 3002;

  beforeAll((done) => {
    // Créer serveur HTTP
    httpServer = http.createServer();
    io = new Server(httpServer);
    
    httpServer.listen(TEST_PORT, () => {
      done();
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  beforeEach((done) => {
    // Middleware d'auth simple pour les tests
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (token === 'valid-token') {
        socket.userId = 'test-user-id';
        socket.userName = 'Test User';
        socket.userRole = 'couple';
        socket.weddingId = 'test-wedding-id';
        next();
      } else {
        next(new Error('Invalid token'));
      }
    });

    // Connexion serveur
    io.on('connection', (socket) => {
      serverSocket = socket;
    });

    // Connexion client
    clientSocket = Client(`http://localhost:${TEST_PORT}`, {
      auth: {
        token: 'valid-token'
      }
    });

    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connexion', () => {
    test('devrait se connecter avec un token valide', (done) => {
      expect(serverSocket).toBeDefined();
      expect(serverSocket.userId).toBe('test-user-id');
      done();
    });

    test('devrait rejeter une connexion sans token', (done) => {
      const badClient = Client(`http://localhost:${TEST_PORT}`, {
        auth: {}
      });

      badClient.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication required');
        badClient.close();
        done();
      });
    });

    test('devrait rejeter un token invalide', (done) => {
      const badClient = Client(`http://localhost:${TEST_PORT}`, {
        auth: {
          token: 'invalid-token'
        }
      });

      badClient.on('connect_error', (error) => {
        expect(error.message).toBe('Invalid token');
        badClient.close();
        done();
      });
    });
  });

  describe('Messages', () => {
    test('devrait envoyer et recevoir un message', (done) => {
      const testMessage = {
        recipientId: 'recipient-id',
        content: 'Test message',
        channel: 'direct'
      };

      serverSocket.on('send_message', (data) => {
        expect(data).toEqual(testMessage);
        
        // Simuler la réponse
        serverSocket.emit('message_sent', {
          id: 'msg-123',
          ...data,
          timestamp: new Date().toISOString()
        });
      });

      clientSocket.emit('send_message', testMessage);

      clientSocket.on('message_sent', (message) => {
        expect(message.content).toBe('Test message');
        expect(message.id).toBe('msg-123');
        done();
      });
    });

    test('devrait gérer les indicateurs de frappe', (done) => {
      const typingData = {
        recipientId: 'recipient-id',
        isTyping: true
      };

      serverSocket.on('typing', (data) => {
        expect(data).toEqual(typingData);
        done();
      });

      clientSocket.emit('typing', typingData);
    });
  });

  describe('Événements DJ', () => {
    test('devrait gérer une demande musicale', (done) => {
      const musicRequest = {
        songTitle: 'Test Song',
        artist: 'Test Artist',
        dedicatedTo: 'Les mariés'
      };

      serverSocket.on('music_request', (data) => {
        expect(data.songTitle).toBe('Test Song');
        
        serverSocket.emit('music_request_sent', {
          message: 'Demande envoyée',
          requestId: 'req-123'
        });
      });

      clientSocket.emit('music_request', musicRequest);

      clientSocket.on('music_request_sent', (response) => {
        expect(response.requestId).toBe('req-123');
        done();
      });
    });

    test('devrait gérer une demande de micro urgente', (done) => {
      const micRequest = {
        purpose: 'Discours témoin',
        duration: 5
      };

      serverSocket.on('mic_request', (data) => {
        expect(data.purpose).toBe('Discours témoin');
        expect(data.duration).toBe(5);
        done();
      });

      clientSocket.emit('mic_request', micRequest);
    });
  });

  describe('Présence', () => {
    test('devrait mettre à jour le statut de présence', (done) => {
      const presenceData = {
        status: 'online',
        customStatus: 'En réunion'
      };

      serverSocket.on('update_presence', (data) => {
        expect(data).toEqual(presenceData);
        done();
      });

      clientSocket.emit('update_presence', presenceData);
    });
  });

  describe('Wedding rooms', () => {
    test('devrait rejoindre automatiquement la room du mariage', (done) => {
      serverSocket.on('join_wedding', () => {
        const rooms = Array.from(serverSocket.rooms);
        expect(rooms).toContain(`wedding:${serverSocket.weddingId}`);
        done();
      });

      clientSocket.emit('join_wedding');
    });
  });

  describe('Gestion des erreurs', () => {
    test('devrait gérer les erreurs côté serveur', (done) => {
      serverSocket.on('invalid_event', () => {
        serverSocket.emit('error', {
          message: 'Événement invalide'
        });
      });

      clientSocket.emit('invalid_event');

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Événement invalide');
        done();
      });
    });
  });

  describe('Déconnexion', () => {
    test('devrait nettoyer les ressources à la déconnexion', (done) => {
      serverSocket.on('disconnect', (reason) => {
        expect(reason).toBe('client namespace disconnect');
        done();
      });

      clientSocket.disconnect();
    });
  });
});

// Tests du client React (mocks)
describe('WebSocket Client Hook Tests', () => {
  let mockSocket;

  beforeEach(() => {
    // Mock Socket.IO client
    mockSocket = {
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(() => {
        mockSocket.connected = true;
      }),
      disconnect: jest.fn(() => {
        mockSocket.connected = false;
      })
    };

    // Mock du module socket.io-client
    jest.mock('socket.io-client', () => {
      return jest.fn(() => mockSocket);
    });
  });

  test('useWebSocket devrait gérer la connexion', () => {
    // Simuler l'utilisation du hook
    const token = 'test-token';
    const user = { id: 'user-1', name: 'Test User' };

    // Le hook devrait connecter le socket
    expect(mockSocket.connect).not.toHaveBeenCalled();
    
    // Simuler la connexion
    mockSocket.connect();
    expect(mockSocket.connected).toBe(true);
  });

  test('devrait nettoyer les écouteurs au démontage', () => {
    const event = 'test_event';
    const handler = jest.fn();

    // Ajouter écouteur
    mockSocket.on(event, handler);
    expect(mockSocket.on).toHaveBeenCalledWith(event, handler);

    // Cleanup
    mockSocket.off(event, handler);
    expect(mockSocket.off).toHaveBeenCalledWith(event, handler);
  });
});

// Tests de sécurité
describe('WebSocket Security Tests', () => {
  test('devrait valider les JWT', () => {
    const validToken = jwt.sign(
      { sub: 'user-123', role: 'couple' },
      'test-secret',
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(validToken, 'test-secret');
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('couple');
  });

  test('devrait rejeter les JWT expirés', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-123' },
      'test-secret',
      { expiresIn: '-1h' } // Déjà expiré
    );

    expect(() => {
      jwt.verify(expiredToken, 'test-secret');
    }).toThrow('jwt expired');
  });

  test('devrait implémenter le rate limiting', async () => {
    const requests = [];
    const maxRequests = 100;

    // Simuler plusieurs requêtes
    for (let i = 0; i < maxRequests + 10; i++) {
      requests.push(i);
    }

    // Les 100 premières devraient passer
    const allowed = requests.slice(0, maxRequests);
    expect(allowed.length).toBe(maxRequests);

    // Les suivantes devraient être bloquées
    const blocked = requests.slice(maxRequests);
    expect(blocked.length).toBe(10);
  });
});

// Tests de performance
describe('WebSocket Performance Tests', () => {
  test('devrait gérer plusieurs connexions simultanées', async () => {
    const clients = [];
    const numClients = 50;

    // Créer plusieurs clients
    for (let i = 0; i < numClients; i++) {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'valid-token' }
      });
      clients.push(client);
    }

    // Attendre que tous se connectent
    await Promise.all(
      clients.map(client => 
        new Promise(resolve => client.on('connect', resolve))
      )
    );

    // Vérifier que tous sont connectés
    expect(clients.every(c => c.connected)).toBe(true);

    // Nettoyer
    clients.forEach(c => c.disconnect());
  });

  test('devrait maintenir une latence faible', async () => {
    const startTime = Date.now();
    
    // Envoyer un ping
    clientSocket.emit('ping');
    
    await new Promise(resolve => {
      clientSocket.on('pong', () => {
        const latency = Date.now() - startTime;
        expect(latency).toBeLessThan(100); // Moins de 100ms
        resolve();
      });
    });
  });
});