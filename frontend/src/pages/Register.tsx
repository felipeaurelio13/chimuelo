import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import '../styles/Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, error, clearError, isAuthenticated } = useAuth();
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
    if (!formData.name.trim()) {
      return;
    }
    
    if (!formData.email) {
      return;
    }
    
    if (!formData.password) {
      return;
    }
    
    if (formData.password.length < 6) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Intentando registro con:', { 
        name: formData.name, 
        email: formData.email 
      });
      
      const result = await register({
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        console.log('Registro exitoso, redirigiendo...');
        navigate('/', { replace: true });
      } else {
        console.error('Registro falló:', result.error);
      }
    } catch (error) {
      console.error('Error en registro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const isFormValid = formData.name.trim() && 
                      formData.email && 
                      formData.password.length >= 6 && 
                      passwordsMatch;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
                <div className="auth-logo">
        <Logo size="large" variant="animated" />
        <h1 className="logo-title">Chimuelo</h1>
      </div>
          <p className="auth-subtitle">Crea tu cuenta</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="Tu nombre completo"
              required
              autoComplete="name"
              autoFocus
            />
          </div>

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
                autoComplete="new-password"
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

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar contraseña
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Repite tu contraseña"
                required
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {formData.confirmPassword && !passwordsMatch && (
              <span className="field-error">Las contraseñas no coinciden</span>
            )}
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span>⚠️ {error}</span>
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
                Registrando...
              </span>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-link">
              Inicia sesión aquí
            </Link>
          </p>
        </div>

        <div className="demo-info">
          <p className="demo-text">
            <strong>Demo:</strong> Puedes crear una cuenta o usar email: felipelorcac@gmail.com y password: phil.13
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
export { Register };