# 🔌 Guide d'Intégration WebSocket - AttitudesFramework

## Vue d'ensemble

L'interface WebSocket fournit des communications temps réel pour toutes les fonctionnalités interactives d'AttitudesFramework : messages instantanés, demandes DJ, notifications, mises à jour de tâches, et présence en ligne.

## 🏗️ Architecture

### Serveur WebSocket

```
server/websocket-server.js       # Point d'entrée du serveur
  └── WebSocketServer            # Classe principale
       ├── Authentification JWT
       ├── Gestion multi-tenant
       ├── Rate limiting
       └── Métriques

src/services/websocket/
  ├── websocket-server.js       # Logique serveur
  └── websocket-client.js       # Client JavaScript
```

### Client React

```
src/hooks/
  ├── useWebSocket.js          # Hook principal
  ├── useMessages.js           # Hook messages (exporté)
  ├── useDJWebSocket.js        # Hook DJ (exporté)
  └── usePhotoStream.js        # Hook photos (exporté)
```

## 🚀 Installation et Configuration

### 1. Installation des dépendances

```bash
# Backend
npm install socket.io jsonwebtoken ioredis

# Frontend  
npm install socket.io-client
```

### 2. Variables d'environnement

```bash
# .env - Backend
WS_PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,https://staging.attitudes.vip

# .env - Frontend
REACT_APP_WS_URL=http://localhost:3001
```

### 3. Lancement du serveur

```bash
# Développement
npm run ws:dev

# Production
pm2 start server/websocket-server.js --name ws-server
```

## 📡 Utilisation dans React

### Hook principal - useWebSocket

```javascript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { 
    isConnected, 
    onlineUsers,
    sendMessage,
    on 
  } = useWebSocket();

  useEffect(() => {
    // Écouter un événement
    const unsubscribe = on('new_message', (message) => {
      console.log('Nouveau message:', message);
    });

    return unsubscribe; // Cleanup
  }, [on]);

  const handleSend = async () => {
    try {
      await sendMessage(recipientId, 'Hello!');
    } catch (error) {
      console.error('Erreur envoi:', error);
    }
  };

  return (
    <div>
      {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
      <p>Utilisateurs en ligne: {onlineUsers.length}</p>
    </div>
  );
}
```

### Hook Messages - useMessages

```javascript
import { useMessages } from '@/hooks/useWebSocket';

function ChatComponent({ recipientId }) {
  const { messages, typing, sendMessage, sendTyping } = useMessages(recipientId);

  const handleTyping = (e) => {
    sendTyping(true);
    // Debounce pour arrêter typing après 1s
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => sendTyping(false), 1000);
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {typing[recipientId] && <p>En train d'écrire...</p>}
    </div>
  );
}
```

### Hook DJ - useDJWebSocket

```javascript
import { useDJWebSocket } from '@/hooks/useWebSocket';

function DJDashboard() {
  const { 
    musicRequests, 
    micRequests, 
    acceptMusic, 
    rejectMusic,
    approveMic 
  } = useDJWebSocket();

  return (
    <div>
      <h3>Demandes musicales ({musicRequests.length})</h3>
      {musicRequests.map(request => (
        <div key={request.id}>
          <p>{request.song_title} - {request.artist}</p>
          <button onClick={() => acceptMusic(request.id)}>✓</button>
          <button onClick={() => rejectMusic(request.id)}>✗</button>
        </div>
      ))}

      {micRequests.length > 0 && (
        <div className="urgent-alert">
          <h3>⚠️ Demande de micro!</h3>
          {micRequests[0].purpose}
          <button onClick={() => approveMic(micRequests[0].id)}>
            Approuver
          </button>
        </div>
      )}
    </div>
  );
}
```

## 📨 Événements disponibles

### Événements émis par le client

| Événement | Description | Données |
|-----------|-------------|---------|
| `send_message` | Envoyer un message | `{ recipientId, content, channel }` |
| `typing` | Indicateur de frappe | `{ recipientId, isTyping }` |
| `music_request` | Demande musicale | `{ songTitle, artist, dedicatedTo }` |
| `mic_request` | Demande de micro | `{ purpose, duration }` |
| `new_photo` | Upload photo | `{ url, caption }` |
| `task_update` | Mise à jour tâche | `{ taskId, updates }` |
| `update_presence` | Statut présence | `{ status, customStatus }` |

### Événements reçus par le client

| Événement | Description | Données |
|-----------|-------------|---------|
| `connected` | Connexion établie | `{ userId, userName, weddingId }` |
| `new_message` | Message reçu | `{ id, content, senderName, ... }` |
| `user_online` | Utilisateur connecté | `{ userId, userName, role }` |
| `user_offline` | Utilisateur déconnecté | `{ userId, userName }` |
| `music_request` | Nouvelle demande (DJ) | `{ id, song_title, artist, ... }` |
| `mic_request` | Demande micro urgente | `{ id, purpose, urgent: true }` |
| `task_updated` | Tâche mise à jour | `{ task, updatedBy }` |

## 🔐 Sécurité

### Authentification JWT

Chaque connexion nécessite un token JWT valide :

```javascript
// Client
const wsClient = getWebSocketClient();
await wsClient.connect(authToken);

// Serveur vérifie
jwt.verify(token, process.env.JWT_SECRET);
```

### Isolation multi-tenant

Les utilisateurs ne reçoivent que les événements de leur mariage :

```javascript
// Serveur
socket.join(`wedding:${socket.weddingId}`);
socket.to(`wedding:${weddingId}`).emit('event', data);
```

### Rate limiting

Protection contre le spam :
- Max 100 connexions/minute par IP
- Max 50 messages/minute par utilisateur

## 🎯 Cas d'usage spécifiques

### 1. Invité demandant une chanson

```javascript
function GuestMusicRequest() {
  const { requestMusic } = useWebSocket();

  const handleRequest = async () => {
    try {
      await requestMusic(
        "Bohemian Rhapsody",
        "Queen",
        "Pour les mariés!"
      );
      toast.success('Demande envoyée au DJ!');
    } catch (error) {
      toast.error('Erreur lors de la demande');
    }
  };
}
```

### 2. Notification temps réel de tâche

```javascript
function TaskNotifications() {
  const { on } = useWebSocket();

  useEffect(() => {
    const unsubscribe = on('task_assigned', (data) => {
      // Notification browser
      new Notification('Nouvelle tâche assignée', {
        body: data.message,
        icon: '/logo.png'
      });
    });

    return unsubscribe;
  }, [on]);
}
```

### 3. Présence en ligne

```javascript
function OnlineStatus() {
  const { onlineUsers, updatePresence } = useWebSocket();

  // Mettre à jour le statut
  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence('online');
    }, 30000); // Heartbeat 30s

    return () => clearInterval(interval);
  }, [updatePresence]);

  return (
    <div className="online-users">
      {onlineUsers.map(user => (
        <div key={user.userId}>
          <span className="online-dot">●</span>
          {user.userName}
        </div>
      ))}
    </div>
  );
}
```

## 🧪 Tests

### Tests unitaires

```javascript
// tests/websocket.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocket } from '@/hooks/useWebSocket';

test('should connect and disconnect', async () => {
  const { result } = renderHook(() => useWebSocket());
  
  expect(result.current.isConnected).toBe(false);
  
  await act(async () => {
    await result.current.connect('test-token');
  });
  
  expect(result.current.isConnected).toBe(true);
});
```

### Tests E2E

```javascript
// e2e/websocket.e2e.js
describe('WebSocket Real-time', () => {
  it('should receive messages instantly', async () => {
    // Ouvrir 2 fenêtres
    const sender = await browser.newPage();
    const receiver = await browser.newPage();
    
    // Se connecter
    await sender.goto('/login');
    await receiver.goto('/login');
    
    // Envoyer message
    await sender.type('#message', 'Test temps réel');
    await sender.click('#send');
    
    // Vérifier réception
    await receiver.waitForSelector('.message:contains("Test temps réel")');
  });
});
```

## 📊 Monitoring

### Métriques serveur

```javascript
// Endpoint métriques
GET http://localhost:3001/metrics

{
  "totalConnections": 1523,
  "activeConnections": 47,
  "messagesPerMinute": 125,
  "connectedUsers": 47,
  "activeWeddings": 12
}
```

### Dashboard admin

```javascript
function AdminWebSocketDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/ws/metrics');
      setMetrics(await res.json());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>WebSocket Metrics</h3>
      <p>Connexions actives: {metrics?.activeConnections}</p>
      <p>Messages/min: {metrics?.messagesPerMinute}</p>
    </div>
  );
}
```

## 🚨 Troubleshooting

### Problèmes courants

1. **Connexion refusée**
   - Vérifier que le serveur WS est lancé
   - Vérifier l'URL dans REACT_APP_WS_URL
   - Vérifier les CORS

2. **Déconnexions fréquentes**
   - Augmenter pingTimeout/pingInterval
   - Vérifier la stabilité réseau
   - Activer les logs debug

3. **Messages non reçus**
   - Vérifier l'appartenance au bon wedding
   - Vérifier les permissions utilisateur
   - Vérifier la syntaxe des événements

### Debug mode

```javascript
// Activer les logs détaillés
localStorage.setItem('debug', 'socket.io-client:*');

// Côté serveur
DEBUG=socket.io:* node server/websocket-server.js
```

## 🔄 Scaling

### Redis Adapter (multi-serveurs)

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');

io.adapter(createAdapter(pubClient, subClient));
```

### Load balancing

```nginx
upstream websocket {
    ip_hash;
    server ws1.attitudes.vip:3001;
    server ws2.attitudes.vip:3001;
}
```

---

Pour toute question, consultez la documentation Socket.IO ou contactez l'équipe technique.