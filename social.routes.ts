import { Router } from 'express';
import { param, body, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { runValidation } from '../middleware/validation.middleware';

const router = Router();

// ========== LIKES ==========
// POST /social/posts/:postId/like
router.post(
  '/posts/:postId/like',
  authenticate,
  runValidation([param('postId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Like post endpoint - To be implemented' });
  }
);

// DELETE /social/posts/:postId/like
router.delete(
  '/posts/:postId/like',
  authenticate,
  runValidation([param('postId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Unlike post endpoint - To be implemented' });
  }
);

// GET /social/posts/:postId/likes
router.get(
  '/posts/:postId/likes',
  authenticate,
  runValidation([param('postId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Get post likes endpoint - To be implemented' });
  }
);

// ========== COMMENTS ==========
// GET /social/posts/:postId/comments
router.get(
  '/posts/:postId/comments',
  authenticate,
  runValidation([
    param('postId').isUUID(),
    query('cursor').optional(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Get comments endpoint - To be implemented' });
  }
);

// POST /social/posts/:postId/comments
router.post(
  '/posts/:postId/comments',
  authenticate,
  runValidation([
    param('postId').isUUID(),
    body('text').trim().isLength({ min: 1, max: 500 }),
    body('parentCommentId').optional().isUUID(),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Create comment endpoint - To be implemented' });
  }
);

// DELETE /social/comments/:commentId
router.delete(
  '/comments/:commentId',
  authenticate,
  runValidation([param('commentId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Delete comment endpoint - To be implemented' });
  }
);

// ========== FOLLOWS ==========
// POST /social/users/:userId/follow
router.post(
  '/users/:userId/follow',
  authenticate,
  runValidation([param('userId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Follow user endpoint - To be implemented' });
  }
);

// DELETE /social/users/:userId/follow
router.delete(
  '/users/:userId/follow',
  authenticate,
  runValidation([param('userId').isUUID()]),
  (req, res) => {
    res.status(501).json({ message: 'Unfollow user endpoint - To be implemented' });
  }
);

export default router;
