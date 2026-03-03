import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, inArray, or } from 'drizzle-orm'; // Common Drizzle operators
import { pgTable, serial, varchar, timestamp, text, primaryKey } from 'drizzle-orm/pg-core'; // Drizzle PG types

// --- Drizzle Schema Definitions (in a real app, this would be in drizzle/schema.ts) ---
// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }), // Optional, for group chats
  type: varchar('type', { length: 50 }).notNull(), // 'dm' or 'group'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Many-to-many relationship table between Users and Conversations
export const usersToConversations = pgTable('users_to_conversations', {
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: serial('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey(t.userId, t.conversationId),
}));

// --- Drizzle DB Client (in a real app, this would be in db/index.ts) ---
// This is a minimal mock for demonstration purposes to make the file self-contained and 'runnable'.
// In a real application, you'd initialize a Drizzle instance with your PG driver:
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { Pool } from 'pg';
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const db = drizzle(pool, { schema: { users, conversations, usersToConversations } });

// Mock database instance for Drizzle operations
const db = {
  select: () => ({
    from: () => ({
      where: () => ({
        execute: () => Promise.resolve([]), // Default empty array
      }),
      innerJoin: () => ({
        where: () => ({
          execute: () => Promise.resolve([]),
        }),
        // Mock for chaining multiple joins (e.g., for participants)
        // This is a very basic mock and won't simulate complex Drizzle relations correctly.
        // A real DB setup is needed for proper execution.
        leftJoin: () => ({
          where: () => ({ execute: () => Promise.resolve([]) })
        })
      })
    })
  }),
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: (fields: any) => Promise.resolve([
        // Mock data for inserts, customize based on fields and table
        { ...data, id: Math.floor(Math.random() * 1000) + 1, createdAt: new Date(), updatedAt: new Date() }
      ]),
      execute: () => Promise.resolve({ rowsAffected: 1 }) // For non-returning inserts
    })
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: () => ({
        returning: (fields: any) => Promise.resolve([
          // Mock data for updates, customize based on fields
          { ...data, id: 1, updatedAt: new Date() } // Assume id 1 for updates for simplicity
        ]),
        execute: () => Promise.resolve({ rowsAffected: 1 }) // For non-returning updates
      })
    })
  }),
  delete: (table: any) => ({
    where: () => ({
      execute: () => Promise.resolve({ rowsAffected: 1 }), // Simulate successful delete
    })
  }),
};

// --- JWT Configuration ---
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Use a strong secret in production
const JWT_EXPIRES_IN = '1h';

// --- JWT Helper ---
const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// --- Authentication Middleware ---
interface AuthenticatedRequest extends express.Request {
  user?: { id: number; username: string; email: string };
}

const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // No token

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403); // Token not valid or expired
    req.user = user as { id: number; username: string; email: string };
    next();
  });
};

// --- Express Router ---
const router = express.Router();

// --- Auth Routes ---
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists (mocked DB call)
    // In a real app:
    // const existingUser = await db.select().from(users).where(or(eq(users.username, username), eq(users.email, email))).execute();
    // For mock, always assume new user for simplicity unless specific mock data is set up.
    const existingUser = []; // Simulate no existing user for success path
    // if (username === 'testuser' || email === 'test@example.com') existingUser.push({});

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Username or email already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
    }).returning({ id: users.id, username: users.username, email: users.email }).execute();

    const token = generateToken({ id: newUser.id, username: newUser.username, email: newUser.email });
    res.status(201).json({ user: newUser, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Mock user for login
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', passwordHash: await bcrypt.hash('password123', 10) };

    // In a real app:
    // const [user] = await db.select().from(users).where(eq(users.email, email)).execute();
    const user = email === mockUser.email ? mockUser : undefined;

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, username: user.username, email: user.email });
    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- User Management Routes (Protected) ---
router.get('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Mock user data
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', createdAt: new Date(), updatedAt: new Date() };

    // In a real app:
    // const [user] = await db.select({ ... }).from(users).where(eq(users.id, userId)).execute();
    const user = userId === mockUser.id ? mockUser : undefined;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (req.user?.id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this profile' });
    }

    const updateFields: { username?: string; email?: string; updatedAt?: Date } = { updatedAt: new Date() };
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;

    if (Object.keys(updateFields).length === 1 && updateFields.updatedAt) { // Only updatedAt, no actual change
        return res.status(400).json({ message: 'No fields provided for update' });
    }

    // Mock updated user
    const mockUpdatedUser = { id: userId, username: username || 'testuser', email: email || 'test@example.com', createdAt: new Date(), updatedAt: new Date() };

    // In a real app:
    // const [updatedUser] = await db.update(users).set(updateFields).where(eq(users.id, userId)).returning({ ... }).execute();
    const updatedUser = mockUpdatedUser; // Always 'succeed' for mock

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found or nothing to update' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Conversation Management Routes (Protected) ---
router.post('/conversations', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, type, participantIds } = req.body; // type: 'dm' or 'group'

    if (!type || !['dm', 'group'].includes(type)) {
      return res.status(400).json({ message: "Conversation type must be 'dm' or 'group'" });
    }

    if (type === 'group' && !name) {
      return res.status(400).json({ message: 'Group conversations require a name' });
    }
    if (type === 'dm' && (!participantIds || participantIds.length !== 1)) {
        return res.status(400).json({ message: 'DM conversations require exactly one participant ID' });
    }

    const currentUserId = req.user!.id;
    const participants = new Set([currentUserId, ...(participantIds || [])].map(Number));

    // Ensure all participants exist (mocked check)
    // In a real app:
    // const existingParticipants = await db.select({ id: users.id }).from(users).where(inArray(users.id, Array.from(participants))).execute();
    // For mock, assume all participant IDs passed are valid.
    const existingParticipants = Array.from(participants).map(id => ({ id }));
    if (existingParticipants.length !== participants.size) {
        return res.status(400).json({ message: 'One or more participants not found' });
    }

    // For DM, a more robust check would see if a conversation already exists between these two users.
    // Skipping complex DM duplicate check for this mock.

    const [newConversation] = await db.insert(conversations).values({
      name: type === 'group' ? name : null,
      type,
    }).returning({ id: conversations.id, name: conversations.name, type: conversations.type }).execute();

    // Add participants to the conversation (mocked insertion)
    // In a real app: await db.insert(usersToConversations).values(userConversationInserts).execute();
    // For mock, just assume success.

    res.status(201).json({ ...newConversation, participants: Array.from(participants) });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/conversations', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id;

    // Mock user's conversations
    const mockConversations = [
        { id: 101, name: 'General Chat', type: 'group', createdAt: new Date() },
        { id: 102, name: null, type: 'dm', createdAt: new Date() },
    ];

    // In a real app:
    // const userConversations = await db.select({ ... }).from(conversations).innerJoin(usersToConversations, ...).where(eq(usersToConversations.userId, currentUserId)).execute();
    const userConversations = mockConversations; // Always return mock data for 'testuser'

    res.json(userConversations);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/conversations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    const currentUserId = req.user!.id;

    // Mock participant check and conversation data
    // Assume 'testuser' (id:1) is a participant in mock conversations 101, 102.
    const isParticipant = (conversationId === 101 || conversationId === 102) ? {} : undefined; // Simulate presence
    if (!isParticipant) {
      return res.status(403).json({ message: 'Unauthorized to access this conversation' });
    }

    let conversation: any;
    let participants: any[] = [];

    if (conversationId === 101) {
      conversation = { id: 101, name: 'General Chat', type: 'group', createdAt: new Date() };
      participants = [{ id: 1, username: 'testuser', email: 'test@example.com' }, { id: 2, username: 'otheruser', email: 'other@example.com' }];
    } else if (conversationId === 102) {
      conversation = { id: 102, name: null, type: 'dm', createdAt: new Date() };
      participants = [{ id: 1, username: 'testuser', email: 'test@example.com' }, { id: 3, username: 'dmpartner', email: 'dm@example.com' }];
    } else {
      conversation = undefined;
    }

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({ ...conversation, participants });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/conversations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { name } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Conversation name is required for update' });
    }

    const currentUserId = req.user!.id;

    // Mock participant check
    const isParticipant = (conversationId === 101) ? {} : undefined; // Assume only group 101 is updatable by current user
    if (!isParticipant) {
      return res.status(403).json({ message: 'Unauthorized to update this conversation' });
    }

    // Mock updated conversation
    const updatedConversation = { id: conversationId, name: name, type: 'group', updatedAt: new Date() };

    // In a real app:
    // const [updatedConversation] = await db.update(conversations).set({ name, updatedAt: new Date() }).where(eq(conversations.id, conversationId)).returning({ ... }).execute();

    if (!updatedConversation) {
      return res.status(404).json({ message: 'Conversation not found or nothing to update' });
    }

    res.json(updatedConversation);
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/conversations/:id/participants', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { userIdToAdd } = req.body;

    if (isNaN(conversationId) || isNaN(userIdToAdd)) {
      return res.status(400).json({ message: 'Invalid conversation or user ID' });
    }

    const currentUserId = req.user!.id;

    // Mock participant check for current user
    const isCurrentUserParticipant = (conversationId === 101) ? {} : undefined; // Only group 101 allows adding
    if (!isCurrentUserParticipant) {
      return res.status(403).json({ message: 'Unauthorized to add participants to this conversation' });
    }

    // Mock conversation type check
    const conversation = { id: conversationId, type: 'group' }; // Assume it's a group chat for adding
    if (!conversation) { return res.status(404).json({ message: 'Conversation not found' }); }
    if (conversation.type === 'dm') {
        return res.status(400).json({ message: 'Cannot add participants to a direct message conversation' });
    }

    // Mock check if userIdToAdd exists and is not already a participant
    const userToAddExists = (userIdToAdd === 4); // Assume user ID 4 exists and is new
    if (!userToAddExists) { return res.status(404).json({ message: 'User to add not found' }); }
    const alreadyParticipant = (userIdToAdd === 1 || userIdToAdd === 2); // IDs 1 and 2 are mock existing
    if (alreadyParticipant) { return res.status(409).json({ message: 'User is already a participant' }); }

    // In a real app: await db.insert(usersToConversations).values({ userId: userIdToAdd, conversationId }).execute();
    res.status(200).json({ message: 'Participant added successfully' });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/conversations/:id/participants/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userIdToRemove = parseInt(req.params.userId);

    if (isNaN(conversationId) || isNaN(userIdToRemove)) {
      return res.status(400).json({ message: 'Invalid conversation or user ID' });
    }

    const currentUserId = req.user!.id;

    // Mock participant check for current user (assume current user can modify group 101)
    const isCurrentUserParticipant = (conversationId === 101) ? {} : undefined;
    if (!isCurrentUserParticipant) {
      return res.status(403).json({ message: 'Unauthorized to remove participants from this conversation' });
    }

    // Mock conversation and participant count
    const conversation = { id: conversationId, type: 'group' }; // Assume group for removal
    const currentParticipantCount = [{ userId: 1 }, { userId: 2 }, { userId: 4 }]; // Mock 3 participants

    if (!conversation) { return res.status(404).json({ message: 'Conversation not found' }); }

    // Prevent removing the last participant (or in DMs, the other person if not self-leaving)
    if (currentParticipantCount.length <= 1) {
        return res.status(400).json({ message: 'Cannot remove the last participant from a conversation.' });
    }

    // Logic for who can remove whom. For simplicity, assume user can only remove themselves
    // or if current user is implicitly 'admin' for group 101 (mock logic).
    if (currentUserId !== userIdToRemove && currentUserId !== 1) { // Assume only current user (ID 1) can remove others
        return res.status(403).json({ message: 'Unauthorized to remove this participant. Only the user themselves can leave, or an admin can remove others (admin roles not implemented).' });
    }

    // If it's a DM, stricter rules apply
    if (conversation.type === 'dm' && currentUserId !== userIdToRemove) {
        return res.status(403).json({ message: 'Cannot remove other users from a direct message conversation.' });
    }

    // Mock delete operation
    // In a real app: const result = await db.delete(usersToConversations).where(and(eq(usersToConversations.conversationId, conversationId), eq(usersToConversations.userId, userIdToRemove))).execute();
    const rowsAffected = (userIdToRemove === 2 || userIdToRemove === 4) ? 1 : 0; // Mock successful deletion for specific IDs
    if (rowsAffected === 0) {
        return res.status(404).json({ message: 'Participant not found in this conversation.' });
    }

    res.status(200).json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export the router for use in an Express app
export default router;

/*
// A simple app setup to demonstrate how this router would be used (in a real app, this would be in server.ts or app.ts)
// To run this, save it as `chatApi.ts` in `server/routes/` and create `app.ts` or `server.ts` like this:

// file: app.ts
import express from 'express';
import chatApiRoutes from './server/routes/chatApi'; // Adjust path as needed

const app = express();
app.use(express.json()); // Body parser middleware

// Mount the API routes under '/api' prefix
app.use('/api', chatApiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('To test:');
  console.log('1. Register: POST /api/auth/register { username, email, password }');
  console.log('2. Login: POST /api/auth/login { email, password } (will return JWT)');
  console.log('3. Use the JWT in the Authorization: Bearer <token> header for protected routes.');
  console.log('   - GET /api/users/1');
  console.log('   - POST /api/conversations { type: "group", name: "My Group", participantIds: [2, 3] }');
  console.log('   - GET /api/conversations');
  console.log('   - GET /api/conversations/101');
});
*/
