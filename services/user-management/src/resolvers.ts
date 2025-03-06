// services/user-management/src/resolvers.ts

import { v4 as uuidv4 } from 'uuid';
import { ApolloError, AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { pgPool } from './db';
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  invalidateSession,
  invalidateAllUserSessions,
} from './utils/auth';
import { User, Organization, UserRole } from './types';

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        return null;
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM users WHERE id = $1',
          [context.user.id]
        );
        
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        console.error('Error fetching current user:', error);
        throw new ApolloError('Failed to fetch user information');
      }
    },
    
    user: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user is trying to access their own data or has admin/manager role
      const canAccessUserData = 
        id === context.user.id || 
        context.user.roles.includes(UserRole.ADMIN) || 
        (context.user.roles.includes(UserRole.MANAGER) && 
         context.user.organizationId === context.user.organizationId);
      
      if (!canAccessUserData) {
        throw new ForbiddenError('Not authorized to access this user data');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM users WHERE id = $1',
          [id]
        );
        
        return rows.length > 0 ? rows[0] : null;
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new ApolloError('Failed to fetch user information');
      }
    },
    
    users: async (_: any, { organizationId }: { organizationId: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user can access organization data
      const canAccessOrgData = 
        context.user.organizationId === organizationId && 
        (context.user.roles.includes(UserRole.ADMIN) || 
         context.user.roles.includes(UserRole.MANAGER));
      
      if (!canAccessOrgData) {
        throw new ForbiddenError('Not authorized to access organization users');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at DESC',
          [organizationId]
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw new ApolloError('Failed to fetch users');
      }
    },
    
    organization: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user can access organization data
      const canAccessOrgData = 
        context.user.organizationId === id || 
        context.user.roles.includes(UserRole.ADMIN);
      
      if (!canAccessOrgData) {
        throw new ForbiddenError('Not authorized to access this organization');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM organizations WHERE id = $1',
          [id]
        );
        
        if (rows.length === 0) {
          return null;
        }
        
        const org = rows[0];
        
        // Get users for this organization
        const { rows: userRows } = await pgPool.query(
          'SELECT * FROM users WHERE organization_id = $1',
          [id]
        );
        
        org.users = userRows;
        
        return org;
      } catch (error) {
        console.error('Error fetching organization:', error);
        throw new ApolloError('Failed to fetch organization');
      }
    },
    
    organizations: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Only super admins can access all organizations
      if (!context.user.roles.includes(UserRole.ADMIN)) {
        throw new ForbiddenError('Not authorized to access all organizations');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM organizations ORDER BY created_at DESC'
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching organizations:', error);
        throw new ApolloError('Failed to fetch organizations');
      }
    },
    
    permissions: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          'SELECT * FROM permissions ORDER BY resource, action'
        );
        
        return rows;
      } catch (error) {
        console.error('Error fetching permissions:', error);
        throw new ApolloError('Failed to fetch permissions');
      }
    },
    
    rolePermissions: async (_: any, { role }: { role: UserRole }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        const { rows } = await pgPool.query(
          `SELECT p.* 
           FROM permissions p
           JOIN role_permissions rp ON p.id = rp.permission_id
           WHERE rp.role = $1
           ORDER BY p.resource, p.action`,
          [role]
        );
        
        return {
          role,
          permissions: rows,
        };
      } catch (error) {
        console.error('Error fetching role permissions:', error);
        throw new ApolloError('Failed to fetch role permissions');
      }
    },
  },
  
  Mutation: {
    createUser: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user can create users in this organization
      const canCreateUser = 
        (context.user.organizationId === input.organizationId && 
         (context.user.roles.includes(UserRole.ADMIN) || 
          context.user.roles.includes(UserRole.MANAGER))) || 
        context.user.roles.includes(UserRole.ADMIN);
      
      if (!canCreateUser) {
        throw new ForbiddenError('Not authorized to create users in this organization');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if email already exists
        const { rows: existingUsers } = await client.query(
          'SELECT * FROM users WHERE email = $1',
          [input.email.toLowerCase()]
        );
        
        if (existingUsers.length > 0) {
          throw new ApolloError('Email already in use');
        }
        
        const userId = uuidv4();
        const hashedPassword = await hashPassword(input.password);
        const now = new Date().toISOString();
        
        const { rows } = await client.query(
          `INSERT INTO users (
            id, email, password_hash, first_name, last_name, roles,
            organization_id, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            userId,
            input.email.toLowerCase(),
            hashedPassword,
            input.firstName,
            input.lastName,
            input.roles,
            input.organizationId,
            true, // is_active
            now,
            now,
          ]
        );
        
        await client.query('COMMIT');
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    updateUser: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user can update this user
      const canUpdateUser = 
        id === context.user.id || 
        context.user.roles.includes(UserRole.ADMIN) || 
        (context.user.roles.includes(UserRole.MANAGER) && 
         context.user.organizationId === context.user.organizationId);
      
      if (!canUpdateUser) {
        throw new ForbiddenError('Not authorized to update this user');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if user exists
        const { rows: existingUsers } = await client.query(
          'SELECT * FROM users WHERE id = $1',
          [id]
        );
        
        if (existingUsers.length === 0) {
          throw new ApolloError('User not found');
        }
        
        const user = existingUsers[0];
        
        // If updating email, check if new email is already in use
        if (input.email && input.email.toLowerCase() !== user.email) {
          const { rows: emailCheck } = await client.query(
            'SELECT * FROM users WHERE email = $1 AND id != $2',
            [input.email.toLowerCase(), id]
          );
          
          if (emailCheck.length > 0) {
            throw new ApolloError('Email already in use');
          }
        }
        
        // Build update query
        let updateQuery = 'UPDATE users SET updated_at = $1';
        const queryParams: any[] = [new Date().toISOString()];
        let paramIndex = 2;
        
        if (input.email) {
          updateQuery += `, email = $${paramIndex}`;
          queryParams.push(input.email.toLowerCase());
          paramIndex++;
        }
        
        if (input.firstName) {
          updateQuery += `, first_name = $${paramIndex}`;
          queryParams.push(input.firstName);
          paramIndex++;
        }
        
        if (input.lastName) {
          updateQuery += `, last_name = $${paramIndex}`;
          queryParams.push(input.lastName);
          paramIndex++;
        }
        
        if (input.roles) {
          // Only admins can change roles
          if (!context.user.roles.includes(UserRole.ADMIN) && 
              context.user.id !== id) {
            throw new ForbiddenError('Not authorized to change user roles');
          }
          
          updateQuery += `, roles = $${paramIndex}`;
          queryParams.push(input.roles);
          paramIndex++;
        }
        
        if (input.isActive !== undefined) {
          // Only admins or managers can deactivate users
          if (!context.user.roles.includes(UserRole.ADMIN) && 
              !context.user.roles.includes(UserRole.MANAGER)) {
            throw new ForbiddenError('Not authorized to change user active status');
          }
          
          updateQuery += `, is_active = $${paramIndex}`;
          queryParams.push(input.isActive);
          paramIndex++;
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        queryParams.push(id);
        
        const { rows } = await client.query(updateQuery, queryParams);
        
        await client.query('COMMIT');
        
        return rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    deleteUser: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user can delete this user
      const canDeleteUser = 
        context.user.roles.includes(UserRole.ADMIN) || 
        (context.user.roles.includes(UserRole.MANAGER) && 
         context.user.organizationId === context.user.organizationId);
      
      if (!canDeleteUser) {
        throw new ForbiddenError('Not authorized to delete users');
      }
      
      // Users cannot delete themselves
      if (id === context.user.id) {
        throw new ApolloError('Cannot delete your own account');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Invalidate all sessions for this user
        await invalidateAllUserSessions(id);
        
        // Delete user
        const { rowCount } = await client.query(
          'DELETE FROM users WHERE id = $1',
          [id]
        );
        
        await client.query('COMMIT');
        
        return rowCount > 0;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting user:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    createOrganization: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Only admins can create organizations
      if (!context.user.roles.includes(UserRole.ADMIN)) {
        throw new ForbiddenError('Not authorized to create organizations');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        const orgId = uuidv4();
        const now = new Date().toISOString();
        
        const { rows } = await client.query(
          `INSERT INTO organizations (
            id, name, plan, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            orgId,
            input.name,
            input.plan,
            true, // is_active
            now,
            now,
          ]
        );
        
        await client.query('COMMIT');
        
        const org = rows[0];
        org.users = [];
        
        return org;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating organization:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    updateOrganization: async (_: any, { id, input }: { id: string, input: any }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Check if user can update this organization
      const canUpdateOrg = 
        context.user.roles.includes(UserRole.ADMIN) || 
        (context.user.roles.includes(UserRole.MANAGER) && 
         context.user.organizationId === id);
      
      if (!canUpdateOrg) {
        throw new ForbiddenError('Not authorized to update this organization');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Build update query
        let updateQuery = 'UPDATE organizations SET updated_at = $1';
        const queryParams: any[] = [new Date().toISOString()];
        let paramIndex = 2;
        
        if (input.name) {
          updateQuery += `, name = $${paramIndex}`;
          queryParams.push(input.name);
          paramIndex++;
        }
        
        if (input.plan) {
          // Only admins can change plans
          if (!context.user.roles.includes(UserRole.ADMIN)) {
            throw new ForbiddenError('Not authorized to change organization plan');
          }
          
          updateQuery += `, plan = $${paramIndex}`;
          queryParams.push(input.plan);
          paramIndex++;
        }
        
        if (input.isActive !== undefined) {
          // Only admins can activate/deactivate organizations
          if (!context.user.roles.includes(UserRole.ADMIN)) {
            throw new ForbiddenError('Not authorized to change organization active status');
          }
          
          updateQuery += `, is_active = $${paramIndex}`;
          queryParams.push(input.isActive);
          paramIndex++;
        }
        
        updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
        queryParams.push(id);
        
        const { rows } = await client.query(updateQuery, queryParams);
        
        if (rows.length === 0) {
          throw new ApolloError('Organization not found');
        }
        
        await client.query('COMMIT');
        
        // Get users for this organization
        const { rows: userRows } = await pgPool.query(
          'SELECT * FROM users WHERE organization_id = $1',
          [id]
        );
        
        const org = rows[0];
        org.users = userRows;
        
        return org;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating organization:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    deleteOrganization: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      // Only admins can delete organizations
      if (!context.user.roles.includes(UserRole.ADMIN)) {
        throw new ForbiddenError('Not authorized to delete organizations');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Get all users in this organization
        const { rows: userRows } = await client.query(
          'SELECT id FROM users WHERE organization_id = $1',
          [id]
        );
        
        // Invalidate all sessions for these users
        for (const user of userRows) {
          await invalidateAllUserSessions(user.id);
        }
        
        // Delete all users in this organization
        await client.query(
          'DELETE FROM users WHERE organization_id = $1',
          [id]
        );
        
        // Delete organization
        const { rowCount } = await client.query(
          'DELETE FROM organizations WHERE id = $1',
          [id]
        );
        
        await client.query('COMMIT');
        
        return rowCount > 0;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting organization:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    login: async (_: any, { input }: { input: { email: string, password: string } }) => {
      try {
        const { email, password } = input;
        
        // Get user by email
        const { rows } = await pgPool.query(
          'SELECT * FROM users WHERE email = $1',
          [email.toLowerCase()]
        );
        
        if (rows.length === 0) {
          throw new AuthenticationError('Invalid email or password');
        }
        
        const user = rows[0];
        
        // Check if user is active
        if (!user.is_active) {
          throw new AuthenticationError('Account is inactive');
        }
        
        // Check password
        const passwordValid = await comparePassword(password, user.password_hash);
        if (!passwordValid) {
          throw new AuthenticationError('Invalid email or password');
        }
        
        // Update last login time
        await pgPool.query(
          'UPDATE users SET last_login = $1 WHERE id = $2',
          [new Date(), user.id]
        );
        
        // Generate token
        const session = await generateToken(user);
        
        return {
          user,
          token: session.token,
          expiresAt: session.expiresAt,
        };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    
    logout: async (_: any, __: any, context: any) => {
      if (!context.user || !context.sessionId) {
        return true;
      }
      
      try {
        await invalidateSession(context.sessionId);
        return true;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    },
    
    refreshToken: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      try {
        // Get fresh user data
        const { rows } = await pgPool.query(
          'SELECT * FROM users WHERE id = $1',
          [context.user.id]
        );
        
        if (rows.length === 0) {
          throw new AuthenticationError('User not found');
        }
        
        const user = rows[0];
        
        // Check if user is still active
        if (!user.is_active) {
          throw new AuthenticationError('Account is inactive');
        }
        
        // Invalidate current session
        if (context.sessionId) {
          await invalidateSession(context.sessionId);
        }
        
        // Generate new token
        const session = await generateToken(user);
        
        return {
          user,
          token: session.token,
          expiresAt: session.expiresAt,
        };
      } catch (error) {
        console.error('Token refresh error:', error);
        throw error;
      }
    },
    
    changePassword: async (_: any, { input }: { input: { oldPassword: string, newPassword: string } }, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }
      
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Get user data
        const { rows } = await client.query(
          'SELECT * FROM users WHERE id = $1',
          [context.user.id]
        );
        
        if (rows.length === 0) {
          throw new AuthenticationError('User not found');
        }
        
        const user = rows[0];
        
        // Check old password
        const passwordValid = await comparePassword(input.oldPassword, user.password_hash);
        if (!passwordValid) {
          throw new AuthenticationError('Current password is incorrect');
        }
        
        // Hash new password
        const newPasswordHash = await hashPassword(input.newPassword);
        
        // Update password
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
          [newPasswordHash, new Date(), context.user.id]
        );
        
        // Invalidate all sessions except current
        const { rows: sessionRows } = await client.query(
          'SELECT id FROM user_sessions WHERE user_id = $1 AND id != $2',
          [context.user.id, context.sessionId || '']
        );
        
        for (const session of sessionRows) {
          await invalidateSession(session.id);
        }
        
        await client.query('COMMIT');
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Password change error:', error);
        throw error;
      } finally {
        client.release();
      }
    },
    
    requestPasswordReset: async (_: any, { email }: { email: string }) => {
      try {
        // Get user by email
        const { rows } = await pgPool.query(
          'SELECT * FROM users WHERE email = $1',
          [email.toLowerCase()]
        );
        
        if (rows.length === 0) {
          // Don't reveal if email exists or not
          return true;
        }
        
        const user = rows[0];
        
        // Generate reset token
        const resetToken = uuidv4();
        const expires = new Date();
        expires.setHours(expires.getHours() + 1); // 1 hour expiration
        
        // Store reset token
        await pgPool.query(
          `INSERT INTO password_resets (
            user_id, token, expires_at, created_at
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE SET
            token = $2,
            expires_at = $3,
            created_at = $4`,
          [user.id, resetToken, expires, new Date()]
        );
        
        // In a real application, send an email with the reset link
        // For this example, we'll just log it
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        return true;
      } catch (error) {
        console.error('Password reset request error:', error);
        // Still return true to not reveal if email exists
        return true;
      }
    },
    
    resetPassword: async (_: any, { token, newPassword }: { token: string, newPassword: string }) => {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Get reset token
        const { rows } = await client.query(
          'SELECT * FROM password_resets WHERE token = $1 AND expires_at > $2',
          [token, new Date()]
        );
        
        if (rows.length === 0) {
          throw new ApolloError('Invalid or expired reset token');
        }
        
        const resetData = rows[0];
        
        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);
        
        // Update password
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
          [newPasswordHash, new Date(), resetData.user_id]
        );
        
        // Delete reset token
        await client.query(
          'DELETE FROM password_resets WHERE user_id = $1',
          [resetData.user_id]
        );
        
        // Invalidate all sessions for this user
        await invalidateAllUserSessions(resetData.user_id);
        
        await client.query('COMMIT');
        
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Password reset error:', error);
        throw error;
      } finally {
        client.release();
      }
    },
  },
};