import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../config/logger';
import { JwtPayload } from '../middleware/auth.middleware';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export function initializeSocketIO(io: SocketIOServer): void {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token as string, config.jwt.accessSecret) as JwtPayload;
      socket.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket.IO authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    logger.info(`User connected via WebSocket: ${userId}`);

    // Join user's personal room for notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Handle joining conversation rooms
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.debug(`User ${userId} joined conversation: ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.debug(`User ${userId} left conversation: ${conversationId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data: {
      conversationId: string;
      text?: string;
      mediaUrl?: string;
      receiverId: string;
    }) => {
      try {
        // TODO: Validate and save message to database
        // TODO: Emit message to conversation participants
        
        const message = {
          id: 'temp-id', // Replace with actual DB ID
          conversationId: data.conversationId,
          senderId: userId,
          receiverId: data.receiverId,
          text: data.text,
          mediaUrl: data.mediaUrl,
          createdAt: new Date().toISOString(),
        };

        // Emit to conversation room
        io.to(`conversation:${data.conversationId}`).emit('new_message', message);
        
        // Emit notification to receiver
        io.to(`user:${data.receiverId}`).emit('notification', {
          type: 'message',
          senderId: userId,
          conversationId: data.conversationId,
        });

        logger.debug(`Message sent in conversation: ${data.conversationId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { conversationId: string; receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data: { conversationId: string; receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: userId,
        isTyping: false,
      });
    });

    // Handle message read receipts
    socket.on('message_read', (data: { conversationId: string; messageId: string; senderId: string }) => {
      // TODO: Update message read status in database
      
      io.to(`user:${data.senderId}`).emit('message_read_receipt', {
        conversationId: data.conversationId,
        messageId: data.messageId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    });

    // Handle online status
    socket.on('update_status', (status: 'online' | 'away' | 'offline') => {
      // TODO: Update user status in Redis
      // TODO: Broadcast to user's contacts
      logger.debug(`User ${userId} status updated to: ${status}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`User disconnected from WebSocket: ${userId}`);
      // TODO: Update user's last seen timestamp
      // TODO: Broadcast offline status to contacts
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  logger.info('Socket.IO event handlers initialized');
}

// Helper function to emit notifications to specific users
export function emitNotificationToUser(
  io: SocketIOServer,
  userId: string,
  notification: any
): void {
  io.to(`user:${userId}`).emit('notification', notification);
}

// Helper function to emit message to conversation
export function emitMessageToConversation(
  io: SocketIOServer,
  conversationId: string,
  message: any
): void {
  io.to(`conversation:${conversationId}`).emit('new_message', message);
}

export default { initializeSocketIO, emitNotificationToUser, emitMessageToConversation };
