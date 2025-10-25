import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import * as authService from '../services/auth.service';
import { logger } from '../config/logger';

// User signup
export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { username, email, password, displayName } = req.body;

  logger.info(`Signup attempt for email: ${email}`);

  const result = await authService.registerUser({
    username,
    email,
    password,
    displayName,
  });

  res.status(201).json({
    message: 'User registered successfully',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

// User login
export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  logger.info(`Login attempt for email: ${email}`);

  const result = await authService.loginUser(email, password);

  res.status(200).json({
    message: 'Login successful',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

// Refresh access token
export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;

  logger.info('Token refresh attempt');

  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    message: 'Token refreshed successfully',
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

// User logout
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  const userId = req.user?.userId;

  if (refreshToken) {
    await authService.revokeRefreshToken(refreshToken);
  }

  logger.info(`User logged out: ${userId}`);

  res.status(200).json({
    message: 'Logout successful',
  });
});

// OAuth - Google login
export const googleAuth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { idToken } = req.body;

  logger.info('Google OAuth login attempt');

  const result = await authService.googleLogin(idToken);

  res.status(200).json({
    message: 'Google login successful',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

// OAuth - Apple login
export const appleAuth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { identityToken } = req.body;

  logger.info('Apple OAuth login attempt');

  const result = await authService.appleLogin(identityToken);

  res.status(200).json({
    message: 'Apple login successful',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export default { signup, login, refresh, logout, googleAuth, appleAuth };
