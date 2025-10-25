import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { runValidation } from '../middleware/validation.middleware';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// GET /upload/presigned-url - Get presigned S3 URL for upload
router.get(
  '/presigned-url',
  authenticate,
  uploadRateLimiter,
  runValidation([
    query('fileType').isIn(['image', 'video', 'avatar']).withMessage('Invalid file type'),
    query('contentType').notEmpty().withMessage('Content type is required'),
    query('fileName').optional().trim(),
  ]),
  (req, res) => {
    res.status(501).json({ message: 'Get presigned URL endpoint - To be implemented' });
  }
);

export default router;
