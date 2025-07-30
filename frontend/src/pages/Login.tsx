import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import AppFooter from '../components/AppFooter';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo size="large" variant="animated" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Chimuelo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inicia sesión en tu cuenta</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3" placeholder="tu@email.com" required autoComplete="email" autoFocus />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3 pr-10" placeholder="Min. 6 caracteres" required autoComplete="current-password" />
              <button type="button" className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-3 font-semibold disabled:opacity-50" disabled={!isFormValid || isLoading}>{isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}</button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">¿No tienes una cuenta?{' '}<a className="text-indigo-600 hover:text-indigo-700" href="/register">Regístrate aquí</a></p>
        </form>
      </div>
      <AppFooter className="mt-6" />
    </div>
  );
};

export default Login;
