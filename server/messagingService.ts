import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, drizzle } from 'drizzle-orm';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

// --- Drizzle Schema Definition ---
// Defines the structure of the 'messages' table in the database.
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(), // Unique identifier for each message
  roomId: text('room_id').notNull(), // Identifier for the chat room
  senderId: text('sender_id').notNull(), // ID of the user who sent the message
  content: text('content').notNull(), // The actual message text
  timestamp: timestamp('timestamp').defaultNow().notNull(), // When the message was sent
});

// TypeScript types for selecting and inserting messages
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

// --- Drizzle Client Initialization ---
// Connects to the PostgreSQL database using the 'postgres-js' driver.
// DATABASE_URL should be set in your environment variables (e.g., in a .env file).
// Example: 'postgres://user:password@localhost:5432/chat_db'
const client = postgres(process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/chat_db');
const db = drizzle(client, { schema: { messages } });

// --- Express App and Socket.io Server Setup ---
const app = express();
const httpServer = createServer(app);

// Initializes Socket.io and attaches it to the HTTP server.
// CORS is configured to allow connections from any origin for development simplicity.
// In a production environment, restrict 'origin' to your client application's URL.
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Basic Express route for a health check or simple API endpoint
app.get('/', (req, res) => {
  res.status(200).send('Real-time Messaging Service is running!');
});

// --- Socket.io Connection Logic ---
// This block handles new WebSocket connections and defines event listeners.
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Event: Client wants to join a specific chat room
  // Expected client payload: `{ roomId: 'uniqueRoomId', userId: 'userIdentifier' }`
  socket.on('joinRoom', async ({ roomId, userId }: { roomId: string; userId: string }) => {
    if (!roomId || !userId) {
      socket.emit('error', 'Missing roomId or userId to join room.');
      return;
    }
    
    socket.join(roomId); // Add the socket to the specified room
    console.log(`User ${userId} (socket: ${socket.id}) joined room: ${roomId}`);

    // Optional: Fetch previous messages for this room and send them to the joining user
    try {
      const messageHistory = await db.select()
                                .from(messages)
                                .where(eq(messages.roomId, roomId))
                                .orderBy(messages.timestamp) // Order by timestamp to get messages chronologically
                                .limit(50); // Limit history to the last 50 messages for performance
      socket.emit('messageHistory', messageHistory); // Send history to the specific client
    } catch (error) {
      console.error(`Error fetching message history for room ${roomId}:`, error);
      socket.emit('error', 'Failed to load message history.');
    }

    // Notify other users in the room that a new user has joined
    // `socket.to(roomId)` sends to all sockets in the room EXCEPT the sender.
    socket.to(roomId).emit('userJoined', { userId, roomId, message: `${userId} has joined the room.` });
  });

  // Event: Client sends a chat message
  // Expected client payload: `{ roomId: 'uniqueRoomId', senderId: 'userIdentifier', content: 'Hello everyone!' }`
  socket.on('chatMessage', async ({ roomId, senderId, content }: { roomId: string; senderId: string; content: string }) => {
    if (!roomId || !senderId || !content) {
      socket.emit('error', 'Missing roomId, senderId, or content for chat message.');
      return;
    }

    try {
      // 1. Persist the new message to the database
      // The `returning()` clause ensures the inserted message (with its generated ID and timestamp) is returned.
      const [newMessage] = await db.insert(messages).values({ roomId, senderId, content }).returning();
      
      // 2. Broadcast the message to all participants in the specific room
      // `io.to(roomId)` sends to all sockets in the room, including the sender.
      io.to(roomId).emit('message', newMessage); // Emit the full message object
      console.log(`Message in room ${roomId} from ${senderId}: ${content}`);

    } catch (error) {
      console.error('Error saving or broadcasting message:', error);
      socket.emit('error', 'Failed to send message.');
    }
  });

  // Event: Client disconnects from the server
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // In a production application, you might broadcast a 'userLeft' event to rooms
    // or clean up any user-specific data stored on the server.
  });

  // Handle generic socket errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// --- Start the Server ---
// Starts the HTTP server, which also serves the Socket.io connections.
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server accessible at ws://localhost:${PORT}`);
  console.log('To run this service:
  1. Ensure Node.js and PostgreSQL are installed.
  2. Create a database (e.g., 'chat_db') and update DATABASE_URL.
  3. Install dependencies: npm install express socket.io drizzle-orm postgres
  4. Set up Drizzle migrations to create the 'messages' table.
  5. Run: ts-node server/messagingService.ts (or compile with tsc and run node).');
});