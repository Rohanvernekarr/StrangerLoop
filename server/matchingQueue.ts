import { User } from './types';

class MatchingQueue {
  private waitingUsers: Map<string, User> = new Map();
  private activeConnections: Map<string, string> = new Map(); 

  addUser(socketId: string): string | null {
    console.log(`Adding user ${socketId} to queue. Current waiting users:`, Array.from(this.waitingUsers.keys()));
    
    this.removeUser(socketId);
    
    const waitingSocketIds = Array.from(this.waitingUsers.keys()).filter(id => id !== socketId);
    
    if (waitingSocketIds.length > 0) {
      const partnerId = waitingSocketIds[0];
      this.waitingUsers.delete(partnerId);
      
      this.activeConnections.set(socketId, partnerId);
      this.activeConnections.set(partnerId, socketId);
      
      console.log(`Match created: ${socketId} <-> ${partnerId}`);
      return partnerId;
    } else {
      this.waitingUsers.set(socketId, {
        socketId,
        timestamp: Date.now()
      });
      console.log(`User ${socketId} added to waiting queue. Queue size: ${this.waitingUsers.size}`);
      return null;
    }
  }

  removeUser(socketId: string): string | null {
    this.waitingUsers.delete(socketId);
    
    const partnerId = this.activeConnections.get(socketId);
    if (partnerId) {
      this.activeConnections.delete(socketId);
      this.activeConnections.delete(partnerId);
      return partnerId;
    }
    
    return null;
  }

  getPartner(socketId: string): string | undefined {
    return this.activeConnections.get(socketId);
  }

  getWaitingCount(): number {
    return this.waitingUsers.size;
  }

  getActiveCount(): number {
    return this.activeConnections.size / 2;
  }
}

export default new MatchingQueue();
