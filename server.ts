import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import configurations
import { config } from './config/config';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
import feedRoutes from './routes/feed.routes';
import socialRoutes from './routes/social.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import uploadRoutes from './routes/upload.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';

// Import WebSocket handler
import { initializeSocketIO } from './websocket/socket';

// Load environment variables
dotenv.config();

class App {
  public app: Application;
  public server: ReturnType<typeof createServer>;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // HTTP request logger
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    }

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
      });
    });
  }

  private initializeRoutes(): void {
    const apiPrefix = `/api/${config.apiVersion}`;

    // Apply rate limiting to API routes
    this.app.use(apiPrefix, rateLimiter);

    // Register routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);
    this.app.use(`${apiPrefix}/posts`, postRoutes);
    this.app.use(`${apiPrefix}/feed`, feedRoutes);
    this.app.use(`${apiPrefix}/social`, socialRoutes);
    this.app.use(`${apiPrefix}/conversations`, chatRoutes);
    this.app.use(`${apiPrefix}/notifications`, notificationRoutes);
    this.app.use(`${apiPrefix}/upload`, uploadRoutes);

    // API documentation (optional)
    this.app.get(`${apiPrefix}`, (req: Request, res: Response) => {
      res.json({
        message: 'InstaSocial API',
        version: config.apiVersion,
        endpoints: {
          auth: `${apiPrefix}/auth`,
          users: `${apiPrefix}/users`,
          posts: `${apiPrefix}/posts`,
          feed: `${apiPrefix}/feed`,
          social: `${apiPrefix}/social`,
          chat: `${apiPrefix}/conversations`,
          notifications: `${apiPrefix}/notifications`,
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to PostgreSQL
      await connectDatabase();
      logger.info('✅ Database connected');

      // Connect to Redis
      await connectRedis();
      logger.info('✅ Redis connected');

      // Initialize Socket.IO
      initializeSocketIO(this.io);
      logger.info('✅ WebSocket server initialized');

      // Start HTTP server
      this.server.listen(config.port, () => {
        logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
        logger.info(`📡 API available at http://localhost:${config.port}/api/${config.apiVersion}`);
      });
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    this.server.close(() => {
      logger.info('Server shut down gracefully');
      process.exit(0);
    });
  }
}

// Create and start the application
const application = new App();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await application.stop();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await application.stop();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
application.start();

export default application;
