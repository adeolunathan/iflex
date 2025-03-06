// services/user-management/src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config } from './config';
import { connectDb } from './db';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';

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

  app.listen(config.port, () => {
    console.log(`User Management Service running at http://localhost:${config.port}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});