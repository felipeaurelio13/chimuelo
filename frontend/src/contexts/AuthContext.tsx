import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/authService';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
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
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth state');
        
        const currentUser = authService.getCurrentUser();
        const isAuthenticated = authService.isAuthenticated();
        
        if (currentUser && isAuthenticated) {
          console.log('AuthContext: User found in session:', currentUser.email);
          setState({
            user: currentUser as User,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });
        } else {
          console.log('AuthContext: No active session found');
          setState({
            user: null,
            isLoading: false,
            error: null,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        setState({
          user: null,
          isLoading: false,
          error: null,
          isAuthenticated: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('AuthContext: Login attempt for:', email);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success && result.user) {
        console.log('AuthContext: Login successful');
        setState({
          user: result.user as User,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        });
        return { success: true };
      } else {
        console.log('AuthContext: Login failed:', result.error);
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
    
    try {
      const result = await authService.register(
        userData.email,
        userData.password,
        userData.name
      );
      
      if (result.success && result.user) {
        setState({
          user: result.user as User,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        });
        return { success: true };
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Error al registrar',
        }));
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error al registrar';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('AuthContext: Error during logout:', error);
    }
  };

  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }));
  };

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