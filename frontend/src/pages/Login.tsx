import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import '../styles/Auth.css';

const Login: React.FC = () => {
  if (import.meta.env.VITE_DEV === 'TRUE') {
    console.log('Login component rendered');
  }

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Login: User is authenticated, navigating to dashboard.');
      }
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    // No need to clear error here, as clearError is now memoized and
    // we only want to clear it on explicit user action or successful login.
    // clearError();
  }, []); // Removed clearError from dependency array

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log(`Login: Form data changed - ${name}: ${value}`);
    }

    // Clear error when user starts typing - removed to prevent infinite re-renders
    // if (error) {
    //   clearError();
    // }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (import.meta.env.VITE_DEV === 'TRUE') {
      console.log('Login: handleSubmit initiated.');
      console.log('Login: Form data for submission:', formData);
    }

    // Validación básica
    if (!formData.email) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Login: Email is empty.');
      }
      return;
    }
    
    if (!formData.password) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Login: Password is empty.');
      }
      return;
    }
    
    if (formData.password.length < 6) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.warn('Login: Password is too short.');
      }
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Intentando login con:', { email: formData.email });
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.log('Login: Login successful, redirecting...', result);
        }
        console.log('Login exitoso, redirigiendo...');
        navigate('/', { replace: true });
      } else {
        if (import.meta.env.VITE_DEV === 'TRUE') {
          console.error('Login: Login failed:', result.error);
        }
        console.error('Login falló:', result.error);
      }
    } catch (error) {
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.error('Login: Error during login attempt:', error);
      }
      console.error('Error en login:', error);
    } finally {
      setIsLoading(false);
      if (import.meta.env.VITE_DEV === 'TRUE') {
        console.log('Login: handleSubmit finished. Loading state set to false.');
      }
    }
  };

  const isFormValid = formData.email && formData.password.length >= 6;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
                <div className="auth-logo">
        <Logo size="large" variant="animated" />
        <h1 className="logo-title">Chimuelo</h1>
      </div>
          <p className="auth-subtitle">Inicia sesión en tu cuenta</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="tu@email.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Min. 6 caracteres"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <i className="fas fa-eye-slash"></i>
                ) : (
                  <i className="fas fa-eye"></i>
                )}
              </button>
            </div>
          </div>

          {error && <p className="auth-error-message">{error}</p>}

          <button type="submit" className="auth-button" disabled={!isFormValid || isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <p className="auth-footer">
            ¿No tienes una cuenta? <a href="/register">Regístrate aquí</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
export { Login };