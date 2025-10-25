import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../middleware/auth.middleware';
import { logger } from '../config/logger';

const BCRYPT_ROUNDS = 12;

interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

interface AuthResult {
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPrivate: boolean;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

// Register new user
export async function registerUser(input: RegisterUserInput): Promise<AuthResult> {
  const { username, email, password, displayName } = input;

  // Check if user already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('User with this email or username already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user and initial stats in a transaction
  const user = await transaction(async (client) => {
    // Insert user
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, display_name, avatar_url, is_private, is_verified, created_at`,
      [username, email, passwordHash, displayName || username]
    );

    const newUser = userResult.rows[0];

    // Initialize user stats
    await client.query(
      'INSERT INTO user_stats (user_id) VALUES ($1)',
      [newUser.id]
    );

    return newUser;
  });

  // Generate tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  );

  logger.info(`User registered: ${user.id} (${user.username})`);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isPrivate: user.is_private,
      isVerified: user.is_verified,
    },
    accessToken,
    refreshToken,
  };
}

// Login user
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Find user by email
  const result = await query(
    `SELECT id, username, email, password_hash, display_name, avatar_url, 
            is_private, is_verified, is_active
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = result.rows[0];

  // Check if account is active
  if (!user.is_active) {
    throw new AppError('Account has been deactivated', 403);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last login
  await query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Generate tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  );

  logger.info(`User logged in: ${user.id} (${user.username})`);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isPrivate: user.is_private,
      isVerified: user.is_verified,
    },
    accessToken,
    refreshToken,
  };
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify refresh token
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check if refresh token exists and is not revoked
  const tokenResult = await query(
    `SELECT id, user_id, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token = $1`,
    [refreshToken]
  );

  if (tokenResult.rows.length === 0) {
    throw new AppError('Invalid refresh token', 401);
  }

  const tokenRecord = tokenResult.rows[0];

  if (tokenRecord.revoked_at) {
    throw new AppError('Refresh token has been revoked', 401);
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    throw new AppError('Refresh token has expired', 401);
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  // Store new refresh token and mark old one as replaced
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newTokenResult = await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id',
    [payload.userId, newRefreshToken, expiresAt]
  );

  // Mark old token as replaced
  await query(
    'UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2',
    [newTokenResult.rows[0].id, tokenRecord.id]
  );

  logger.info(`Token refreshed for user: ${payload.userId}`);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// Revoke refresh token
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1',
    [refreshToken]
  );

  logger.info('Refresh token revoked');
}

// Google OAuth login (placeholder)
export async function googleLogin(idToken: string): Promise<AuthResult> {
  // TODO: Verify Google ID token
  // TODO: Check if user exists by google_id or email
  // TODO: Create user if doesn't exist
  // TODO: Generate and return tokens
  
  throw new AppError('Google OAuth not yet implemented', 501);
}

// Apple OAuth login (placeholder)
export async function appleLogin(identityToken: string): Promise<AuthResult> {
  // TODO: Verify Apple identity token
  // TODO: Check if user exists by apple_id or email
  // TODO: Create user if doesn't exist
  // TODO: Generate and return tokens
  
  throw new AppError('Apple OAuth not yet implemented', 501);
}

export default {
  registerUser,
  loginUser,
  refreshAccessToken,
  revokeRefreshToken,
  googleLogin,
  appleLogin,
};
