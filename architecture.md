# InstaSocial Architecture

## System Overview

InstaSocial is a scalable, mobile-first social media platform built with modern technologies to handle millions of users.

## High-Level Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Mobile    │      │     Web     │      │   Mobile    │
│   (iOS)     │      │   Client    │      │  (Android)  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Load Balancer │
                    │   (Nginx/ALB)   │
                    └───────┬────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │  API Server  │ │ API Server │ │  API Server │
    │  (Node.js)   │ │ (Node.js)  │ │  (Node.js)  │
    └───────┬──────┘ └─────┬─────┘ └──────┬──────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐
│ PostgreSQL  │    │    Redis    │   │     S3      │
│  (Primary)  │    │   (Cache)   │   │   (Media)   │
└─────────────┘    └─────────────┘   └─────────────┘
        │
┌───────▼─────┐
│ PostgreSQL  │
│  (Replica)  │
└─────────────┘
```

## Component Breakdown

### 1. Client Layer

**Mobile Apps (React Native)**
- Cross-platform iOS and Android apps
- Offline-first architecture with local caching
- Real-time updates via WebSocket
- Push notifications via FCM/APNs

**Web Client (Optional)**
- Progressive Web App (PWA)
- Responsive design
- Shared API with mobile apps

### 2. API Gateway / Load Balancer

**Technology**: Nginx, AWS ALB, or Cloud Load Balancer

**Responsibilities**:
- SSL/TLS termination
- Request routing
- Rate limiting
- DDoS protection
- Health checks

### 3. Application Layer

**Technology**: Node.js 20+ with Express.js and TypeScript

**Components**:

#### REST API Server
- Handles HTTP requests (CRUD operations)
- Authentication & authorization (JWT)
- Input validation
- Business logic
- Rate limiting per user/IP

#### WebSocket Server
- Real-time messaging (Socket.IO)
- Typing indicators
- Online presence
- Read receipts
- Uses Redis pub/sub for horizontal scaling

#### Background Workers
- Image/video processing
- Notification dispatch
- Feed generation
- Analytics aggregation
- Cleanup tasks

### 4. Data Layer

#### PostgreSQL (Primary Database)
- **Version**: 15+
- **Purpose**: Relational data storage
- **Tables**: Users, posts, comments, likes, follows, messages, notifications
- **Scaling**: Read replicas for high-read workloads
- **Backup**: Automated daily backups with point-in-time recovery

**Connection Pooling**: pg-pool (max 10-20 connections per server)

#### Redis (Cache & Session Store)
- **Version**: 7+
- **Use Cases**:
  - Session storage
  - API rate limiting
  - Feed caching (hot posts)
  - User stats caching
  - Real-time data (online users)
  - Message queue (Bull/BullMQ)
  
**Data Structures**:
- Strings: User sessions
- Hashes: User profiles (cached)
- Sets: Online users, followers
- Sorted Sets: Leaderboards, trending posts
- Lists: Message queues

#### AWS S3 (Object Storage)
- **Purpose**: Store user-generated media
- **Structure**:
  ```
  /avatars/{userId}/{filename}
  /posts/{postId}/{size}/{filename}
  /messages/{conversationId}/{filename}
  ```
- **Upload Flow**: Presigned URLs for direct client uploads
- **Access**: Via CloudFront CDN

### 5. Media Processing

**Technology**: AWS Lambda + Sharp (or Cloudinary)

**Pipeline**:
1. Client uploads original image to S3 via presigned URL
2. S3 triggers Lambda function
3. Lambda generates thumbnails (150x150, 640x640, 1080x1080)
4. Stores processed images back to S3
5. Updates database with media URLs

**Video Processing**:
- Thumbnail extraction (first frame)
- Format conversion (MP4 H.264)
- Compression and optimization
- HLS for adaptive streaming (future)

### 6. Real-time Messaging Architecture

**Technology**: Socket.IO with Redis adapter

**Flow**:
1. Client connects to any WebSocket server with JWT token
2. Server authenticates and joins user to rooms:
   - `user:{userId}` - Personal notifications
   - `conversation:{conversationId}` - Chat rooms
3. Message sent → Saved to PostgreSQL → Published to Redis
4. All servers subscribed to Redis receive event
5. Servers emit to connected clients in conversation room

**Scaling**: Multiple WebSocket servers share state via Redis pub/sub

### 7. Feed Generation

**MVP Approach (Pull Model)**:
```sql
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN (
  SELECT following_id 
  FROM follows 
  WHERE follower_id = $1 AND status = 'accepted'
)
ORDER BY p.created_at DESC
LIMIT 20 OFFSET $2;
```

**Optimizations**:
- Cache followed user IDs in Redis
- Cache feed results for 5 minutes
- Add database indexes on (user_id, created_at)

**Scale Approach (Fan-out on Write)**:
- Pre-compute feeds for active users
- Store in Redis sorted sets by timestamp
- Background job updates feeds when new post created
- Trade write performance for read performance

### 8. Notification System

**Types**:
- In-app notifications (stored in PostgreSQL)
- Push notifications (via FCM/APNs)
- Real-time notifications (via WebSocket)

**Flow**:
1. Triggering event (like, comment, follow)
2. Create notification record in database
3. Emit real-time notification via Socket.IO
4. Queue push notification job
5. Worker sends FCM/APNs push notification

### 9. Security Architecture

**Authentication**:
- JWT access tokens (15-minute expiry)
- Refresh tokens (7-day expiry, stored in database)
- Bcrypt password hashing (cost factor 12)
- OAuth 2.0 for Google/Apple login

**Authorization**:
- Route-level middleware checks
- Resource ownership validation
- Privacy settings enforcement

**Data Protection**:
- HTTPS/TLS everywhere
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)
- CSRF tokens (for web)
- Rate limiting (100 requests per 15 minutes)

**File Upload Security**:
- Presigned URLs with expiration
- Content-Type validation
- File size limits (10MB)
- Antivirus scanning (optional)

## Scalability Strategies

### Horizontal Scaling

**API Servers**:
- Stateless design
- Run multiple instances behind load balancer
- Auto-scaling based on CPU/memory metrics

**Database**:
- Read replicas for SELECT queries
- Connection pooling
- Query optimization and indexing

**Caching**:
- Redis cluster for high availability
- Cache invalidation strategies
- Multi-layer caching (application + CDN)

### Performance Optimizations

**Database**:
- Indexes on frequently queried columns
- Denormalized counters (likes_count, comments_count)
- Pagination with cursor-based approach
- EXPLAIN ANALYZE for slow queries

**API**:
- Response compression (gzip)
- Database query batching
- N+1 query prevention
- API response caching

**Media**:
- CDN for global distribution (CloudFront)
- Image lazy loading
- Adaptive image sizes
- Video streaming optimization

## Monitoring & Observability

**Application Monitoring**:
- Sentry for error tracking
- Winston for structured logging
- Prometheus + Grafana for metrics

**Infrastructure Monitoring**:
- AWS CloudWatch / GCP Monitoring
- Database performance metrics
- Redis metrics
- Server resource utilization

**Key Metrics**:
- API response time (p50, p95, p99)
- Error rate
- Database query performance
- Cache hit rate
- Active WebSocket connections
- Message delivery rate

## Disaster Recovery

**Backups**:
- PostgreSQL: Daily automated backups + WAL archiving
- Redis: AOF persistence + RDB snapshots
- S3: Versioning enabled

**Recovery Objectives**:
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour

## Future Enhancements

1. **Microservices Architecture**: Split monolith into services (User, Post, Message, Notification)
2. **GraphQL API**: Flexible queries for mobile clients
3. **Event Sourcing**: Audit trail and analytics
4. **Machine Learning**: Content recommendations, image recognition
5. **Edge Computing**: CDN for API responses
6. **Multi-region Deployment**: Global low-latency access
