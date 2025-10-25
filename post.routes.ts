import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { runValidation } from '../middleware/validation.middleware';

const router = Router();

// POST /posts - Create new post
router.post(
  '/',
  authenticate,
  runValidation([
    body('caption').optional().trim().isLength({ max: 2200 }),
    body('mediaUrls').isArray({ min: 1, max: 10 }).withMessage('Must provide 1-10 media URLs'),
    body('mediaType').isIn(['image', 'video', 'carousel']).withMessage('Invalid media type'),
    body('visibility').optional().isIn(['public', 'followers', 'private']),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Create post endpoint - To be implemented' });
  }
);

// GET /posts/:postId - Get single post
router.get(
  '/:postId',
  authenticate,
  runValidation([
    param('postId').isUUID().withMessage('Invalid post ID'),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Get post endpoint - To be implemented' });
  }
);

// PUT /posts/:postId - Update post
router.put(
  '/:postId',
  authenticate,
  runValidation([
    param('postId').isUUID().withMessage('Invalid post ID'),
    body('caption').optional().trim().isLength({ max: 2200 }),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Update post endpoint - To be implemented' });
  }
);

// DELETE /posts/:postId - Delete post
router.delete(
  '/:postId',
  authenticate,
  runValidation([
    param('postId').isUUID().withMessage('Invalid post ID'),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Delete post endpoint - To be implemented' });
  }
);

export default router;
