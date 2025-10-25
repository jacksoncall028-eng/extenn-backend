import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from './config';
import { logger } from './logger';

// Create PostgreSQL connection pool
export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pool event handlers
pool.on('connect', () => {
  logger.debug('New client connected to database');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Connect to database and verify connection
export async function connectDatabase(): Promise<void> {
  try {
    const client: PoolClient = await pool.connect();
    const result: QueryResult = await client.query('SELECT NOW()');
    logger.info(`Database connected at: ${result.rows[0].now}`);
    client.release();
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

// Query helper with error handling
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, error });
    throw error;
  }
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool has ended');
  } catch (error) {
    logger.error('Error ending database pool:', error);
    throw error;
  }
}

export default { pool, query, transaction, connectDatabase, disconnectDatabase };
