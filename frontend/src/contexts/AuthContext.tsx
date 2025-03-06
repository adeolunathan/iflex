// frontend/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql, useApolloClient } from '@apollo/client';
import { User, AuthState, UserRole } from '../types/auth';

// Define auth actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS', payload: { user: User; token: string; expiresAt: string } }
  | { type: 'LOGIN_FAILURE', payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_START' }
  | { type: 'REFRESH_TOKEN_SUCCESS', payload: { user: User; token: string; expiresAt: string } }
  | { type: 'REFRESH_TOKEN_FAILURE', payload: string };

// Initial auth state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  expiresAt: null,
  loading: true,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        expiresAt: action.payload.expiresAt,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        expiresAt: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'REFRESH_TOKEN_START':
      return {
        ...state,
        loading: true,
      };
    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        expiresAt: action.payload.expiresAt,
        loading: false,
        error: null,
      };
    case 'REFRESH_TOKEN_FAILURE':
      return {
        ...initialState,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

// Create auth context
type AuthContextType = {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Login mutation
const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user {
        id
        email
        firstName
        lastName
        roles
        organizationId
        isActive
        lastLogin
        createdAt
        updatedAt
      }
      token
      expiresAt
    }
  }
`;

// Refresh token mutation
const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      user {
        id
        email
        firstName
        lastName
        roles
        organizationId
        isActive
        lastLogin
        createdAt
        updatedAt
      }
      token
      expiresAt
    }
  }
`;

// Logout mutation
const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const client = useApolloClient();
  const navigate = useNavigate();

  // Initialize auth state from local storage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const expiresAt = localStorage.getItem('expiresAt');
      const user = localStorage.getItem('user');

      if (token && expiresAt && user) {
        // Check if token is expired
        if (new Date(expiresAt) > new Date()) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: JSON.parse(user),
              token,
              expiresAt,
            },
          });
        } else {
          // Token is expired, try to refresh
          try {
            dispatch({ type: 'REFRESH_TOKEN_START' });
            const { data } = await client.mutate({
              mutation: REFRESH_TOKEN_MUTATION,
              context: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            });

            const { user, token: newToken, expiresAt: newExpiresAt } = data.refreshToken;

            localStorage.setItem('token', newToken);
            localStorage.setItem('expiresAt', newExpiresAt);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
              type: 'REFRESH_TOKEN_SUCCESS',
              payload: {
                user,
                token: newToken,
                expiresAt: newExpiresAt,
              },
            });
          } catch (error) {
            console.error('Failed to refresh token:', error);
            dispatch({
              type: 'REFRESH_TOKEN_FAILURE',
              payload: 'Session expired. Please login again.',
            });
            clearLocalStorage();
            navigate('/login');
          }
        }
      } else {
        dispatch({
          type: 'LOGOUT',
        });
      }
    };

    initializeAuth();
  }, [client, navigate]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });

      const { data } = await client.mutate({
        mutation: LOGIN_MUTATION,
        variables: {
          input: {
            email,
            password,
          },
        },
      });

      const { user, token, expiresAt } = data.login;

      localStorage.setItem('token', token);
      localStorage.setItem('expiresAt', expiresAt);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          token,
          expiresAt,
        },
      });

      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message || 'Login failed. Please try again.',
      });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.token) {
        await client.mutate({
          mutation: LOGOUT_MUTATION,
          context: {
            headers: {
              Authorization: `Bearer ${state.token}`,
            },
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearLocalStorage();
      dispatch({ type: 'LOGOUT' });
      client.resetStore();
      navigate('/login');
    }
  };

  // Check if user has specific role
  const hasRole = (role: UserRole): boolean => {
    return state.user?.roles.includes(role) || false;
  };

  // Clear local storage
  const clearLocalStorage = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Auth context hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};