// services/integration-service/src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config } from './config';
import { connectDb } from './db';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Ensure upload directory exists
fs.mkdirSync(config.fileUploadPath, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.fileUploadPath);
  },
  filename: (req, file, cb) => {
    // Use a unique filename to avoid collisions
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
  },
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    filePath: req.file.path,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

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
  server.applyMiddleware({ app });

  app.listen(config.port, () => {
    console.log(`Integration Service running at http://localhost:${config.port}${server.graphqlPath}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});