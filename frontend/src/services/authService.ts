// Servicio de autenticación real usando localStorage como base de datos
import { databaseService } from './databaseService';

interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  token?: string;
  error?: string;
}

class AuthService {
  private readonly USERS_KEY = 'chimuelo_users';
  private readonly CURRENT_USER_KEY = 'chimuelo_current_user';
  private readonly AUTH_TOKEN_KEY = 'chimuelo_auth_token';

  constructor() {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Constructor called.');
    }
    this.initializeDefaultUser();
  }

  private initializeDefaultUser() {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Initializing default user.');
    }
    // Inicializar con el usuario por defecto si no existe
    const users = this.getUsers();
    const defaultEmail = 'felipelorcac@gmail.com';
    
    if (!users[defaultEmail]) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: Default user not found, creating...');
      }
      users[defaultEmail] = {
        id: 'user-felipe-default',
        email: defaultEmail,
        name: 'Felipe Lorca',
        passwordHash: this.hashPassword('phil.13'),
        createdAt: new Date().toISOString()
      };
      this.saveUsers(users);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: Default user created.');
      }
    } else {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: Default user already exists.');
      }
    }
  }

  private getUsers(): Record<string, User> {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Retrieving users from localStorage.');
    }
    try {
      const usersJson = localStorage.getItem(this.USERS_KEY);
      if (usersJson) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthService: Users found in localStorage.');
        }
        return JSON.parse(usersJson);
      }
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: No users found in localStorage.');
      }
      return {};
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('AuthService: Error loading users:', error.message);
        } else {
          console.error('AuthService: Error loading users:', error);
        }
      }
      return {};
    }
  }

  private saveUsers(users: Record<string, User>) {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Saving users to localStorage.', Object.keys(users).length, 'users.');
    }
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  private hashPassword(password: string): string {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Hashing password.');
    }
    // Implementación simple de hash para demo
    // En producción usar bcrypt o similar
    return btoa(password);
  }

  private verifyPassword(password: string, hash: string): boolean {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Verifying password.');
    }
    return this.hashPassword(password) === hash;
  }

  private generateToken(userId: string): string {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Generating token for userId:', userId);
    }
    // Token simple para demo
    return btoa(`${userId}:${Date.now()}:${Math.random()}`);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Attempting login for:', email);
    }
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const users = this.getUsers();
      const user = users[cleanEmail];

      if (!user) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthService: User not found:', cleanEmail);
        }
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      if (!this.verifyPassword(cleanPassword, user.passwordHash)) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthService: Invalid password for user:', cleanEmail);
        }
        return {
          success: false,
          error: 'Contraseña incorrecta'
        };
      }

      // Generar token y guardar sesión
      const token = this.generateToken(user.id);
      const { passwordHash, ...userWithoutPassword } = user;

      localStorage.setItem(this.AUTH_TOKEN_KEY, token);
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: Login successful for user:', cleanEmail);
      }
      return {
        success: true,
        user: userWithoutPassword,
        token
      };
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('AuthService: Login error:', error.message);
        } else {
          console.error('AuthService: Login error:', error);
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al iniciar sesión'
      };
    }
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Attempting registration for:', email, 'with name:', name);
    }
    try {
      const cleanEmail = email.trim().toLowerCase();
      const users = this.getUsers();

      if (users[cleanEmail]) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthService: User already exists during registration:', cleanEmail);
        }
        return {
          success: false,
          error: 'El usuario ya existe'
        };
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        name: name.trim(),
        passwordHash: this.hashPassword(password),
        createdAt: new Date().toISOString()
      };

      users[cleanEmail] = newUser;
      this.saveUsers(users);

      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: Registration successful for user:', cleanEmail);
      }
      // Auto login después del registro
      return this.login(cleanEmail, password);
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('AuthService: Register error:', error.message);
        } else {
          console.error('AuthService: Register error:', error);
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al registrar usuario'
      };
    }
  }

  async logout(): Promise<void> {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Attempting logout.');
    }
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Logout completed, tokens removed.');
    }
    // No borramos los usuarios, solo la sesión
  }

  getCurrentUser(): Omit<User, 'passwordHash'> | null {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Attempting to get current user.');
    }
    try {
      const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
      if (userJson) {
        const user = JSON.parse(userJson);
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('AuthService: Current user retrieved:', user.email);
        }
        return user;
      }
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('AuthService: No current user found in localStorage.');
      }
      return null;
    } catch (error: unknown) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        if (error instanceof Error) {
          console.error('AuthService: Error getting current user:', error.message);
        } else {
          console.error('AuthService: Error getting current user:', error);
        }
      }
      return null;
    }
  }

  isAuthenticated(): boolean {
    const authenticated = !!localStorage.getItem(this.AUTH_TOKEN_KEY) && !!this.getCurrentUser();
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: isAuthenticated check result:', authenticated);
    }
    return authenticated;
  }

  private saveCurrentUser(user: Omit<User, 'passwordHash'>): void {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Saving current user to localStorage:', user.email);
    }
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
  }

  private clearCurrentUser(): void {
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('AuthService: Clearing current user from localStorage.');
    }
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }
}

export const authService = new AuthService();