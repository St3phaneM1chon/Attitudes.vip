# Guide de Monitoring - Attitudes.vip

## 🎯 Vue d'ensemble

Le système de monitoring Attitudes.vip utilise la stack Prometheus/Grafana pour surveiller:
- Les performances de l'application
- L'infrastructure et les containers
- Les métriques métier
- Les logs et traces

## 🚀 Démarrage rapide

### 1. Lancer la stack de monitoring

```bash
# Créer le réseau Docker si nécessaire
docker network create attitudes_network

# Lancer tous les services de monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Accéder aux interfaces

- **Grafana**: http://localhost:3001
  - Login: `admin`
  - Password: `attitudes123`
  
- **Prometheus**: http://localhost:9090
  
- **AlertManager**: http://localhost:9093

### 3. Configurer l'application

Dans votre `app.js`, ajouter :

```javascript
const { 
  prometheusMiddleware, 
  metricsEndpoint,
  instrumentServices,
  startBusinessMetricsCollection
} = require('./monitoring/prometheus-config');

// Ajouter le middleware de métriques
app.use(prometheusMiddleware());

// Exposer l'endpoint des métriques
app.get('/metrics', metricsEndpoint());

// Instrumenter les services
instrumentServices({
  cache: redisService,
  websocket: wsServer,
  stripe: stripeService
});

// Démarrer la collecte des métriques métier
startBusinessMetricsCollection(db);
```

## 📊 Métriques collectées

### Métriques HTTP
- `attitudes_http_requests_total` - Total des requêtes HTTP
- `attitudes_http_request_duration_seconds` - Durée des requêtes
- `attitudes_api_latency_seconds` - Latence des endpoints API

### Métriques Base de données
- `attitudes_db_query_duration_seconds` - Durée des requêtes DB
- `attitudes_db_connection_pool_size` - Taille du pool de connexions

### Métriques Redis
- `attitudes_redis_cache_hits_total` - Cache hits
- `attitudes_redis_cache_misses_total` - Cache misses

### Métriques WebSocket
- `attitudes_websocket_connections` - Connexions actives
- `attitudes_websocket_messages_total` - Messages échangés

### Métriques Métier
- `attitudes_weddings_created_total` - Mariages créés
- `attitudes_vendor_bookings_total` - Réservations vendors
- `attitudes_payment_transactions_total` - Transactions
- `attitudes_guest_invitations_total` - Invitations

## 🔔 Alertes configurées

### Alertes Critiques
- API Down (2 min)
- PostgreSQL/Redis Down
- Taux d'erreur > 5%
- Échecs de paiement

### Alertes Warning
- CPU > 80%
- Mémoire > 85%
- Temps de réponse > 1s
- Cache hit rate < 80%

### Configuration des alertes

Modifier `/monitoring/alertmanager.yml` pour :
- Configurer SMTP
- Ajouter webhook Slack
- Configurer PagerDuty

## 📈 Dashboards Grafana

### 1. Overview Dashboard
Vue d'ensemble de l'application :
- Taux de requêtes par status code
- Temps de réponse P95
- Taux de succès
- Utilisateurs actifs
- Performance cache

### 2. Business Dashboard
Métriques métier :
- Mariages créés
- Réservations par type de vendor
- Revenus et paiements
- Activité des invités

### 3. Infrastructure Dashboard
Santé du système :
- CPU/Mémoire/Disque
- Santé des containers
- Trafic réseau
- Logs d'erreur

## 🛠️ Utilisation avancée

### Ajouter une métrique personnalisée

```javascript
const { recordBusinessMetrics } = require('./monitoring/prometheus-config');

// Dans votre code
recordBusinessMetrics.weddingCreated();
recordBusinessMetrics.vendorBooked('photographer', 'confirmed');
recordBusinessMetrics.paymentProcessed('succeeded', 'payment', 'stripe', 2500);
```

### Requêtes Prometheus utiles

```promql
# Taux d'erreur sur 5 min
rate(attitudes_http_requests_total{status_code=~"5.."}[5m])

# Temps de réponse P95
histogram_quantile(0.95, 
  sum(rate(attitudes_http_request_duration_seconds_bucket[5m])) by (le)
)

# Revenus du jour
sum(increase(attitudes_payment_amount_euros_sum{status="succeeded"}[24h]))

# Utilisateurs actifs par heure
attitudes_active_users[1h]
```

### Créer un nouveau dashboard

1. Dans Grafana, aller à "Create" > "Dashboard"
2. Ajouter des panels avec les requêtes Prometheus
3. Sauvegarder dans le dossier "Attitudes.vip"
4. Exporter en JSON dans `/monitoring/grafana/dashboards/`

## 🔍 Debugging

### Vérifier que les métriques sont exposées

```bash
curl http://localhost:3000/metrics
```

### Vérifier Prometheus

```bash
# Targets actives
curl http://localhost:9090/api/v1/targets

# Requête de test
curl http://localhost:9090/api/v1/query?query=up
```

### Logs des services

```bash
# Voir tous les logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Service spécifique
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
```

## 🚨 Troubleshooting

### Prometheus ne collecte pas les métriques
1. Vérifier que l'app expose `/metrics`
2. Vérifier la configuration dans `prometheus.yml`
3. Vérifier le réseau Docker

### Grafana ne se connecte pas à Prometheus
1. Vérifier les datasources dans Grafana
2. Utiliser le nom de service Docker (`prometheus:9090`)
3. Vérifier le réseau

### Alertes non envoyées
1. Vérifier la configuration SMTP/Slack
2. Vérifier les logs d'AlertManager
3. Tester avec `amtool`

## 📚 Ressources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Grafana Dashboard Gallery](https://grafana.com/grafana/dashboards/)