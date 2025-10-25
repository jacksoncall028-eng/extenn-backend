import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { runValidation } from '../middleware/validation.middleware';

const router = Router();

// GET /feed - Get user's personalized feed
router.get(
  '/',
  authenticate,
  runValidation([
    query('cursor').optional(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Feed endpoint - To be implemented' });
  }
);

export default router;
