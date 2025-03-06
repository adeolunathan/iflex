// services/export-service/src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import path from 'path';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config } from './config';
import { connectDb } from './db';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { startJobProcessor, startJobCleaner } from './services/job-processor';

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Serve exported files
app.use('/exports', express.static(path.join(__dirname, '..', config.uploadDir)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

async function startServer() {
  // Connect to databases
  await connectDb();
  
  // Start job processor and cleaner
  startJobProcessor();
  startJobCleaner();
  
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
  server.applyMiddleware({ app });

  app.listen(config.port, () => {
    console.log(`Export Service running at http://localhost:${config.port}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});