import { Router } from 'express';
import { body } from 'express-validator';
import { runValidation } from '../middleware/validation.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
// Import controllers (to be created)
// import { signup, login, refresh, logout } from '../controllers/auth.controller';

const router = Router();

// Validation rules
const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name must be less than 100 characters'),
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const refreshValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// Routes
// router.post('/signup', authRateLimiter, runValidation(signupValidation), signup);
// router.post('/login', authRateLimiter, runValidation(loginValidation), login);
// router.post('/refresh', runValidation(refreshValidation), refresh);
// router.post('/logout', logout);

// Temporary placeholder routes
router.post('/signup', authRateLimiter, runValidation(signupValidation), (req, res) => {
  res.status(501).json({ message: 'Signup endpoint - To be implemented' });
});

router.post('/login', authRateLimiter, runValidation(loginValidation), (req, res) => {
  res.status(501).json({ message: 'Login endpoint - To be implemented' });
});

router.post('/refresh', runValidation(refreshValidation), (req, res) => {
  res.status(501).json({ message: 'Refresh token endpoint - To be implemented' });
});

router.post('/logout', (req, res) => {
  res.status(501).json({ message: 'Logout endpoint - To be implemented' });
});

export default router;
