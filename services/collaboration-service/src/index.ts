// services/collaboration-service/src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config } from './config';
import { connectDb } from './db';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { CollaborationWebSocketServer } from './ws';

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(authMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

async function startServer() {
  // Connect to databases
  await connectDb();
  
  // Start WebSocket server
  const wsServer = new CollaborationWebSocketServer();
  
  // Set up Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }: { req: AuthenticatedRequest }) => {
      return {
        user: req.user,
        sessionId: req.sessionId,
      };
    },
  });

  await server.start();
  server.applyMiddleware({
    app,
    cors: false, // We've already configured CORS
  });

  // Start HTTP server
  app.listen(config.port, () => {
    console.log(`Collaboration Service running at http://localhost:${config.port}${server.graphqlPath}`);
    console.log(`WebSocket server running at ws://localhost:${config.wsPort}`);
  });
  
  // Handle shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    wsServer.shutdown();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    wsServer.shutdown();
    process.exit(0);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});