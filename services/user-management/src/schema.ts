// services/user-management/src/schema.ts

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum UserRole {
    ADMIN
    MANAGER
    EDITOR
    VIEWER
  }

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    roles: [UserRole!]!
    organizationId: ID!
    isActive: Boolean!
    lastLogin: String
    createdAt: String!
    updatedAt: String!
  }

  type Organization {
    id: ID!
    name: String!
    plan: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    users: [User!]!
  }

  type Session {
    id: ID!
    token: String!
    expiresAt: String!
  }

  type AuthResponse {
    user: User!
    token: String!
    expiresAt: String!
  }

  type Permission {
    id: ID!
    name: String!
    description: String!
    resource: String!
    action: String!
  }

  type RolePermissions {
    role: UserRole!
    permissions: [Permission!]!
  }

  input CreateUserInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    roles: [UserRole!]!
    organizationId: ID!
  }

  input UpdateUserInput {
    email: String
    firstName: String
    lastName: String
    roles: [UserRole!]
    isActive: Boolean
  }

  input CreateOrganizationInput {
    name: String!
    plan: String!
  }

  input UpdateOrganizationInput {
    name: String
    plan: String
    isActive: Boolean
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ChangePasswordInput {
    oldPassword: String!
    newPassword: String!
  }

  type Query {
    me: User
    user(id: ID!): User
    users(organizationId: ID!): [User!]!
    organization(id: ID!): Organization
    organizations: [Organization!]!
    permissions: [Permission!]!
    rolePermissions(role: UserRole!): RolePermissions
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
    deleteOrganization(id: ID!): Boolean!
    
    login(input: LoginInput!): AuthResponse!
    logout: Boolean!
    refreshToken: AuthResponse!
    changePassword(input: ChangePasswordInput!): Boolean!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!
  }
`;
