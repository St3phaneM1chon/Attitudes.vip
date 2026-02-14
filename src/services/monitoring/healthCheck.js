const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class HealthCheckService {
  constructor(config = {}) {
    this.config = config;
    this.checks = new Map();
    this.status = {
      status: 'initializing',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: 0,
      checks: {}
    };

    // Register default health checks
    this.registerCheck('system', this.checkSystem.bind(this));
    this.registerCheck('database', this.checkDatabase.bind(this));
    this.registerCheck('redis', this.checkRedis.bind(this));
    this.registerCheck('diskSpace', this.checkDiskSpace.bind(this));
    this.registerCheck('memory', this.checkMemory.bind(this));
    this.registerCheck('services', this.checkServices.bind(this));
  }

  async initialize() {
    // Start periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, 30000); // Every 30 seconds

    // Run initial health check
    await this.runHealthChecks();
  }

  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  async runHealthChecks() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [name, checkFunction] of this.checks) {
      try {
        const result = await checkFunction();
        results[name] = {
          status: result.status || 'healthy',
          message: result.message,
          details: result.details || {},
          timestamp: new Date().toISOString()
        };

        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: error.message,
          error: error.stack,
          timestamp: new Date().toISOString()
        };
        overallStatus = 'unhealthy';
      }
    }

    this.status = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks: results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname()
      }
    };

    return this.status;
  }

  async checkSystem() {
    const cpuUsage = os.loadavg()[0];
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    let status = 'healthy';
    let message = 'System resources are within normal parameters';

    if (cpuUsage > 4) {
      status = 'degraded';
      message = 'High CPU usage detected';
    } else if (cpuUsage > 8) {
      status = 'unhealthy';
      message = 'Critical CPU usage detected';
    }

    if (memoryUsagePercent > 80) {
      status = 'degraded';
      message = 'High memory usage detected';
    } else if (memoryUsagePercent > 95) {
      status = 'unhealthy';
      message = 'Critical memory usage detected';
    }

    return {
      status,
      message,
      details: {
        cpuLoad: cpuUsage,
        memoryUsagePercent: memoryUsagePercent.toFixed(2),
        freeMemoryMB: Math.round(freeMemory / 1024 / 1024),
        totalMemoryMB: Math.round(totalMemory / 1024 / 1024),
        uptime: process.uptime()
      }
    };
  }

  async checkDatabase() {
    try {
      // This would be replaced with actual database check
      const db = require('../../utils/db');
      const start = Date.now();
      await db.query('SELECT 1');
      const responseTime = Date.now() - start;

      let status = 'healthy';
      let message = 'Database connection is healthy';

      if (responseTime > 1000) {
        status = 'degraded';
        message = 'Database response time is high';
      } else if (responseTime > 5000) {
        status = 'unhealthy';
        message = 'Database response time is critical';
      }

      return {
        status,
        message,
        details: {
          responseTime: `${responseTime}ms`,
          connectionPool: {
            active: db.pool?.numUsed() || 0,
            idle: db.pool?.numFree() || 0,
            total: db.pool?.numTotal() || 0
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        details: {
          error: error.message
        }
      };
    }
  }

  async checkRedis() {
    try {
      const redis = require('../../utils/redis');
      const start = Date.now();
      await redis.ping();
      const responseTime = Date.now() - start;

      const info = await redis.info();
      const memoryUsed = parseInt(info.match(/used_memory:(\d+)/)?.[1] || 0);
      const connectedClients = parseInt(info.match(/connected_clients:(\d+)/)?.[1] || 0);

      let status = 'healthy';
      let message = 'Redis connection is healthy';

      if (responseTime > 100) {
        status = 'degraded';
        message = 'Redis response time is high';
      } else if (responseTime > 500) {
        status = 'unhealthy';
        message = 'Redis response time is critical';
      }

      return {
        status,
        message,
        details: {
          responseTime: `${responseTime}ms`,
          memoryUsedMB: Math.round(memoryUsed / 1024 / 1024),
          connectedClients
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
        details: {
          error: error.message
        }
      };
    }
  }

  async checkDiskSpace() {
    try {
      const { stdout } = await exec("df -h / | awk 'NR==2 {print $5}'");
      const usagePercent = parseInt(stdout.trim().replace('%', ''));

      let status = 'healthy';
      let message = 'Disk space is sufficient';

      if (usagePercent > 80) {
        status = 'degraded';
        message = 'Disk space is running low';
      } else if (usagePercent > 95) {
        status = 'unhealthy';
        message = 'Critical disk space shortage';
      }

      return {
        status,
        message,
        details: {
          diskUsagePercent: usagePercent
        }
      };
    } catch (error) {
      return {
        status: 'unknown',
        message: 'Unable to check disk space',
        details: {
          error: error.message
        }
      };
    }
  }

  async checkMemory() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;

    let status = 'healthy';
    let message = 'Memory usage is normal';

    const heapUsagePercent = (heapUsed / heapTotal) * 100;
    if (heapUsagePercent > 80) {
      status = 'degraded';
      message = 'High heap memory usage';
    } else if (heapUsagePercent > 95) {
      status = 'unhealthy';
      message = 'Critical heap memory usage';
    }

    return {
      status,
      message,
      details: {
        heapUsedMB: Math.round(heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(heapTotal / 1024 / 1024),
        heapUsagePercent: heapUsagePercent.toFixed(2),
        systemMemoryUsedMB: Math.round(usedMemory / 1024 / 1024),
        systemMemoryTotalMB: Math.round(totalMemory / 1024 / 1024)
      }
    };
  }

  async checkServices() {
    const services = {
      authService: { url: 'http://localhost:3001/health', critical: true },
      notificationService: { url: 'http://localhost:3002/health', critical: false },
      paymentService: { url: 'http://localhost:3003/health', critical: true },
      mediaService: { url: 'http://localhost:3004/health', critical: false }
    };

    const results = {};
    let overallStatus = 'healthy';

    for (const [name, config] of Object.entries(services)) {
      try {
        const fetch = require('node-fetch');
        const response = await fetch(config.url, { timeout: 5000 });
        const isHealthy = response.ok;

        results[name] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          statusCode: response.status,
          critical: config.critical
        };

        if (!isHealthy && config.critical) {
          overallStatus = 'unhealthy';
        } else if (!isHealthy && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          critical: config.critical
        };

        if (config.critical) {
          overallStatus = 'unhealthy';
        } else if (overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      }
    }

    return {
      status: overallStatus,
      message: `Services check: ${overallStatus}`,
      details: results
    };
  }

  async getStatus() {
    return this.status;
  }

  // Express route handler for health checks
  getHealthCheckRoute() {
    return async (req, res) => {
      const detailed = req.query.detailed === 'true';
      const status = await this.getStatus();

      const httpStatus = status.status === 'healthy' ? 200 : 
                        status.status === 'degraded' ? 200 : 503;

      if (detailed) {
        res.status(httpStatus).json(status);
      } else {
        res.status(httpStatus).json({
          status: status.status,
          timestamp: status.timestamp
        });
      }
    };
  }

  async shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

module.exports = HealthCheckService;