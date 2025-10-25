# Quick Start Guide - InstaSocial

Get up and running with InstaSocial development in 15 minutes.

## Prerequisites

- **Node.js**: 20.x or higher ([Download](https://nodejs.org/))
- **npm**: 10.x or higher (comes with Node.js)
- **Docker Desktop**: For running PostgreSQL and Redis ([Download](https://www.docker.com/products/docker-desktop))
- **Git**: Version control ([Download](https://git-scm.com/))

**Optional** (for mobile development):
- **React Native CLI**: `npm install -g react-native-cli`
- **Android Studio**: For Android development
- **Xcode**: For iOS development (macOS only)

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd externn
```

## 2. Start Database Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **PgAdmin** on `http://localhost:5050` (admin UI)
- **Redis Commander** on `http://localhost:8081` (Redis UI)

Verify services are running:
```bash
docker-compose ps
```

## 3. Setup Backend

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file (use default values for local development):
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/instasocial
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=dev-access-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
```

### Initialize Database

Run migrations to create tables:

```bash
npm run migrate
```

### Start Backend Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

### Test Backend

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-10-25T10:00:00.000Z",
  "uptime": 5.123,
  "environment": "development"
}
```

## 4. Setup Mobile App (Optional)

### Initialize React Native Project

```bash
cd ..  # Back to project root
npx react-native init InstaSocialMobile --template react-native-template-typescript
cd InstaSocialMobile
```

### Install Additional Dependencies

```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install axios socket.io-client
npm install react-native-image-picker react-native-fast-image
```

### iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### Run Mobile App

**Android**:
```bash
npm run android
```

**iOS** (macOS only):
```bash
npm run ios
```

## 5. Access Admin Tools

### PgAdmin (Database Management)

1. Open http://localhost:5050
2. Login:
   - Email: `admin@instasocial.com`
   - Password: `admin`
3. Add server:
   - Name: `InstaSocial Local`
   - Host: `postgres` (or `host.docker.internal` on Windows/Mac)
   - Port: `5432`
   - Username: `postgres`
   - Password: `password`

### Redis Commander (Redis Management)

Open http://localhost:8081

## 6. Test API Endpoints

### Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234",
    "displayName": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

Save the `accessToken` from the response.

### Get User Profile

```bash
curl http://localhost:3000/api/v1/users/{userId} \
  -H "Authorization: Bearer {accessToken}"
```

## 7. Development Workflow

### Backend Development

1. Make changes to code in `backend/src/`
2. Server auto-restarts (nodemon)
3. Test your changes
4. Run tests: `npm test`

### Running Tests

```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:integration   # Integration tests
```

### Linting & Formatting

```bash
npm run lint               # Check for issues
npm run lint:fix          # Auto-fix issues
npm run format            # Format code with Prettier
```

## 8. Common Tasks

### Create a New Migration

```bash
cd backend
npm run migrate:create add_new_table
```

Edit the migration file in `migrations/`, then run:
```bash
npm run migrate
```

### View Logs

**Backend logs**:
```bash
cd backend
tail -f logs/combined.log
```

**Docker logs**:
```bash
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f backend
```

### Reset Database

```bash
docker-compose down -v     # Remove volumes
docker-compose up -d       # Restart services
cd backend
npm run migrate           # Re-run migrations
```

### Stop All Services

```bash
docker-compose down
```

## 9. Next Steps

### For Backend Developers

1. Review `docs/api-spec.yaml` for API design
2. Implement controllers in `backend/src/controllers/`
3. Add business logic in `backend/src/services/`
4. Write tests for new features
5. Update API documentation

### For Mobile Developers

1. Review Figma designs (when available)
2. Setup navigation structure
3. Create reusable components
4. Integrate with backend API
5. Test on physical devices

### For Full-Stack Development

1. Follow the Sprint Plan in `docs/PROJECT_PLAN.md`
2. Start with Sprint 1 tasks (Auth & Profiles)
3. Use feature branches: `feature/user-auth`
4. Create Pull Requests for review
5. Deploy to staging for testing

## 10. Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000    # Windows

# Kill the process
kill -9 <PID>          # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Failed

1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Check DATABASE_URL in `.env`

3. Try restarting services:
   ```bash
   docker-compose restart postgres
   ```

### Redis Connection Failed

```bash
docker-compose restart redis
```

### Cannot Find Module

```bash
cd backend
rm -rf node_modules
npm install
```

### Docker Issues

```bash
docker-compose down
docker system prune -a  # Clean up
docker-compose up -d
```

## 11. Useful Commands

### Docker

```bash
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f        # View logs
docker-compose restart        # Restart services
docker-compose ps             # List services
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it instasocial-postgres psql -U postgres -d instasocial

# Common SQL queries
\dt                # List tables
\d users          # Describe users table
SELECT * FROM users;
```

### Redis

```bash
# Connect to Redis
docker exec -it instasocial-redis redis-cli

# Common commands
PING              # Test connection
KEYS *           # List all keys
GET key          # Get value
FLUSHALL         # Clear all data
```

## 12. Resources

### Documentation
- [Project Plan](PROJECT_PLAN.md) - Sprint breakdown
- [Architecture](architecture.md) - System design
- [API Specification](api-spec.yaml) - REST API docs
- [Deployment](deployment.md) - Production deployment

### Learning Resources
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/15/tutorial.html)
- [Socket.IO Docs](https://socket.io/docs/v4/)

### Community
- GitHub Issues: Report bugs
- Slack/Discord: Team communication
- Stack Overflow: Technical questions

## Support

For questions or issues:
1. Check troubleshooting section
2. Search existing GitHub issues
3. Ask in team Slack channel
4. Create a new GitHub issue

---

**Ready to code?** Start with Sprint 1 tasks in `docs/PROJECT_PLAN.md`! 🚀
