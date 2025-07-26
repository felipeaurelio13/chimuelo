import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Auth.css';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.email) {
      return;
    }
    
    if (!formData.password) {
      return;
    }
    
    if (formData.password.length < 6) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Intentando login con:', { email: formData.email });
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        console.log('Login exitoso, redirigiendo...');
        navigate('/', { replace: true });
      } else {
        console.error('Login falló:', result.error);
      }
    } catch (error) {
      console.error('Error en login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.email && formData.password.length >= 6;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">👶</span>
            <h1 className="logo-title">Maxi</h1>
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
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="current-password"
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span>⚠️ {error}</span>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.9 }}>
                Credenciales correctas: felipelorcac@gmail.com / phil.13
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`auth-button ${isFormValid ? 'active' : 'disabled'}`}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner">
                <span className="spinner"></span>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="auth-link">
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="demo-info">
          <p className="demo-text">
            <strong>Demo:</strong> Usa email: felipelorcac@gmail.com y password: phil.13
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
export { Login };