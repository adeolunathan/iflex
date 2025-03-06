// frontend/src/types/auth.ts

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
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    expiresAt: string | null;
    loading: boolean;
    error: string | null;
  }