import bcrypt
import secrets
import hashlib
import hmac
import uuid
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity
import json

class AuthUtils:
    """Utilidades para autenticación y seguridad"""
    
    @staticmethod
    def generate_salt():
        """Genera un salt aleatorio para el usuario"""
        return secrets.token_hex(32)
    
    @staticmethod
    def generate_uuid():
        """Genera un UUID único"""
        return str(uuid.uuid4())
    
    @staticmethod
    def hash_password(password, salt):
        """Hashea una contraseña con salt usando bcrypt"""
        # Combinar contraseña con salt
        password_with_salt = f"{password}{salt}"
        password_bytes = password_with_salt.encode('utf-8')
        
        # Generar hash con bcrypt
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=12))
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password, salt, hashed_password):
        """Verifica una contraseña contra su hash"""
        password_with_salt = f"{password}{salt}"
        password_bytes = password_with_salt.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    
    @staticmethod
    def create_auth_hash(password, salt):
        """Crea un hash de autenticación para verificación sin almacenar la contraseña"""
        auth_string = f"maxi-auth-{password}-{salt}"
        return hashlib.sha256(auth_string.encode()).hexdigest()
    
    @staticmethod
    def generate_tokens(user_id, additional_claims=None):
        """Genera tokens JWT de acceso y refresh"""
        claims = additional_claims or {}
        
        access_token = create_access_token(
            identity=user_id,
            expires_delta=timedelta(hours=24),
            additional_claims=claims
        )
        
        refresh_token = create_refresh_token(
            identity=user_id,
            expires_delta=timedelta(days=30)
        )
        
        return access_token, refresh_token
    
    @staticmethod
    def calculate_integrity_hash(data):
        """Calcula hash de integridad para auditoría"""
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    @staticmethod
    def validate_email(email):
        """Valida formato de email básico"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_password_strength(password):
        """Valida la fortaleza de la contraseña"""
        if len(password) < 8:
            return False, "La contraseña debe tener al menos 8 caracteres"
        
        if not any(c.isupper() for c in password):
            return False, "La contraseña debe contener al menos una mayúscula"
        
        if not any(c.islower() for c in password):
            return False, "La contraseña debe contener al menos una minúscula"
        
        if not any(c.isdigit() for c in password):
            return False, "La contraseña debe contener al menos un número"
        
        return True, "Contraseña válida"

class RateLimiter:
    """Implementación simple de rate limiting en memoria"""
    
    def __init__(self):
        self.requests = {}
    
    def is_allowed(self, key, limit=10, window=3600):
        """Verifica si una request está permitida según el rate limit"""
        now = datetime.utcnow()
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Limpiar requests antiguas
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if (now - req_time).total_seconds() < window
        ]
        
        # Verificar límite
        if len(self.requests[key]) >= limit:
            return False
        
        # Añadir request actual
        self.requests[key].append(now)
        return True
    
    def get_remaining_requests(self, key, limit=10, window=3600):
        """Obtiene el número de requests restantes"""
        if key not in self.requests:
            return limit
        
        now = datetime.utcnow()
        recent_requests = [
            req_time for req_time in self.requests[key]
            if (now - req_time).total_seconds() < window
        ]
        
        return max(0, limit - len(recent_requests))

class SecurityValidator:
    """Validador de seguridad para inputs"""
    
    @staticmethod
    def sanitize_input(data):
        """Sanitiza input para prevenir inyecciones"""
        if isinstance(data, str):
            # Remover caracteres peligrosos
            dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
            for char in dangerous_chars:
                data = data.replace(char, '')
            return data.strip()
        
        elif isinstance(data, dict):
            return {key: SecurityValidator.sanitize_input(value) for key, value in data.items()}
        
        elif isinstance(data, list):
            return [SecurityValidator.sanitize_input(item) for item in data]
        
        return data
    
    @staticmethod
    def validate_uuid(uuid_string):
        """Valida formato UUID"""
        try:
            uuid.UUID(uuid_string)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_json_schema(data, required_fields):
        """Valida que los datos contengan los campos requeridos"""
        if not isinstance(data, dict):
            return False, "Los datos deben ser un objeto JSON"
        
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Campos requeridos faltantes: {', '.join(missing_fields)}"
        
        return True, "Validación exitosa"

# Instancia global del rate limiter
rate_limiter = RateLimiter()

