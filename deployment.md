# InstaSocial Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- AWS Account (for S3)
- Domain name
- SSL certificate

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd externn
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/instasocial
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

### 3. Start Services with Docker Compose

```bash
# From project root
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- PgAdmin on port 5050
- Redis Commander on port 8081

### 4. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 5. Start Backend Server

```bash
npm run dev
```

Server runs on: http://localhost:3000

### 6. Verify Installation

```bash
curl http://localhost:3000/health
```

## Production Deployment

### Option 1: Docker Deployment (Recommended)

#### 1. Build Production Image

```bash
cd backend
docker build -t instasocial-backend:latest --target production .
```

#### 2. Push to Container Registry

```bash
# Docker Hub
docker tag instasocial-backend:latest username/instasocial-backend:latest
docker push username/instasocial-backend:latest

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag instasocial-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/instasocial-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/instasocial-backend:latest
```

#### 3. Deploy with Docker Compose (Single Server)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: username/instasocial-backend:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: ${REDIS_HOST}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: instasocial
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes Deployment

#### 1. Create Kubernetes Manifests

**namespace.yaml**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: instasocial
```

**backend-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: instasocial
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: username/instasocial-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: instasocial-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**backend-service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: instasocial
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 2. Apply Kubernetes Resources

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
```

### Option 3: Cloud Platform Deployment

#### AWS Elastic Beanstalk

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize EB:
```bash
cd backend
eb init -p docker instasocial-backend
```

3. Create environment:
```bash
eb create instasocial-prod --database.engine postgres
```

4. Deploy:
```bash
eb deploy
```

#### Google Cloud Run

1. Build and push image:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/instasocial-backend
```

2. Deploy:
```bash
gcloud run deploy instasocial-backend \
  --image gcr.io/PROJECT_ID/instasocial-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=$DATABASE_URL,REDIS_HOST=$REDIS_HOST
```

## Database Setup

### PostgreSQL

#### Managed Services (Recommended)

**AWS RDS**:
```bash
aws rds create-db-instance \
  --db-instance-identifier instasocial-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username postgres \
  --master-user-password <password> \
  --allocated-storage 100 \
  --backup-retention-period 7
```

**Google Cloud SQL**:
```bash
gcloud sql instances create instasocial-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1
```

#### Run Migrations

```bash
DATABASE_URL=<production-url> npm run migrate
```

### Redis

**AWS ElastiCache**:
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id instasocial-cache \
  --engine redis \
  --cache-node-type cache.t3.medium \
  --num-cache-nodes 1
```

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.instasocial.com
```

### Nginx Configuration

Create `/etc/nginx/sites-available/instasocial`:

```nginx
upstream backend {
    least_conn;
    server backend:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.instasocial.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.instasocial.com;

    ssl_certificate /etc/letsencrypt/live/api.instasocial.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.instasocial.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/instasocial /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring Setup

### Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'instasocial-backend'
    static_configs:
      - targets: ['backend:3000']
```

### Grafana Dashboard

Import dashboard ID: 11159 (Node.js Application Dashboard)

## Environment Variables Checklist

Production `.env`:

```env
# Required
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/instasocial
REDIS_HOST=redis.example.com
REDIS_PASSWORD=<strong-password>
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET_NAME=instasocial-media

# Optional
SENTRY_DSN=<sentry-dsn>
FCM_SERVER_KEY=<fcm-key>
```

## Health Checks

### Application Health

```bash
curl https://api.instasocial.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Database Health

```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Health

```bash
redis-cli -h $REDIS_HOST ping
```

## Backup Strategy

### Database Backups

**Automated (AWS RDS)**:
- Daily automated backups
- 7-day retention
- Point-in-time recovery

**Manual Backup**:
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore**:
```bash
psql $DATABASE_URL < backup_20240101_120000.sql
```

### Redis Backups

Enable AOF persistence:
```bash
redis-cli CONFIG SET appendonly yes
```

## Scaling

### Horizontal Scaling

Add more backend instances:
```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=5
```

### Database Read Replicas

Create read replica (AWS RDS):
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier instasocial-db-replica \
  --source-db-instance-identifier instasocial-db
```

## Troubleshooting

### View Logs

```bash
# Docker
docker logs -f <container-id>

# Kubernetes
kubectl logs -f deployment/backend -n instasocial

# System
tail -f /var/log/instasocial/combined.log
```

### Common Issues

**Database Connection Errors**:
- Check DATABASE_URL format
- Verify database is accessible
- Check connection pool settings

**Redis Connection Errors**:
- Verify REDIS_HOST and port
- Check firewall rules
- Ensure Redis is running

**High Memory Usage**:
- Check for memory leaks
- Adjust connection pool sizes
- Scale horizontally

## Rollback Procedure

```bash
# Docker
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Kubernetes
kubectl rollout undo deployment/backend -n instasocial

# Elastic Beanstalk
eb deploy --version <previous-version>
```

## Security Checklist

- [ ] HTTPS/TLS enabled
- [ ] Strong JWT secrets
- [ ] Database credentials secured
- [ ] Redis password set
- [ ] AWS IAM roles configured
- [ ] Rate limiting enabled
- [ ] Firewall rules configured
- [ ] Backups automated
- [ ] Monitoring enabled
- [ ] Logs centralized
