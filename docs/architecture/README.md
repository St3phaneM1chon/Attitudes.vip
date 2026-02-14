# Architecture Documentation - Attitudes.vip

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [High-Level Architecture](#high-level-architecture)
4. [Component Architecture](#component-architecture)
5. [Data Architecture](#data-architecture)
6. [Security Architecture](#security-architecture)
7. [Infrastructure Architecture](#infrastructure-architecture)
8. [Integration Architecture](#integration-architecture)

## System Overview

Attitudes.vip is a comprehensive SaaS platform for wedding management, designed as a multi-tenant, microservices-based architecture supporting global scale operations.

### Key Characteristics

- **Multi-tenant SaaS**: Isolated data and customization per client
- **Global Scale**: Support for 9 regions, 100+ languages
- **Event-Driven**: Real-time updates via WebSockets
- **Cloud-Native**: Kubernetes-based deployment
- **API-First**: RESTful APIs with GraphQL consideration
- **Security-First**: Zero-trust security model

## Architecture Principles

### 1. Domain-Driven Design (DDD)
- Bounded contexts for each major domain
- Clear separation of concerns
- Domain models drive the design

### 2. Microservices Architecture
- Services organized by business capability
- Independent deployment and scaling
- Service mesh for inter-service communication

### 3. Event-Driven Architecture
- Asynchronous communication where appropriate
- Event sourcing for audit trail
- CQRS for read/write optimization

### 4. Zero-Trust Security
- Never trust, always verify
- Least privilege access
- End-to-end encryption

### 5. Cloud-Native Design
- Container-first approach
- Horizontal scalability
- Resilience and self-healing

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile Apps]
        API_CLIENT[API Clients]
    end
    
    subgraph "API Gateway Layer"
        NGINX[Nginx]
        WAF[Web Application Firewall]
        LB[Load Balancer]
    end
    
    subgraph "Application Layer"
        AUTH[Auth Service]
        WEDDING[Wedding Service]
        GUEST[Guest Service]
        VENDOR[Vendor Service]
        PAYMENT[Payment Service]
        NOTIF[Notification Service]
        TASK[Task Service]
    end
    
    subgraph "Integration Layer"
        STRIPE[Stripe Integration]
        TWILIO[Twilio Integration]
        EMAIL[Email Service]
        CALENDAR[Calendar Sync]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL)]
        REDIS[(Redis)]
        S3[Object Storage]
        ELASTIC[Elasticsearch]
    end
    
    subgraph "Infrastructure Layer"
        K8S[Kubernetes]
        MONITOR[Monitoring]
        LOG[Logging]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    API_CLIENT --> NGINX
    
    NGINX --> WAF
    WAF --> LB
    
    LB --> AUTH
    LB --> WEDDING
    LB --> GUEST
    LB --> VENDOR
    LB --> PAYMENT
    LB --> NOTIF
    LB --> TASK
    
    AUTH --> REDIS
    AUTH --> PG
    
    WEDDING --> PG
    WEDDING --> REDIS
    WEDDING --> S3
    
    GUEST --> PG
    GUEST --> NOTIF
    
    VENDOR --> PG
    VENDOR --> ELASTIC
    
    PAYMENT --> STRIPE
    PAYMENT --> PG
    
    NOTIF --> TWILIO
    NOTIF --> EMAIL
    NOTIF --> REDIS
    
    TASK --> PG
    TASK --> CALENDAR
```

## Component Architecture

### 1. Authentication Service

```mermaid
graph LR
    subgraph "Auth Service"
        JWT[JWT Handler]
        OAUTH[OAuth2 Provider]
        SESSION[Session Manager]
        MFA[MFA Handler]
    end
    
    subgraph "External Providers"
        GOOGLE[Google OAuth]
        FB[Facebook OAuth]
        APPLE[Apple OAuth]
        TWITTER[Twitter OAuth]
    end
    
    subgraph "Storage"
        USERS[(Users DB)]
        SESSIONS[(Sessions)]
        TOKENS[(Refresh Tokens)]
    end
    
    OAUTH --> GOOGLE
    OAUTH --> FB
    OAUTH --> APPLE
    OAUTH --> TWITTER
    
    JWT --> TOKENS
    SESSION --> SESSIONS
    MFA --> USERS
```

**Responsibilities:**
- User authentication and authorization
- JWT token generation and validation
- OAuth2 integration with social providers
- Session management
- Multi-factor authentication
- Password reset and recovery

**Key Technologies:**
- Passport.js for authentication strategies
- JWT for stateless authentication
- Redis for session storage
- Bcrypt for password hashing

### 2. Wedding Service

```mermaid
graph TD
    subgraph "Wedding Service"
        API[Wedding API]
        BL[Business Logic]
        EVENT[Event Publisher]
        CACHE[Cache Layer]
    end
    
    subgraph "Domain Models"
        WEDDING[Wedding]
        TIMELINE[Timeline]
        BUDGET[Budget]
        CHECKLIST[Checklist]
    end
    
    API --> BL
    BL --> EVENT
    BL --> CACHE
    BL --> WEDDING
    BL --> TIMELINE
    BL --> BUDGET
    BL --> CHECKLIST
```

**Responsibilities:**
- Wedding CRUD operations
- Timeline management
- Budget tracking
- Checklist management
- Wedding templates
- Multi-language support

### 3. Guest Management Service

```mermaid
graph LR
    subgraph "Guest Service"
        CRUD[Guest CRUD]
        RSVP[RSVP Manager]
        SEATING[Seating Chart]
        IMPORT[Import/Export]
    end
    
    subgraph "Features"
        QR[QR Code Gen]
        INVITE[Invitations]
        DIET[Dietary Mgmt]
        PLUS[Plus One Mgmt]
    end
    
    CRUD --> QR
    RSVP --> INVITE
    SEATING --> DIET
    IMPORT --> PLUS
```

**Responsibilities:**
- Guest list management
- RSVP tracking and reminders
- Seating chart optimization
- Dietary restrictions tracking
- Guest communication
- QR code generation for check-in

### 4. Vendor Coordination Service

```mermaid
graph TD
    subgraph "Vendor Service"
        MARKET[Marketplace]
        CONTRACT[Contracts]
        SCHEDULE[Scheduling]
        REVIEW[Reviews]
    end
    
    subgraph "Vendor Types"
        PHOTO[Photographers]
        DJ[DJs]
        CATER[Caterers]
        VENUE[Venues]
        FLORIST[Florists]
        PLANNER[Planners]
    end
    
    MARKET --> PHOTO
    MARKET --> DJ
    MARKET --> CATER
    MARKET --> VENUE
    MARKET --> FLORIST
    MARKET --> PLANNER
```

**Responsibilities:**
- Vendor marketplace
- Contract management
- Scheduling and availability
- Review and rating system
- Communication platform
- Payment tracking

### 5. Payment Service

```mermaid
graph LR
    subgraph "Payment Service"
        PROCESS[Payment Processor]
        INVOICE[Invoice Generator]
        SPLIT[Split Payments]
        REFUND[Refund Handler]
    end
    
    subgraph "External"
        STRIPE[Stripe API]
        PAYPAL[PayPal API]
        BANK[Bank Transfer]
    end
    
    PROCESS --> STRIPE
    PROCESS --> PAYPAL
    PROCESS --> BANK
```

**Responsibilities:**
- Payment processing
- Invoice generation
- Split payment handling
- Refund management
- Payment schedules
- Financial reporting

### 6. Notification Service

```mermaid
graph TD
    subgraph "Notification Service"
        QUEUE[Message Queue]
        TEMPLATE[Template Engine]
        SCHEDULER[Scheduler]
        TRACKER[Delivery Tracker]
    end
    
    subgraph "Channels"
        EMAIL[Email]
        SMS[SMS]
        PUSH[Push Notifications]
        WEBHOOK[Webhooks]
    end
    
    QUEUE --> EMAIL
    QUEUE --> SMS
    QUEUE --> PUSH
    QUEUE --> WEBHOOK
```

**Responsibilities:**
- Multi-channel notifications
- Template management
- Scheduled notifications
- Delivery tracking
- User preferences
- Unsubscribe management

## Data Architecture

### Database Schema

```mermaid
erDiagram
    USERS ||--o{ OAUTH_PROFILES : has
    USERS ||--o{ WEDDINGS : creates
    WEDDINGS ||--o{ GUESTS : invites
    WEDDINGS ||--o{ VENDORS : hires
    WEDDINGS ||--o{ TASKS : contains
    WEDDINGS ||--o{ PAYMENTS : processes
    VENDORS ||--o{ REVIEWS : receives
    USERS ||--o{ NOTIFICATIONS : receives
    
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string role
        uuid tenant_id
        string locale
        string timezone
        boolean is_active
        timestamp created_at
    }
    
    WEDDINGS {
        uuid id PK
        uuid customer_id FK
        string partner_name
        date wedding_date
        string venue_name
        text venue_address
        integer guest_count
        decimal budget
        string status
        string theme
        timestamp created_at
    }
    
    GUESTS {
        uuid id PK
        uuid wedding_id FK
        string email
        string first_name
        string last_name
        string phone
        string rsvp_status
        text dietary_restrictions
        boolean plus_one
        integer table_number
    }
    
    VENDORS {
        uuid id PK
        uuid wedding_id FK
        uuid user_id FK
        string vendor_type
        string name
        string email
        jsonb services
        decimal pricing
        string status
    }
```

### Data Partitioning Strategy

- **Horizontal Partitioning**: By tenant_id for multi-tenancy
- **Time-based Partitioning**: Historical data by year
- **Geographic Partitioning**: By region for compliance

### Caching Strategy

```mermaid
graph TD
    subgraph "Cache Layers"
        CDN[CDN Cache]
        REDIS[Redis Cache]
        APP[Application Cache]
        DB[Database Cache]
    end
    
    subgraph "Cache Policies"
        TTL[TTL-based]
        LRU[LRU Eviction]
        TAG[Tag-based Invalidation]
    end
    
    CDN --> TTL
    REDIS --> LRU
    REDIS --> TAG
    APP --> TTL
```

**Cache Implementation:**
- **CDN**: Static assets, images
- **Redis**: Session data, hot data
- **Application**: Computed values, API responses
- **Database**: Query result cache

## Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        AUTHZ[Authorization]
        ENCRYPT[Encryption]
        AUDIT[Audit Logging]
    end
    
    subgraph "Security Features"
        MFA[Multi-Factor Auth]
        RBAC[Role-Based Access]
        API_KEYS[API Key Management]
        SECRETS[Secrets Management]
    end
    
    WAF --> AUTHZ
    AUTHZ --> ENCRYPT
    ENCRYPT --> AUDIT
    
    AUTHZ --> MFA
    AUTHZ --> RBAC
    AUTHZ --> API_KEYS
    ENCRYPT --> SECRETS
```

### Security Implementation

1. **Authentication**
   - JWT with short expiration (15 min)
   - Refresh tokens (7 days)
   - MFA for sensitive operations

2. **Authorization**
   - Role-based access control (RBAC)
   - Attribute-based access control (ABAC)
   - Resource-level permissions

3. **Encryption**
   - TLS 1.3 for all connections
   - AES-256 for data at rest
   - Field-level encryption for PII

4. **Compliance**
   - GDPR compliant
   - PCI DSS for payments
   - SOC 2 Type II

## Infrastructure Architecture

### Kubernetes Architecture

```mermaid
graph TD
    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            INGRESS[Nginx Ingress]
            CERT[Cert Manager]
        end
        
        subgraph "Applications"
            AUTH_POD[Auth Pods]
            API_POD[API Pods]
            WORKER_POD[Worker Pods]
        end
        
        subgraph "Data"
            PG_POD[PostgreSQL]
            REDIS_POD[Redis]
        end
        
        subgraph "Monitoring"
            PROM[Prometheus]
            GRAF[Grafana]
            ELK[ELK Stack]
        end
    end
    
    INGRESS --> AUTH_POD
    INGRESS --> API_POD
    API_POD --> PG_POD
    API_POD --> REDIS_POD
    WORKER_POD --> PG_POD
```

### Deployment Strategy

1. **Blue-Green Deployment**
   - Zero-downtime deployments
   - Easy rollback capability
   - A/B testing support

2. **Auto-scaling**
   - Horizontal Pod Autoscaler (HPA)
   - Vertical Pod Autoscaler (VPA)
   - Cluster autoscaling

3. **Service Mesh**
   - Istio for service communication
   - Traffic management
   - Security policies

### Monitoring and Observability

```mermaid
graph LR
    subgraph "Metrics"
        PROM[Prometheus]
        GRAF[Grafana]
    end
    
    subgraph "Logs"
        FLUENT[Fluentd]
        ELASTIC[Elasticsearch]
        KIBANA[Kibana]
    end
    
    subgraph "Traces"
        JAEGER[Jaeger]
        ZIPKIN[Zipkin]
    end
    
    subgraph "Alerts"
        ALERT[AlertManager]
        PAGER[PagerDuty]
    end
    
    PROM --> GRAF
    FLUENT --> ELASTIC
    ELASTIC --> KIBANA
    PROM --> ALERT
    ALERT --> PAGER
```

## Integration Architecture

### External Service Integration

```mermaid
graph TD
    subgraph "Payment Providers"
        STRIPE[Stripe]
        PAYPAL[PayPal]
        SQUARE[Square]
    end
    
    subgraph "Communication"
        TWILIO[Twilio SMS]
        SENDGRID[SendGrid Email]
        FCM[Firebase Cloud Messaging]
    end
    
    subgraph "Social"
        GOOGLE_CAL[Google Calendar]
        FB_EVENTS[Facebook Events]
        INSTAGRAM[Instagram API]
    end
    
    subgraph "Analytics"
        GA[Google Analytics]
        MIXPANEL[Mixpanel]
        SEGMENT[Segment]
    end
```

### Integration Patterns

1. **API Gateway Pattern**
   - Single entry point
   - Rate limiting
   - Authentication
   - Request routing

2. **Circuit Breaker Pattern**
   - Prevent cascade failures
   - Graceful degradation
   - Automatic recovery

3. **Retry Pattern**
   - Exponential backoff
   - Maximum retry limits
   - Dead letter queues

4. **Event-Driven Integration**
   - Webhook receivers
   - Event publishing
   - Async processing

## Performance Architecture

### Performance Optimization

1. **Database Optimization**
   - Connection pooling
   - Query optimization
   - Indexing strategy
   - Read replicas

2. **Caching Strategy**
   - Multi-level caching
   - Cache warming
   - Smart invalidation

3. **CDN Strategy**
   - Geographic distribution
   - Asset optimization
   - Edge computing

4. **Code Optimization**
   - Lazy loading
   - Code splitting
   - Tree shaking
   - Minification

### Performance Targets

- **API Response Time**: < 200ms (p95)
- **Page Load Time**: < 3s
- **Availability**: 99.9% uptime
- **Concurrent Users**: 10,000+
- **RPS**: 1,000 requests/second

## Disaster Recovery

### Backup Strategy

```mermaid
graph TD
    subgraph "Backup Types"
        FULL[Full Backup Daily]
        INC[Incremental Hourly]
        SNAP[Snapshots]
    end
    
    subgraph "Backup Locations"
        PRIMARY[Primary Region]
        SECONDARY[Secondary Region]
        COLD[Cold Storage]
    end
    
    FULL --> PRIMARY
    FULL --> SECONDARY
    INC --> PRIMARY
    SNAP --> COLD
```

### Recovery Procedures

1. **RTO (Recovery Time Objective)**: < 4 hours
2. **RPO (Recovery Point Objective)**: < 1 hour
3. **Automated failover for critical services**
4. **Regular disaster recovery drills**

## Future Architecture Considerations

### Planned Enhancements

1. **GraphQL API**
   - More efficient data fetching
   - Real-time subscriptions
   - Better mobile performance

2. **Machine Learning Integration**
   - Vendor recommendations
   - Budget optimization
   - Guest seating optimization

3. **Blockchain Integration**
   - Smart contracts for vendors
   - Immutable event records
   - Decentralized reviews

4. **Edge Computing**
   - Reduced latency
   - Offline capabilities
   - Regional compliance

### Scalability Roadmap

1. **Phase 1**: Current (10K users)
   - Single region deployment
   - Basic auto-scaling

2. **Phase 2**: Growth (100K users)
   - Multi-region deployment
   - Advanced caching
   - Service mesh

3. **Phase 3**: Scale (1M+ users)
   - Global edge network
   - Multi-cloud strategy
   - AI/ML integration

## Architecture Decision Records (ADRs)

### ADR-001: Microservices Architecture
- **Status**: Accepted
- **Context**: Need for scalable, maintainable system
- **Decision**: Adopt microservices architecture
- **Consequences**: Higher complexity, better scalability

### ADR-002: PostgreSQL as Primary Database
- **Status**: Accepted
- **Context**: Need for ACID compliance and JSON support
- **Decision**: Use PostgreSQL with JSONB
- **Consequences**: Strong consistency, good performance

### ADR-003: Kubernetes for Orchestration
- **Status**: Accepted
- **Context**: Need for container orchestration
- **Decision**: Use Kubernetes with Helm
- **Consequences**: Industry standard, steep learning curve

### ADR-004: Event-Driven Architecture
- **Status**: Accepted
- **Context**: Need for real-time updates
- **Decision**: Implement event-driven patterns
- **Consequences**: Better UX, increased complexity