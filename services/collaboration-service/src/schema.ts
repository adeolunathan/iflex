// services/collaboration-service/src/schema.ts

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum OperationType {
    UPDATE_COMPONENT
    CREATE_COMPONENT
    DELETE_COMPONENT
    UPDATE_MODEL_METADATA
    UPDATE_VALUES
  }

  type Position {
    x: Float!
    y: Float!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
  }

  type Cursor {
    userId: ID!
    position: Position!
  }

  type Operation {
    id: ID!
    type: OperationType!
    modelId: ID!
    userId: ID!
    timestamp: String!
    componentId: ID
    data: String!
  }

  type ModelSession {
    id: ID!
    modelId: ID!
    connectedUsers: [User!]!
    cursors: [Cursor!]!
    lastOperations: [Operation!]!
    created: String!
    updated: String!
  }

  type Query {
    modelSession(modelId: ID!): ModelSession
    operationHistory(modelId: ID!, limit: Int): [Operation!]!
    userActiveSessions: [ID!]!
  }
`;