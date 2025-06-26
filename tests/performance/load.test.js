const autocannon = require('autocannon');
const { app } = require('../../src/auth/auth-service');

describe('Performance Tests', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Tests de charge - Authentification', () => {
    it('devrait gérer 1000 requêtes de connexion simultanées', async () => {
      const result = await autocannon({
        url: `${baseUrl}/auth/login`,
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@attitudes.vip',
          password: 'Password123!'
        }),
        connections: 100,
        duration: 10,
        pipelining: 10
      });

      // Vérifier les métriques de performance
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(50); // 50 req/s minimum
      expect(result.latency.p99).toBeLessThan(1000); // 99% des requêtes < 1s
    });

    it('devrait gérer 500 requêtes d\'inscription simultanées', async () => {
      const result = await autocannon({
        url: `${baseUrl}/auth/register`,
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        setupClient: (client) => {
          // Générer des emails uniques pour chaque requête
          let counter = 0;
          client.setBody(JSON.stringify({
            email: `perf${counter++}@attitudes.vip`,
            password: 'Password123!',
            firstName: 'Marie',
            lastName: 'Dupont',
            role: 'customer'
          }));
        },
        connections: 50,
        duration: 10,
        pipelining: 10
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(25); // 25 req/s minimum
      expect(result.latency.p99).toBeLessThan(2000); // 99% des requêtes < 2s
    });
  });

  describe('Tests de charge - API REST', () => {
    it('devrait gérer 2000 requêtes GET simultanées', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/health`,
        method: 'GET',
        connections: 200,
        duration: 10,
        pipelining: 10
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.requests.average).toBeGreaterThan(100); // 100 req/s minimum
      expect(result.latency.p99).toBeLessThan(500); // 99% des requêtes < 500ms
    });

    it('devrait gérer 1000 requêtes POST simultanées', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/data`,
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          data: 'test-data',
          timestamp: Date.now()
        }),
        connections: 100,
        duration: 10,
        pipelining: 10
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(50); // 50 req/s minimum
      expect(result.latency.p99).toBeLessThan(1000); // 99% des requêtes < 1s
    });
  });

  describe('Tests de mémoire', () => {
    it('ne devrait pas avoir de fuites mémoire lors de requêtes répétées', async () => {
      const initialMemory = process.memoryUsage();
      
      // Effectuer 1000 requêtes
      for (let i = 0; i < 1000; i++) {
        await fetch(`${baseUrl}/api/health`);
      }
      
      const finalMemory = process.memoryUsage();
      
      // Vérifier que l'utilisation mémoire n'a pas augmenté de plus de 50MB
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    it('devrait libérer la mémoire après les requêtes', async () => {
      const initialMemory = process.memoryUsage();
      
      // Effectuer des requêtes avec des données volumineuses
      for (let i = 0; i < 100; i++) {
        await fetch(`${baseUrl}/api/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: 'x'.repeat(10000), // 10KB de données
            timestamp: Date.now()
          })
        });
      }
      
      // Forcer le garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Vérifier que la mémoire a été libérée
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });

  describe('Tests de CPU', () => {
    it('ne devrait pas surcharger le CPU lors de requêtes intensives', async () => {
      const startTime = Date.now();
      const startCpu = process.cpuUsage();
      
      // Effectuer des requêtes intensives
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          fetch(`${baseUrl}/api/health`).then(res => res.json())
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const endCpu = process.cpuUsage();
      
      const duration = endTime - startTime;
      const cpuUsage = endCpu.user - startCpu.user;
      
      // Vérifier que le CPU n'a pas été surchargé
      const cpuPercentage = (cpuUsage / (duration * 1000)) * 100;
      expect(cpuPercentage).toBeLessThan(80); // 80% maximum
    });
  });

  describe('Tests de base de données', () => {
    it('devrait gérer les requêtes de base de données concurrentes', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/users`,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        },
        connections: 50,
        duration: 10,
        pipelining: 5
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(20); // 20 req/s minimum
      expect(result.latency.p99).toBeLessThan(2000); // 99% des requêtes < 2s
    });

    it('devrait gérer les écritures de base de données concurrentes', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/users`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        setupClient: (client) => {
          let counter = 0;
          client.setBody(JSON.stringify({
            email: `db-test${counter++}@attitudes.vip`,
            firstName: 'Test',
            lastName: 'User',
            role: 'customer'
          }));
        },
        connections: 20,
        duration: 10,
        pipelining: 2
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(5); // 5 req/s minimum
      expect(result.latency.p99).toBeLessThan(5000); // 99% des requêtes < 5s
    });
  });

  describe('Tests de cache Redis', () => {
    it('devrait utiliser efficacement le cache Redis', async () => {
      // Première requête (cache miss)
      const startTime1 = Date.now();
      await fetch(`${baseUrl}/api/cached-data`);
      const duration1 = Date.now() - startTime1;
      
      // Deuxième requête (cache hit)
      const startTime2 = Date.now();
      await fetch(`${baseUrl}/api/cached-data`);
      const duration2 = Date.now() - startTime2;
      
      // La deuxième requête devrait être plus rapide grâce au cache
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(duration1 * 0.5); // Au moins 2x plus rapide
    });

    it('devrait gérer les requêtes cache concurrentes', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/cached-data`,
        method: 'GET',
        connections: 100,
        duration: 10,
        pipelining: 10
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(200); // 200 req/s minimum
      expect(result.latency.p99).toBeLessThan(100); // 99% des requêtes < 100ms
    });
  });

  describe('Tests de réseau', () => {
    it('devrait gérer les connexions réseau instables', async () => {
      // Simuler des connexions instables
      const result = await autocannon({
        url: `${baseUrl}/api/health`,
        method: 'GET',
        connections: 50,
        duration: 10,
        pipelining: 1,
        timeout: 5,
        setupClient: (client) => {
          // Simuler des délais aléatoires
          client.setTimeout(Math.random() * 5000);
        }
      });

      expect(result.errors).toBeLessThan(10); // Moins de 10% d'erreurs
      expect(result.timeouts).toBeLessThan(5); // Moins de 5 timeouts
    });

    it('devrait gérer les requêtes avec des payloads volumineux', async () => {
      const largePayload = {
        data: 'x'.repeat(100000), // 100KB
        timestamp: Date.now(),
        metadata: {
          size: 100000,
          type: 'large-payload'
        }
      };

      const result = await autocannon({
        url: `${baseUrl}/api/large-data`,
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(largePayload),
        connections: 10,
        duration: 10,
        pipelining: 1
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(1); // 1 req/s minimum
      expect(result.latency.p99).toBeLessThan(10000); // 99% des requêtes < 10s
    });
  });

  describe('Tests de scalabilité', () => {
    it('devrait maintenir les performances avec l\'augmentation de la charge', async () => {
      const loadLevels = [10, 50, 100, 200];
      const results = [];

      for (const connections of loadLevels) {
        const result = await autocannon({
          url: `${baseUrl}/api/health`,
          method: 'GET',
          connections,
          duration: 5,
          pipelining: 1
        });

        results.push({
          connections,
          requestsPerSecond: result.requests.average,
          latency: result.latency.p99
        });
      }

      // Vérifier que les performances ne se dégradent pas trop
      for (let i = 1; i < results.length; i++) {
        const previous = results[i - 1];
        const current = results[i];
        
        // La latence ne devrait pas augmenter de plus de 50%
        const latencyIncrease = (current.latency - previous.latency) / previous.latency;
        expect(latencyIncrease).toBeLessThan(0.5);
      }
    });

    it('devrait gérer les pics de charge', async () => {
      // Créer un pic de charge soudain
      const result = await autocannon({
        url: `${baseUrl}/api/health`,
        method: 'GET',
        connections: 500,
        duration: 30,
        pipelining: 10,
        setupClient: (client) => {
          // Créer un pic après 10 secondes
          setTimeout(() => {
            client.setConnections(1000);
          }, 10000);
        }
      });

      expect(result.errors).toBeLessThan(50); // Moins de 50 erreurs
      expect(result.timeouts).toBeLessThan(20); // Moins de 20 timeouts
      expect(result.requests.average).toBeGreaterThan(100); // 100 req/s minimum
    });
  });

  describe('Tests de monitoring', () => {
    it('devrait exposer les métriques de performance', async () => {
      const response = await fetch(`${baseUrl}/metrics`);
      const metrics = await response.text();
      
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('http_requests_in_flight');
      expect(metrics).toContain('process_cpu_seconds_total');
      expect(metrics).toContain('process_resident_memory_bytes');
    });

    it('devrait tracer les requêtes lentes', async () => {
      // Effectuer une requête lente
      const startTime = Date.now();
      await fetch(`${baseUrl}/api/slow-operation`);
      const duration = Date.now() - startTime;
      
      // Vérifier que la requête lente a été tracée
      const metrics = await fetch(`${baseUrl}/metrics`).then(res => res.text());
      expect(metrics).toContain('http_request_duration_seconds');
      
      // La durée devrait être supérieure à 1 seconde
      expect(duration).toBeGreaterThan(1000);
    });
  });
}); 