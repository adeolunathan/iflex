// services/collaboration-service/src/db/index.ts

import { createClient } from 'redis';
import { config } from '../config';
import { ModelSession, Operation, User, Cursor } from '../types';

// Redis connection
export const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis
export const connectDb = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
    return true;
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
};

// Redis key patterns
const MODEL_SESSION_KEY = (modelId: string) => `model:session:${modelId}`;
const MODEL_OPERATIONS_KEY = (modelId: string) => `model:operations:${modelId}`;
const USER_SESSIONS_KEY = (userId: string) => `user:sessions:${userId}`;

// Model Session operations
export const getModelSession = async (modelId: string): Promise<ModelSession | null> => {
  try {
    const sessionData = await redisClient.get(MODEL_SESSION_KEY(modelId));
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Error getting model session:', error);
    return null;
  }
};

export const createModelSession = async (modelId: string): Promise<ModelSession> => {
  const newSession: ModelSession = {
    id: modelId, // Using modelId as session id for simplicity
    modelId,
    connectedUsers: [],
    cursors: {},
    lastOperations: [],
    created: new Date(),
    updated: new Date(),
  };
  
  await redisClient.set(MODEL_SESSION_KEY(modelId), JSON.stringify(newSession));
  return newSession;
};

export const getOrCreateModelSession = async (modelId: string): Promise<ModelSession> => {
  const session = await getModelSession(modelId);
  if (session) return session;
  return createModelSession(modelId);
};

export const updateModelSession = async (session: ModelSession): Promise<void> => {
  session.updated = new Date();
  await redisClient.set(MODEL_SESSION_KEY(session.modelId), JSON.stringify(session));
};

// User session operations
export const addUserToModelSession = async (modelId: string, user: User): Promise<ModelSession> => {
  const session = await getOrCreateModelSession(modelId);
  
  // Check if user is already in the session
  if (!session.connectedUsers.find(u => u.id === user.id)) {
    session.connectedUsers.push(user);
    
    // Add model to user's active sessions
    await redisClient.sAdd(USER_SESSIONS_KEY(user.id), modelId);
  }
  
  await updateModelSession(session);
  return session;
};

export const removeUserFromModelSession = async (modelId: string, userId: string): Promise<ModelSession | null> => {
  const session = await getModelSession(modelId);
  if (!session) return null;
  
  // Remove user from connected users
  session.connectedUsers = session.connectedUsers.filter(u => u.id !== userId);
  
  // Remove user's cursor
  if (session.cursors[userId]) {
    delete session.cursors[userId];
  }
  
  // Remove model from user's active sessions
  await redisClient.sRem(USER_SESSIONS_KEY(userId), modelId);
  
  // If no users left, we could clean up, but for now we'll keep the session
  await updateModelSession(session);
  return session;
};

export const getUserActiveSessions = async (userId: string): Promise<string[]> => {
  return await redisClient.sMembers(USER_SESSIONS_KEY(userId));
};

// Cursor operations
export const updateUserCursor = async (modelId: string, userId: string, position: { x: number, y: number }): Promise<void> => {
  const session = await getOrCreateModelSession(modelId);
  
  session.cursors[userId] = {
    userId,
    position,
  };
  
  await updateModelSession(session);
};

// Operation history
export const addOperation = async (operation: Operation): Promise<void> => {
  const session = await getOrCreateModelSession(operation.modelId);
  
  // Add to session's last operations
  session.lastOperations.unshift(operation);
  
  // Keep only the last N operations
  if (session.lastOperations.length > config.operationHistoryLimit) {
    session.lastOperations = session.lastOperations.slice(0, config.operationHistoryLimit);
  }
  
  await updateModelSession(session);
  
  // Also add to the operation history in a separate list (could be useful for recovery/undo)
  await redisClient.lPush(MODEL_OPERATIONS_KEY(operation.modelId), JSON.stringify(operation));
  
  // Cap the list size
  await redisClient.lTrim(MODEL_OPERATIONS_KEY(operation.modelId), 0, config.operationHistoryLimit * 10);
};

export const getOperationHistory = async (modelId: string, limit: number = 100): Promise<Operation[]> => {
  const operations = await redisClient.lRange(MODEL_OPERATIONS_KEY(modelId), 0, limit - 1);
  return operations.map(op => JSON.parse(op));
};