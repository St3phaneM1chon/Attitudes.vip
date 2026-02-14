/**
 * Tests d'intégration pour useWebSocketOptimized Hook
 * Tests de reconnexion, performance et gestion d'état
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocketOptimized } from '../../src/hooks/useWebSocketOptimized';
import { io } from 'socket.io-client';

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn()
}));

describe('useWebSocketOptimized Hook Tests', () => {
  let mockSocket;
  let mockEmit;
  let mockOn;
  let mockOff;
  let eventHandlers;

  beforeEach(() => {
    eventHandlers = {};
    mockEmit = jest.fn();
    mockOn = jest.fn((event, handler) => {
      eventHandlers[event] = handler;
      return mockSocket;
    });
    mockOff = jest.fn((event) => {
      delete eventHandlers[event];
      return mockSocket;
    });

    mockSocket = {
      connected: false,
      id: 'socket_123',
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      connect: jest.fn(() => {
        mockSocket.connected = true;
        if (eventHandlers.connect) {
          eventHandlers.connect();
        }
      }),
      disconnect: jest.fn(() => {
        mockSocket.connected = false;
        if (eventHandlers.disconnect) {
          eventHandlers.disconnect();
        }
      }),
      close: jest.fn()
    };

    io.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Connexion initiale', () => {
    it('devrait établir une connexion WebSocket', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          userId: 'user_123',
          weddingId: 'wedding_456'
        })
      );

      // Simuler la connexion
      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(io).toHaveBeenCalledWith('ws://localhost:3000', expect.objectContaining({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        auth: {
          userId: 'user_123',
          weddingId: 'wedding_456'
        }
      }));
    });

    it('devrait gérer les événements de connexion', async () => {
      const onConnect = jest.fn();
      const onDisconnect = jest.fn();

      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          userId: 'user_123',
          onConnect,
          onDisconnect
        })
      );

      // Simuler connexion
      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      expect(onConnect).toHaveBeenCalled();
      expect(result.current.connected).toBe(true);

      // Simuler déconnexion
      act(() => {
        mockSocket.connected = false;
        eventHandlers.disconnect?.();
      });

      expect(onDisconnect).toHaveBeenCalled();
      expect(result.current.connected).toBe(false);
    });
  });

  describe('Émission et réception de messages', () => {
    it('devrait émettre des messages via socket', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      const testData = { message: 'Hello', timestamp: Date.now() };
      
      act(() => {
        result.current.emit('test_event', testData);
      });

      expect(mockEmit).toHaveBeenCalledWith('test_event', testData);
    });

    it('devrait recevoir des messages et appeler les handlers', async () => {
      const messageHandler = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // S'abonner à un événement
      act(() => {
        result.current.on('new_message', messageHandler);
      });

      // Simuler la réception d'un message
      const messageData = { text: 'Test message', from: 'user_456' };
      act(() => {
        eventHandlers.new_message?.(messageData);
      });

      expect(messageHandler).toHaveBeenCalledWith(messageData);
    });

    it('devrait permettre de se désabonner des événements', async () => {
      const messageHandler = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // S'abonner
      act(() => {
        result.current.on('test_event', messageHandler);
      });

      // Se désabonner
      act(() => {
        result.current.off('test_event', messageHandler);
      });

      // Simuler un événement après désabonnement
      act(() => {
        eventHandlers.test_event?.({ data: 'test' });
      });

      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('Reconnexion automatique', () => {
    it('devrait tenter de se reconnecter avec backoff exponentiel', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 16000
        })
      );

      // Simuler une déconnexion
      act(() => {
        mockSocket.connected = false;
        eventHandlers.disconnect?.();
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.metrics.reconnectAttempts).toBe(0);

      // Première tentative après 1s
      jest.advanceTimersByTime(1000);
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);

      // Simuler échec et deuxième tentative après 2s
      act(() => {
        eventHandlers.connect_error?.();
      });
      
      jest.advanceTimersByTime(2000);
      expect(mockSocket.connect).toHaveBeenCalledTimes(2);

      // Troisième tentative après 4s
      act(() => {
        eventHandlers.connect_error?.();
      });
      
      jest.advanceTimersByTime(4000);
      expect(mockSocket.connect).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('devrait arrêter les tentatives après le max', async () => {
      const onReconnectFailed = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          reconnection: true,
          reconnectionAttempts: 3,
          onReconnectFailed
        })
      );

      // Simuler plusieurs échecs de connexion
      for (let i = 0; i < 4; i++) {
        act(() => {
          eventHandlers.connect_error?.();
        });
      }

      expect(result.current.metrics.reconnectAttempts).toBe(3);
      expect(onReconnectFailed).toHaveBeenCalled();
    });
  });

  describe('Queue hors ligne', () => {
    it('devrait mettre en queue les messages hors ligne', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          enableOfflineQueue: true
        })
      );

      // Déconnecter
      act(() => {
        mockSocket.connected = false;
      });

      // Envoyer des messages hors ligne
      act(() => {
        result.current.emit('offline_msg_1', { data: 'test1' });
        result.current.emit('offline_msg_2', { data: 'test2' });
      });

      expect(mockEmit).not.toHaveBeenCalled();
      expect(result.current.metrics.queuedMessages).toBe(2);

      // Reconnecter
      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // Vérifier que les messages sont envoyés
      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledTimes(2);
        expect(mockEmit).toHaveBeenCalledWith('offline_msg_1', { data: 'test1' });
        expect(mockEmit).toHaveBeenCalledWith('offline_msg_2', { data: 'test2' });
      });

      expect(result.current.metrics.queuedMessages).toBe(0);
    });

    it('devrait respecter la taille max de la queue', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          enableOfflineQueue: true,
          maxQueueSize: 2
        })
      );

      act(() => {
        mockSocket.connected = false;
      });

      // Dépasser la taille max
      act(() => {
        result.current.emit('msg1', { data: '1' });
        result.current.emit('msg2', { data: '2' });
        result.current.emit('msg3', { data: '3' }); // Devrait supprimer msg1
      });

      expect(result.current.metrics.queuedMessages).toBe(2);

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      await waitFor(() => {
        expect(mockEmit).toHaveBeenCalledTimes(2);
        expect(mockEmit).not.toHaveBeenCalledWith('msg1', { data: '1' });
      });
    });
  });

  describe('Heartbeat et latence', () => {
    it('devrait gérer les pings/pongs pour la latence', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // Simuler un ping
      const pingTime = Date.now();
      act(() => {
        eventHandlers.ping?.();
      });

      // Simuler le pong après 50ms
      jest.advanceTimersByTime(50);
      act(() => {
        eventHandlers.pong?.();
      });

      expect(result.current.metrics.latency).toBeGreaterThanOrEqual(0);
      expect(result.current.metrics.latency).toBeLessThan(100);
    });

    it('devrait mettre à jour les métriques de latence', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // Simuler plusieurs mesures de latence
      const latencies = [20, 30, 40, 50, 25];
      
      for (const latency of latencies) {
        act(() => {
          eventHandlers.latency?.(latency);
        });
      }

      expect(result.current.metrics.latency).toBe(25); // Dernière valeur
      expect(result.current.metrics.latencyHistory).toHaveLength(5);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de connexion', async () => {
      const onError = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          onError
        })
      );

      const error = new Error('Connection failed');
      act(() => {
        eventHandlers.connect_error?.(error);
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.metrics.errors).toBe(1);
    });

    it('devrait gérer les timeouts de connexion', async () => {
      const onError = jest.fn();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          timeout: 5000,
          onError
        })
      );

      act(() => {
        eventHandlers.connect_timeout?.();
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.metrics.errors).toBe(1);
    });
  });

  describe('Métriques et monitoring', () => {
    it('devrait collecter des métriques complètes', async () => {
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      // Simuler diverses activités
      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      act(() => {
        result.current.emit('test1', { data: 1 });
        result.current.emit('test2', { data: 2 });
      });

      act(() => {
        eventHandlers.message?.({ type: 'chat', text: 'Hello' });
        eventHandlers.message?.({ type: 'notification', text: 'Update' });
      });

      const metrics = result.current.metrics;
      expect(metrics.messagesSent).toBe(2);
      expect(metrics.messagesReceived).toBe(2);
      expect(metrics.totalConnections).toBe(1);
    });
  });

  describe('Nettoyage', () => {
    it('devrait nettoyer correctement au démontage', async () => {
      const { result, unmount } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000')
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // Ajouter des listeners
      const handler = jest.fn();
      act(() => {
        result.current.on('test', handler);
      });

      unmount();

      expect(mockSocket.close).toHaveBeenCalled();
      expect(mockOff).toHaveBeenCalled();
    });

    it('devrait annuler les timers de reconnexion', async () => {
      jest.useFakeTimers();
      
      const { unmount } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          reconnection: true
        })
      );

      // Déclencher une reconnexion
      act(() => {
        mockSocket.connected = false;
        eventHandlers.disconnect?.();
      });

      unmount();

      // Avancer le temps - ne devrait pas déclencher de reconnexion
      jest.advanceTimersByTime(5000);
      expect(mockSocket.connect).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Performance et optimisations', () => {
    it('devrait respecter le throttling des émissions', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => 
        useWebSocketOptimized('ws://localhost:3000', {
          throttleMs: 100
        })
      );

      act(() => {
        mockSocket.connected = true;
        eventHandlers.connect?.();
      });

      // Émettre plusieurs messages rapidement
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.emit('throttled_event', { index: i });
        }
      });

      // Seul le premier devrait passer immédiatement
      expect(mockEmit).toHaveBeenCalledTimes(1);

      // Avancer de 100ms
      jest.advanceTimersByTime(100);
      
      // Le dernier message devrait passer
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenLastCalledWith('throttled_event', { index: 4 });

      jest.useRealTimers();
    });
  });
});