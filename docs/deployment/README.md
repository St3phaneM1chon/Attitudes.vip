# Deployment Guide - Attitudes.vip

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Local Development](#local-development)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Production Deployment](#production-deployment)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive instructions for deploying the Attitudes.vip platform across different environments, from local development to production-grade Kubernetes clusters.

### Deployment Options

- **Local Development**: Docker Compose for rapid development
- **Staging**: Kubernetes on cloud provider
- **Production**: Multi-region Kubernetes with high availability

## Prerequisites

### Required Tools

```bash
# Check versions
node --version          # >= 18.0.0
npm --version          # >= 9.0.0
docker --version       # >= 20.10.0
docker-compose --version # >= 2.0.0
kubectl version        # >= 1.25.0
helm version          # >= 3.10.0
```

### Installation Commands

```bash
# macOS with Homebrew
brew install node
brew install docker
brew install kubectl
brew install helm

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install docker.io docker-compose
sudo snap install kubectl --classic
sudo snap install helm --classic

# Verify installations
npm install -g npm@latest
```

### Required Accounts

- **Supabase**: Database hosting
- **Stripe**: Payment processing
- **Twilio**: SMS notifications
- **SendGrid**: Email service
- **Cloudinary**: Media storage
- **Docker Hub**: Container registry

## Environment Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/attitudes-vip/attitudes-framework.git
cd attitudes-framework

# Install dependencies
npm install
```

### 2. Environment Variables

Create environment files for each environment:

```bash
# Development environment
cp .env.example .env.development

# Staging environment
cp .env.example .env.staging

# Production environment
cp .env.example .env.production
```

#### .env.development

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@localhost:5432/attitudes_vip
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRE=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRE=7d

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@attitudes.vip

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 3. SSL Certificates (Local Development)

```bash
# Generate self-signed certificates for local HTTPS
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -nodes -out certs/cert.pem -keyout certs/key.pem -days 365 \
  -subj "/C=FR/ST=Paris/L=Paris/O=Attitudes/CN=localhost"
```

## Local Development

### 1. Start Dependencies

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

#### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: attitudes_postgres
    environment:
      POSTGRES_DB: attitudes_vip
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    container_name: attitudes_redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: attitudes_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@attitudes.vip
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

  maildev:
    image: maildev/maildev
    container_name: attitudes_maildev
    ports:
      - "1080:1080"
      - "1025:1025"

volumes:
  postgres_data:
  redis_data:
```

### 2. Initialize Database

```bash
# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 3. Start Application

```bash
# Start in development mode with hot reload
npm run dev

# Or use multiple terminals for different services
npm run dev:auth     # Terminal 1: Auth service
npm run dev:api      # Terminal 2: API service
npm run dev:worker   # Terminal 3: Background workers
```

### 4. Access Applications

- **Main App**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **PgAdmin**: http://localhost:5050
- **MailDev**: http://localhost:1080
- **Redis Commander**: http://localhost:8081

## Docker Deployment

### 1. Build Images

```bash
# Build all images
docker-compose build

# Or build specific service
docker-compose build auth-service
```

#### Dockerfile (Multi-stage)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### 2. Docker Compose Production

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: attitudes_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - auth-service
      - api-service

  auth-service:
    build:
      context: .
      dockerfile: Dockerfile.auth
    container_name: attitudes_auth
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  api-service:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: attitudes_api
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  worker-service:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: attitudes_worker
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: attitudes_postgres
    environment:
      POSTGRES_DB: attitudes_vip
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: attitudes_redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale api-service=3

# Stop services
docker-compose down
```

## Kubernetes Deployment

### 1. Prepare Kubernetes Cluster

```bash
# Create namespace
kubectl create namespace attitudes-vip

# Set default namespace
kubectl config set-context --current --namespace=attitudes-vip
```

### 2. Install Prerequisites

```bash
# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.11.0/cert-manager.yaml

# Install NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install Prometheus and Grafana
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

### 3. Create Secrets

```bash
# Create secret for environment variables
kubectl create secret generic attitudes-env \
  --from-env-file=.env.production

# Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=docker.io \
  --docker-username=your-username \
  --docker-password=your-password \
  --docker-email=your-email
```

### 4. Deploy Database (Optional - for non-managed DB)

```yaml
# postgres-deployment.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: attitudes_vip
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: attitudes-env
              key: DB_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: attitudes-env
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - mountPath: /var/lib/postgresql/data
          name: postgres-storage
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 5. Deploy Application

```yaml
# auth-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: auth
        image: attitudes/auth-service:latest
        envFrom:
        - secretRef:
            name: attitudes-env
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 3000
```

### 6. Configure Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: attitudes-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.attitudes.vip
    secretName: attitudes-tls
  rules:
  - host: api.attitudes.vip
    http:
      paths:
      - path: /api/v1/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

### 7. Configure Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 8. Deploy with Helm

Create Helm chart structure:

```bash
# Create Helm chart
helm create attitudes-vip

# Directory structure
attitudes-vip/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── hpa.yaml
```

#### values.yaml

```yaml
replicaCount: 3

image:
  repository: attitudes/app
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: api.attitudes.vip
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: attitudes-tls
      hosts:
        - api.attitudes.vip

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

env:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "3000"

postgresql:
  enabled: true
  auth:
    postgresPassword: secretpassword
    database: attitudes_vip

redis:
  enabled: true
  auth:
    enabled: true
    password: secretpassword
```

Deploy with Helm:

```bash
# Install
helm install attitudes-vip ./attitudes-vip

# Upgrade
helm upgrade attitudes-vip ./attitudes-vip

# Rollback
helm rollback attitudes-vip
```

## Production Deployment

### 1. Pre-deployment Checklist

```bash
# Run deployment checklist
./scripts/pre-deploy-check.sh

Checklist:
✓ All tests passing
✓ Security scan completed
✓ Database migrations ready
✓ Environment variables set
✓ SSL certificates valid
✓ Monitoring configured
✓ Backup verified
✓ Rollback plan ready
```

### 2. Blue-Green Deployment

```yaml
# blue-green-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: attitudes-app
spec:
  selector:
    app: attitudes
    version: green  # Switch between blue/green
  ports:
  - port: 80
    targetPort: 3000
---
# Green deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: attitudes-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: attitudes
      version: green
  template:
    metadata:
      labels:
        app: attitudes
        version: green
    spec:
      containers:
      - name: app
        image: attitudes/app:v2.0.0
        ports:
        - containerPort: 3000
```

### 3. Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

ENVIRONMENT=$1
VERSION=$2

echo "Deploying Attitudes.vip $VERSION to $ENVIRONMENT"

# Pre-deployment checks
echo "Running pre-deployment checks..."
./scripts/pre-deploy-check.sh

# Build and push images
echo "Building Docker images..."
docker build -t attitudes/app:$VERSION .
docker push attitudes/app:$VERSION

# Update Kubernetes deployments
echo "Updating Kubernetes deployments..."
kubectl set image deployment/auth-service auth=attitudes/auth-service:$VERSION
kubectl set image deployment/api-service api=attitudes/api-service:$VERSION

# Wait for rollout
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/auth-service
kubectl rollout status deployment/api-service

# Run post-deployment tests
echo "Running post-deployment tests..."
./scripts/post-deploy-test.sh

echo "Deployment completed successfully!"
```

### 4. Database Migration Strategy

```bash
#!/bin/bash
# migrate-db.sh

# Create backup before migration
echo "Creating database backup..."
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Run migrations
echo "Running database migrations..."
npm run db:migrate

# Verify migrations
echo "Verifying migrations..."
npm run db:verify

echo "Database migration completed!"
```

### 5. Multi-Region Deployment

```yaml
# multi-region-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: attitudes-global
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: attitudes
  ports:
  - port: 443
    targetPort: 3000
---
# Region-specific configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: region-config
data:
  REGION: "eu-west-1"
  DB_ENDPOINT: "eu-west-1.db.attitudes.vip"
  REDIS_ENDPOINT: "eu-west-1.redis.attitudes.vip"
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: docker.io
  IMAGE_NAME: attitudes/app

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: |
        npm run test
        npm run test:e2e
    
    - name: Run security scan
      run: npm audit --audit-level=high

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      uses: azure/setup-kubectl@v3
    
    - name: Set up Kubernetes config
      run: |
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/app app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        kubectl rollout status deployment/app
    
    - name: Run smoke tests
      run: |
        ./scripts/smoke-test.sh ${{ secrets.PRODUCTION_URL }}
```

### 2. GitLab CI/CD Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy
  - verify

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test
    - npm run lint
  coverage: '/Coverage: \d+\.\d+%/'

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy_staging:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n staging
  environment:
    name: staging
    url: https://staging.attitudes.vip
  only:
    - develop

deploy_production:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n production
  environment:
    name: production
    url: https://api.attitudes.vip
  only:
    - main
  when: manual
```

## Monitoring and Maintenance

### 1. Health Checks

```javascript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health/ready',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode == 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('ERROR:', err);
  process.exit(1);
});

request.end();
```

### 2. Monitoring Setup

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'attitudes-app'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: attitudes.*
```

### 3. Logging Configuration

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      <parse>
        @type json
      </parse>
    </source>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      logstash_format true
    </match>
```

### 4. Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Database backup
pg_dump $DATABASE_URL | gzip > backup-db-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup-db-$(date +%Y%m%d).sql.gz s3://attitudes-backups/db/

# Redis backup
redis-cli --rdb /tmp/redis-backup.rdb
aws s3 cp /tmp/redis-backup.rdb s3://attitudes-backups/redis/

# Application state backup
kubectl get all --all-namespaces -o yaml > k8s-backup-$(date +%Y%m%d).yaml
```

## Troubleshooting

### Common Issues

#### 1. Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs -f pod-name

# Describe pod for events
kubectl describe pod pod-name

# Check resource limits
kubectl top pod pod-name
```

#### 2. Database Connection Issues

```bash
# Test database connection
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h postgres -U postgres

# Check network policies
kubectl get networkpolicies

# Verify secrets
kubectl get secret attitudes-env -o yaml
```

#### 3. Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress attitudes-ingress

# Verify certificate
kubectl describe certificate attitudes-tls

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

#### 4. Performance Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods

# View HPA status
kubectl get hpa

# Check for throttling
kubectl describe deployment app-deployment | grep -A5 "Conditions"
```

### Debug Commands

```bash
# Execute commands in running pod
kubectl exec -it pod-name -- /bin/sh

# Port forward for local debugging
kubectl port-forward pod-name 3000:3000

# View recent events
kubectl get events --sort-by=.metadata.creationTimestamp

# Check service endpoints
kubectl get endpoints

# DNS debugging
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup service-name
```

### Rollback Procedures

```bash
#!/bin/bash
# rollback.sh

# Check deployment history
kubectl rollout history deployment/app

# Rollback to previous version
kubectl rollout undo deployment/app

# Rollback to specific revision
kubectl rollout undo deployment/app --to-revision=2

# Verify rollback
kubectl rollout status deployment/app
```

## Security Best Practices

### 1. Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### 2. Pod Security Policy

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### 3. Secrets Management

```bash
# Seal secrets for GitOps
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml

# Use external secrets operator
kubectl apply -f https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/crds/bundle.yaml
```

## Performance Optimization

### 1. Resource Optimization

```yaml
# vertical-pod-autoscaler.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-deployment
  updatePolicy:
    updateMode: "Auto"
```

### 2. Cache Configuration

```yaml
# redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
spec:
  clusterSize: 3
  persistenceEnabled: true
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 1000m
      memory: 2Gi
```

## Disaster Recovery

### 1. Backup Automation

```yaml
# velero-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 720h0m0s
    includedNamespaces:
    - attitudes-vip
    storageLocation: default
```

### 2. Disaster Recovery Plan

```bash
#!/bin/bash
# disaster-recovery.sh

# 1. Verify backups
velero backup get

# 2. Restore from backup
velero restore create --from-backup daily-backup-20240115

# 3. Verify restoration
kubectl get all -n attitudes-vip

# 4. Update DNS
./scripts/update-dns.sh

# 5. Run verification tests
./scripts/verify-restoration.sh
```

## Conclusion

This deployment guide covers all aspects of deploying the Attitudes.vip platform from local development to production-grade Kubernetes deployments. Always follow the deployment checklist and maintain proper backup and rollback procedures.