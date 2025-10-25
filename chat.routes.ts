import { Router } from 'express';
import { param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { runValidation } from '../middleware/validation.middleware';

const router = Router();

// GET /conversations - Get all user conversations
router.get(
  '/',
  authenticate,
  (req, res) => {
    res.status(501).json({ message: 'Get conversations endpoint - To be implemented' });
  }
);

// GET /conversations/:conversationId/messages - Get messages in conversation
router.get(
  '/:conversationId/messages',
  authenticate,
  runValidation([
    param('conversationId').isUUID(),
    query('cursor').optional(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Get messages endpoint - To be implemented' });
  }
);

// POST /conversations/:conversationId/read - Mark messages as read
router.post(
  '/:conversationId/read',
  authenticate,
  runValidation([param('conversationId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Mark as read endpoint - To be implemented' });
  }
);

export default router;
