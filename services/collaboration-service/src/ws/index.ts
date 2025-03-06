// services/collaboration-service/src/ws/index.ts

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { 
  getOrCreateModelSession, 
  addUserToModelSession,
  removeUserFromModelSession,
  updateUserCursor,
  addOperation,
  getUserActiveSessions,
} from '../db';
import { verifyToken, getUserInfo } from '../utils/auth';
import { applyOperation } from '../utils/model';
import { User, Operation, OperationType } from '../types';

interface ClientConnection {
  ws: WebSocket;
  isAlive: boolean;
  userId: string;
  user: User | null;
  token: string;
  modelId: string | null;
}

export class CollaborationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private interval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.wss = new WebSocketServer({ port: Number(config.wsPort) });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
    
    // Setup heartbeat
    this.interval = setInterval(this.checkConnections.bind(this), 30000);
    
    console.log(`WebSocket server started on port ${config.wsPort}`);
  }
  
  private async handleConnection(ws: WebSocket, request: any) {
    // Parse URL to get the token
    const url = new URL(request.url, `http://localhost:${config.wsPort}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('Connection rejected: No token provided');
      ws.close(1008, 'Token required');
      return;
    }
    
    // Verify token
    const tokenData = await verifyToken(token);
    if (!tokenData) {
      console.log('Connection rejected: Invalid token');
      ws.close(1008, 'Invalid token');
      return;
    }
    
    // Get user info
    const user = await getUserInfo(tokenData.userId, token);
    if (!user) {
      console.log('Connection rejected: Failed to get user info');
      ws.close(1008, 'Failed to get user info');
      return;
    }
    
    console.log(`New connection: ${user.name} (${user.id})`);
    
    // Initialize client
    const client: ClientConnection = {
      ws,
      isAlive: true,
      userId: tokenData.userId,
      user,
      token,
      modelId: null,
    };
    
    this.clients.set(ws, client);
    
    // Setup event handlers
    ws.on('message', (message: string) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', (error: Error) => this.handleError(ws, error));
    ws.on('pong', () => this.handlePong(ws));
    
    // Send welcome message
    this.sendToClient(ws, {
      type: 'CONNECTED',
      userId: user.id,
      user,
    });
    
    // Check if user has any active sessions and reconnect them
    const activeSessions = await getUserActiveSessions(user.id);
    if (activeSessions.length > 0) {
      this.sendToClient(ws, {
        type: 'ACTIVE_SESSIONS',
        sessions: activeSessions,
      });
    }
  }
  
  private async handleMessage(ws: WebSocket, message: string) {
    const client = this.clients.get(ws);
    if (!client) return;
    
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'JOIN_MODEL':
          await this.handleJoinModel(client, data.modelId);
          break;
          
        case 'LEAVE_MODEL':
          await this.handleLeaveModel(client);
          break;
          
        case 'CURSOR_MOVE':
          await this.handleCursorMove(client, data.position);
          break;
          
        case 'OPERATION':
          await this.handleOperation(client, data.operation);
          break;
          
        case 'PING':
          this.sendToClient(ws, { type: 'PONG' });
          break;
          
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToClient(ws, {
        type: 'ERROR',
        message: 'Error processing message',
      });
    }
  }
  
  private async handleJoinModel(client: ClientConnection, modelId: string) {
    // If client is already in a model, leave it first
    if (client.modelId) {
      await this.handleLeaveModel(client);
    }
    
    // Update client
    client.modelId = modelId;
    
    // Add user to model session
    if (client.user) {
      const session = await addUserToModelSession(modelId, client.user);
      
      // Notify all clients in the model
      this.broadcastToModel(modelId, {
        type: 'USER_JOINED',
        modelId,
        user: client.user,
        users: session.connectedUsers,
        cursors: session.cursors,
      });
      
      // Send current state to the client
      this.sendToClient(client.ws, {
        type: 'MODEL_JOINED',
        modelId,
        users: session.connectedUsers,
        cursors: session.cursors,
        operations: session.lastOperations,
      });
      
      console.log(`User ${client.user.name} joined model ${modelId}`);
    }
  }
  
  private async handleLeaveModel(client: ClientConnection) {
    const { modelId, userId, user } = client;
    
    if (!modelId) return;
    
    // Remove user from model session
    const session = await removeUserFromModelSession(modelId, userId);
    
    // Clear client's model
    const oldModelId = client.modelId;
    client.modelId = null;
    
    if (session && user) {
      // Notify all clients in the model
      this.broadcastToModel(oldModelId, {
        type: 'USER_LEFT',
        modelId: oldModelId,
        userId,
        users: session.connectedUsers,
      });
      
      console.log(`User ${user.name} left model ${oldModelId}`);
    }
  }
  
  private async handleCursorMove(client: ClientConnection, position: { x: number, y: number }) {
    const { modelId, userId } = client;
    
    if (!modelId || !position) return;
    
    // Update cursor position
    await updateUserCursor(modelId, userId, position);
    
    // Broadcast to all clients in the model
    this.broadcastToModel(modelId, {
      type: 'CURSOR_MOVED',
      modelId,
      userId,
      position,
    }, [userId]); // Exclude the sender
  }
  
  private async handleOperation(client: ClientConnection, operationData: any) {
    const { modelId, userId, token } = client;
    
    if (!modelId || !operationData) return;
    
    // Create operation
    const operation: Operation = {
      id: uuidv4(),
      type: operationData.type as OperationType,
      modelId,
      userId,
      timestamp: new Date(),
      componentId: operationData.componentId,
      data: operationData.data,
    };
    
    // Apply operation to the model service
    const success = await applyOperation(operation, token);
    
    if (success) {
      // Add to operation history
      await addOperation(operation);
      
      // Broadcast to all clients in the model
      this.broadcastToModel(modelId, {
        type: 'OPERATION_APPLIED',
        modelId,
        operation,
      }, [userId]); // Exclude the sender
      
      // Confirm to the sender
      this.sendToClient(client.ws, {
        type: 'OPERATION_CONFIRMED',
        modelId,
        operationId: operation.id,
      });
      
      console.log(`Operation ${operation.type} applied by user ${userId} on model ${modelId}`);
    } else {
      // Notify the sender of failure
      this.sendToClient(client.ws, {
        type: 'OPERATION_FAILED',
        modelId,
        operationId: operation.id,
        message: 'Failed to apply operation',
      });
      
      console.log(`Operation ${operation.type} failed for user ${userId} on model ${modelId}`);
    }
  }
  
  private handleClose(ws: WebSocket) {
    const client = this.clients.get(ws);
    
    if (client) {
      // If client was in a model, leave it
      if (client.modelId) {
        this.handleLeaveModel(client);
      }
      
      // Remove client
      this.clients.delete(ws);
      
      if (client.user) {
        console.log(`Connection closed: ${client.user.name} (${client.userId})`);
      }
    }
  }
  
  private handleError(ws: WebSocket, error: Error) {
    console.error('WebSocket error:', error);
    const client = this.clients.get(ws);
    
    if (client && client.user) {
      console.log(`Error for client: ${client.user.name} (${client.userId})`);
    }
  }
  
  private handlePong(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      client.isAlive = true;
    }
  }
  
  private handleServerError(error: Error) {
    console.error('WebSocket server error:', error);
  }
  
  private checkConnections() {
    this.clients.forEach((client, ws) => {
      if (!client.isAlive) {
        return ws.terminate();
      }
      
      client.isAlive = false;
      ws.ping();
    });
  }
  
  private sendToClient(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
  
  private broadcastToModel(modelId: string, data: any, excludeUserIds: string[] = []) {
    this.clients.forEach((client, ws) => {
      if (client.modelId === modelId && !excludeUserIds.includes(client.userId)) {
        this.sendToClient(ws, data);
      }
    });
  }
  
  public shutdown() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    this.wss.close();
  }
}