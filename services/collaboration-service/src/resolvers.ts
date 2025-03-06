// services/collaboration-service/src/resolvers.ts

import { getModelSession, getOperationHistory, getUserActiveSessions } from './db';

export const resolvers = {
  Query: {
    modelSession: async (_: any, { modelId }: { modelId: string }, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      
      const session = await getModelSession(modelId);
      return session;
    },
    
    operationHistory: async (_: any, { modelId, limit }: { modelId: string, limit?: number }, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      
      const operations = await getOperationHistory(modelId, limit);
      
      // Convert data field from JSON string to object
      return operations.map(op => ({
        ...op,
        data: typeof op.data === 'string' ? JSON.parse(op.data) : op.data,
      }));
    },
    
    userActiveSessions: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      
      return getUserActiveSessions(context.user.id);
    },
  },
};