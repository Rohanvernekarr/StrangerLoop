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

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST']
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

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

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('find-match', () => {
    console.log(`\n=== FIND MATCH REQUEST ===`);
    console.log(`User ${socket.id} looking for match...`);
    console.log(`Current queue size: ${matchingQueue.getWaitingCount()}`);
    console.log(`Active connections: ${matchingQueue.getActiveCount()}`);
    
    const partnerId = matchingQueue.addUser(socket.id);
    
    if (partnerId) {
     
      console.log(`MATCH FOUND: ${socket.id} <-> ${partnerId}`);
      
      socket.emit('match-found', { partnerId, shouldInitiate: true });
      io.to(partnerId).emit('match-found', { partnerId: socket.id, shouldInitiate: false });
      
      console.log(`Match notifications sent`);
    } else {
      socket.emit('waiting');
      console.log(`User ${socket.id} added to waiting queue (size: ${matchingQueue.getWaitingCount()})`);
    }
    console.log(`=== END FIND MATCH ===\n`);
  });

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

  socket.on('skip', () => {
    console.log(`User ${socket.id} skipping...`);
    
    const partnerId = matchingQueue.removeUser(socket.id);
    
    if (partnerId) {
     
      io.to(partnerId).emit('partner-disconnected');
      
      const newPartnerId = matchingQueue.addUser(partnerId);
      if (newPartnerId) {
       
        io.to(partnerId).emit('match-found', { partnerId: newPartnerId, shouldInitiate: true });
        io.to(newPartnerId).emit('match-found', { partnerId, shouldInitiate: false });
      } else {
        io.to(partnerId).emit('waiting');
      }
    }
    
    const newMatch = matchingQueue.addUser(socket.id);
    if (newMatch) {
      
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
      io.to(partnerId).emit('partner-disconnected');
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
