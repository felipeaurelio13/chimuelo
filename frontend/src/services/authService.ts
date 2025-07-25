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
    this.initializeDefaultUser();
  }

  private initializeDefaultUser() {
    // Inicializar con el usuario por defecto si no existe
    const users = this.getUsers();
    const defaultEmail = 'felipelorcac@gmail.com';
    
    if (!users[defaultEmail]) {
      users[defaultEmail] = {
        id: 'user-felipe-default',
        email: defaultEmail,
        name: 'Felipe Lorca',
        passwordHash: this.hashPassword('phil.13'),
        createdAt: new Date().toISOString()
      };
      this.saveUsers(users);
    }
  }

  private getUsers(): Record<string, User> {
    try {
      const usersJson = localStorage.getItem(this.USERS_KEY);
      return usersJson ? JSON.parse(usersJson) : {};
    } catch (error) {
      console.error('Error loading users:', error);
      return {};
    }
  }

  private saveUsers(users: Record<string, User>) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  private hashPassword(password: string): string {
    // Implementación simple de hash para demo
    // En producción usar bcrypt o similar
    return btoa(password);
  }

  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  private generateToken(userId: string): string {
    // Token simple para demo
    return btoa(`${userId}:${Date.now()}:${Math.random()}`);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      console.log('AuthService: Attempting login for:', cleanEmail);

      const users = this.getUsers();
      const user = users[cleanEmail];

      if (!user) {
        console.log('AuthService: User not found');
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      if (!this.verifyPassword(cleanPassword, user.passwordHash)) {
        console.log('AuthService: Invalid password');
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

      console.log('AuthService: Login successful');

      return {
        success: true,
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      console.error('AuthService: Login error:', error);
      return {
        success: false,
        error: 'Error al iniciar sesión'
      };
    }
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const users = this.getUsers();

      if (users[cleanEmail]) {
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

      // Auto login después del registro
      return this.login(cleanEmail, password);
    } catch (error) {
      console.error('AuthService: Register error:', error);
      return {
        success: false,
        error: 'Error al registrar usuario'
      };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    // No borramos los usuarios, solo la sesión
  }

  getCurrentUser(): Omit<User, 'passwordHash'> | null {
    try {
      const userJson = localStorage.getItem(this.CURRENT_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('AuthService: Error getting current user:', error);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.AUTH_TOKEN_KEY) && !!this.getCurrentUser();
  }
}

export const authService = new AuthService();