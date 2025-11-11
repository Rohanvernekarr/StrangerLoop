import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import matchingQueue from './matchingQueue';
import { SignalingData, ChatMessage } from './types';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST']
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'StrangerLoop signaling server',
    waiting: matchingQueue.getWaitingCount(),
    active: matchingQueue.getActiveCount()
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    waiting: matchingQueue.getWaitingCount(),
    activeChats: matchingQueue.getActiveCount()
  });
});

// Socket.io connection handling
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle finding a match
  socket.on('find-match', () => {
    console.log(`\n=== FIND MATCH REQUEST ===`);
    console.log(`User ${socket.id} looking for match...`);
    console.log(`Current queue size: ${matchingQueue.getWaitingCount()}`);
    console.log(`Active connections: ${matchingQueue.getActiveCount()}`);
    
    const partnerId = matchingQueue.addUser(socket.id);
    
    if (partnerId) {
      // Match found!
      console.log(`🎉 MATCH FOUND: ${socket.id} <-> ${partnerId}`);
      
      // The new user (socket.id) becomes the caller, existing user (partnerId) becomes receiver
      socket.emit('match-found', { partnerId, shouldInitiate: true });
      io.to(partnerId).emit('match-found', { partnerId: socket.id, shouldInitiate: false });
      
      console.log(`✅ Match notifications sent`);
    } else {
      // Added to waiting queue
      socket.emit('waiting');
      console.log(`⏳ User ${socket.id} added to waiting queue (size: ${matchingQueue.getWaitingCount()})`);
    }
    console.log(`=== END FIND MATCH ===\n`);
  });

  // WebRTC Signaling
  socket.on('offer', (data: SignalingData) => {
    console.log(`Offer from ${socket.id} to ${data.to}`);
    io.to(data.to).emit('offer', {
      ...data,
      from: socket.id
    });
  });

  socket.on('answer', (data: SignalingData) => {
    console.log(`Answer from ${socket.id} to ${data.to}`);
    io.to(data.to).emit('answer', {
      ...data,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data: SignalingData) => {
    console.log(`ICE candidate from ${socket.id} to ${data.to}`);
    io.to(data.to).emit('ice-candidate', {
      ...data,
      from: socket.id
    });
  });

  // Text chat
  socket.on('chat-message', (data: ChatMessage) => {
    const partnerId = matchingQueue.getPartner(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('chat-message', {
        ...data,
        from: socket.id
      });
    }
  });

  // Handle skip/next
  socket.on('skip', () => {
    console.log(`User ${socket.id} skipping...`);
    
    const partnerId = matchingQueue.removeUser(socket.id);
    
    if (partnerId) {
      // Notify partner they were skipped
      io.to(partnerId).emit('partner-disconnected');
      
      // Find new match for partner
      const newPartnerId = matchingQueue.addUser(partnerId);
      if (newPartnerId) {
        // Partner becomes the caller, new user becomes receiver
        io.to(partnerId).emit('match-found', { partnerId: newPartnerId, shouldInitiate: true });
        io.to(newPartnerId).emit('match-found', { partnerId, shouldInitiate: false });
      } else {
        io.to(partnerId).emit('waiting');
      }
    }
    
    // Find new match for current user
    const newMatch = matchingQueue.addUser(socket.id);
    if (newMatch) {
      // Current user becomes the caller, matched user becomes receiver  
      socket.emit('match-found', { partnerId: newMatch, shouldInitiate: true });
      io.to(newMatch).emit('match-found', { partnerId: socket.id, shouldInitiate: false });
    } else {
      socket.emit('waiting');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const partnerId = matchingQueue.removeUser(socket.id);
    
    if (partnerId) {
      // Notify partner about disconnection
      io.to(partnerId).emit('partner-disconnected');
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
