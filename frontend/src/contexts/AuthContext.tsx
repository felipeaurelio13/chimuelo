import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
        const token = localStorage.getItem('maxi_auth_token');
        const userData = localStorage.getItem('maxi_user_data');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          setState(prev => ({
            ...prev,
            user,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('maxi_auth_token');
        localStorage.removeItem('maxi_user_data');
        setState(prev => ({
          ...prev,
          user: null,
          isLoading: false,
          error: null,
          isAuthenticated: false,
        }));
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('AuthContext: Iniciando proceso de login');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Limpiar espacios en blanco
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      
      console.log('AuthContext: Validando credenciales para:', cleanEmail);
      
      // Validación de credenciales específicas
      if (cleanEmail === 'felipelorcac@gmail.com' && cleanPassword === 'phil.13') {
        console.log('AuthContext: Credenciales válidas, creando sesión');
        
        const mockUser: User = {
          id: 'user-felipe-' + Date.now(),
          email: cleanEmail,
          name: 'Felipe Lorca',
          createdAt: new Date().toISOString(),
        };
        
        const mockToken = 'mock-jwt-token-' + Date.now();
        
        // Store in localStorage
        localStorage.setItem('maxi_auth_token', mockToken);
        localStorage.setItem('maxi_user_data', JSON.stringify(mockUser));
        
        setState(prev => ({
          ...prev,
          user: mockUser,
          isLoading: false,
          error: null,
          isAuthenticated: true,
        }));
        
        console.log('AuthContext: Login exitoso');
        return { success: true };
      } else {
        console.log('AuthContext: Credenciales inválidas');
        throw new Error('Credenciales inválidas. Por favor verifica tu email y contraseña.');
      }
    } catch (error: any) {
      console.error('AuthContext: Error en login:', error);
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
      // For MVP, simple validation and mock registration
      if (!userData.email || !userData.password || !userData.name) {
        throw new Error('All fields are required');
      }
      
      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      const newUser: User = {
        id: 'user-' + Date.now(),
        email: userData.email,
        name: userData.name,
        createdAt: new Date().toISOString(),
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      // Store in localStorage
      localStorage.setItem('maxi_auth_token', mockToken);
      localStorage.setItem('maxi_user_data', JSON.stringify(newUser));
      
      setState({
        user: newUser,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
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
      // Clear localStorage
      localStorage.removeItem('maxi_auth_token');
      localStorage.removeItem('maxi_user_data');
      
      setState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error during logout:', error);
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