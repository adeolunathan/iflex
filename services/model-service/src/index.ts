// services/model-service/src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config } from './config';
import { connectDb } from './db';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

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
    context: ({ req }) => {
      // Here you would add authentication logic
      // For now, we'll just return a dummy user context
      return {
        user: {
          id: 'system',
          roles: ['ADMIN'],
        },
      };
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(config.port, () => {
    console.log(`Model Service running at http://localhost:${config.port}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});