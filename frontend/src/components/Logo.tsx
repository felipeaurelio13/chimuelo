import React from 'react';
import '../styles/Logo.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'default' | 'minimal' | 'animated';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  variant = 'default',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-medium', 
    large: 'logo-large',
    xlarge: 'logo-xlarge'
  };

  const variantClasses = {
    default: 'logo-default',
    minimal: 'logo-minimal',
    animated: 'logo-animated'
  };

  return (
    <div className={`logo-container ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      <svg 
        className="logo-svg" 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Chimuelo - Salud Pediátrica Inteligente"
      >
        <defs>
          {/* Gradiente principal moderno */}
          <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#667eea', stopOpacity: 1}} />
            <stop offset="50%" style={{stopColor: '#764ba2', stopOpacity: 1}} />
            <stop offset="100%" style={{stopColor: '#f093fb', stopOpacity: 1}} />
          </linearGradient>
          
          {/* Gradiente secundario para detalles */}
          <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: '#4facfe', stopOpacity: 1}} />
            <stop offset="100%" style={{stopColor: '#00f2fe', stopOpacity: 1}} />
          </linearGradient>
          
          {/* Sombra suave */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.15"/>
          </filter>
          
          {/* Brillo interno */}
          <filter id="innerGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Círculo de fondo con sombra */}
        <circle cx="100" cy="100" r="85" fill="url(#primaryGradient)" filter="url(#shadow)"/>
        
        {/* Círculo interno con brillo */}
        <circle cx="100" cy="100" r="75" fill="url(#secondaryGradient)" opacity="0.8" filter="url(#innerGlow)"/>
        
        {/* Estetoscopio moderno */}
        <g transform="translate(100, 100)">
          {/* Tubo principal del estetoscopio */}
          <path 
            d="M-40 -20 Q0 -40 40 -20 Q40 0 20 20 L0 40 L-20 20 Q-40 0 -40 -20" 
            fill="white" 
            opacity="0.95" 
            stroke="#ffffff" 
            strokeWidth="2"
            className="stethoscope-main"
          />
          
          {/* Tubo secundario */}
          <path 
            d="M-30 -10 Q0 -25 30 -10 Q30 5 15 15 L0 25 L-15 15 Q-30 5 -30 -10" 
            fill="white" 
            opacity="0.8" 
            stroke="#ffffff" 
            strokeWidth="1.5"
            className="stethoscope-secondary"
          />
          
          {/* Auriculares */}
          <circle cx="-25" cy="15" r="8" fill="white" opacity="0.9" className="earpiece"/>
          <circle cx="25" cy="15" r="8" fill="white" opacity="0.9" className="earpiece"/>
          
          {/* Conectores de auriculares */}
          <path d="M-25 15 L-20 20" stroke="white" strokeWidth="3" opacity="0.8" className="connector"/>
          <path d="M25 15 L20 20" stroke="white" strokeWidth="3" opacity="0.8" className="connector"/>
        </g>
        
        {/* Corazón estilizado */}
        <g transform="translate(100, 120)" className="heart-container">
          <path 
            d="M-12 0 C-12 -8 -4 -12 0 -8 C4 -12 12 -8 12 0 C12 8 0 16 0 16 C0 16 -12 8 -12 0 Z" 
            fill="#FF6B9D" 
            opacity="0.9"
            className="heart-main"
          />
          
          {/* Brillo del corazón */}
          <path 
            d="M-8 -2 C-8 -6 -2 -8 0 -6 C2 -8 8 -6 8 -2 C8 2 0 6 0 6 C0 6 -8 2 -8 -2 Z" 
            fill="#FFB3D1" 
            opacity="0.6"
            className="heart-highlight"
          />
        </g>
        
        {/* Cruz médica moderna */}
        <g transform="translate(100, 60)" className="cross-container">
          {/* Cruz vertical */}
          <rect x="-3" y="-15" width="6" height="30" fill="white" opacity="0.9" rx="2" className="cross-vertical"/>
          {/* Cruz horizontal */}
          <rect x="-15" y="-3" width="30" height="6" fill="white" opacity="0.9" rx="2" className="cross-horizontal"/>
          
          {/* Brillo en la cruz */}
          <rect x="-2" y="-14" width="4" height="28" fill="white" opacity="0.3" rx="1" className="cross-highlight"/>
          <rect x="-14" y="-2" width="28" height="4" fill="white" opacity="0.3" rx="1" className="cross-highlight"/>
        </g>
        
        {/* Elementos decorativos */}
        {/* Puntos de pulso */}
        <circle cx="30" cy="30" r="3" fill="white" opacity="0.6" className="pulse-dot">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="170" cy="30" r="3" fill="white" opacity="0.6" className="pulse-dot">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.5s"/>
        </circle>
        <circle cx="30" cy="170" r="3" fill="white" opacity="0.6" className="pulse-dot">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="1s"/>
        </circle>
        <circle cx="170" cy="170" r="3" fill="white" opacity="0.6" className="pulse-dot">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="1.5s"/>
        </circle>
        
        {/* Borde exterior con gradiente */}
        <circle cx="100" cy="100" r="95" fill="none" stroke="url(#primaryGradient)" strokeWidth="2" opacity="0.3" className="logo-border"/>
      </svg>
    </div>
  );
};

export default Logo;