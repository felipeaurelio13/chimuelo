import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { authService } from '../services/authService';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  babyName?: string;
  birthDate?: string;
  birthWeight?: number;
  birthHeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true, // Initially true to indicate auth state is being determined
    error: null,
    isAuthenticated: false,
  });

  // Initialize auth state from session storage
  useEffect(() => {
    const initializeAuth = async () => {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthContext: Initializing auth state...');
      }
      const user = authService.getCurrentUser();
      if (user) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthContext: User found in session:', user.email);
        }
        setState({
          user: {
            ...user,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date()
          },
          isLoading: false,
          error: null,
          isAuthenticated: true,
        });
      } else {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthContext: No user found in session.');
        }
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
        }));
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthContext: Login attempt for:', email);
    }
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success && result.user) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthContext: Login successful');
        }
        setState({
          user: {
            ...result.user,
            createdAt: new Date(result.user.createdAt),
            updatedAt: new Date()
          } as User,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        });
        return { success: true };
      } else {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.error('AuthContext: Login failed:', result.error);
        }
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Error al iniciar sesión',
          isAuthenticated: false,
        }));
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('AuthContext: Login exception:', error);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('AuthContext: Login exception (detailed):', error.message);
      }
      const errorMessage = error.message || 'Error al iniciar sesión';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthContext: Register attempt for:', userData.email);
    }
    
    try {
      const result = await authService.register(
        userData.email,
        userData.password,
        userData.name
      );
      
      if (result.success && result.user) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthContext: Registration successful');
        }
        setState({
          user: {
            ...result.user,
            createdAt: new Date(result.user.createdAt),
            updatedAt: new Date()
          } as User,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        });
        return { success: true };
      } else {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.error('AuthContext: Registration failed:', result.error);
        }
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Error al registrar',
        }));
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error al registrar';
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('AuthContext: Registration exception (detailed):', error.message);
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthContext: Logout initiated.');
    }
    try {
      await authService.logout();
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthContext: Logout successful.');
      }
      setState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      });
    } catch (error: unknown) {
      console.error('AuthContext: Error during logout:', error);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('AuthContext: Logout exception (detailed):', error.message);
        } else {
          console.error('AuthContext: Logout exception (detailed):', error);
        }
      }
    }
  };

  const clearError = useCallback((): void => {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthContext: Clearing error.');
    }
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;