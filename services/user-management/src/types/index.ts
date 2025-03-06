// services/user-management/src/types/index.ts

export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EDITOR = 'EDITOR',
    VIEWER = 'VIEWER',
  }
  
  export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
    organizationId: string;
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Organization {
    id: string;
    name: string;
    plan: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface UserSession {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    lastActiveAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }
  
  export interface Permission {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
  }
  
  export interface RolePermission {
    role: UserRole;
    permissions: Permission[];
  }