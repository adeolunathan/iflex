import express from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";

const app = express();
const PORT = process.env.PORT || 4000;

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen(PORT, () => {
    console.log(`calculation-engine running at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();

