import pytest
import json
from src.models.user import User, db

class TestAuth:
    """Tests para las APIs de autenticación"""
    
    def test_register_success(self, client, new_user_data):
        """Test de registro exitoso"""
        response = client.post('/api/auth/register', 
                             data=json.dumps(new_user_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert 'tokens' in data
        assert data['user']['email'] == new_user_data['email']
        assert data['user']['name'] == new_user_data['name']
    
    def test_register_duplicate_email(self, client, new_user_data):
        """Test de registro con email duplicado"""
        # Primer registro
        client.post('/api/auth/register', 
                   data=json.dumps(new_user_data),
                   content_type='application/json')
        
        # Segundo registro con mismo email
        response = client.post('/api/auth/register', 
                             data=json.dumps(new_user_data),
                             content_type='application/json')
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'error' in data
        assert 'ya está registrado' in data['error']
    
    def test_register_invalid_email(self, client):
        """Test de registro con email inválido"""
        invalid_data = {
            'email': 'invalid-email',
            'password': 'SecurePass123',
            'name': 'Test User'
        }
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(invalid_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'email inválido' in data['error']
    
    def test_register_weak_password(self, client):
        """Test de registro con contraseña débil"""
        weak_password_data = {
            'email': 'test@example.com',
            'password': '123',
            'name': 'Test User'
        }
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(weak_password_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'contraseña' in data['error'].lower()
    
    def test_login_success(self, client, new_user_data):
        """Test de login exitoso"""
        # Registrar usuario primero
        client.post('/api/auth/register', 
                   data=json.dumps(new_user_data),
                   content_type='application/json')
        
        # Intentar login
        login_data = {
            'email': new_user_data['email'],
            'password': new_user_data['password']
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert 'tokens' in data
        assert data['user']['email'] == new_user_data['email']
    
    def test_login_invalid_credentials(self, client, new_user_data):
        """Test de login con credenciales inválidas"""
        # Registrar usuario primero
        client.post('/api/auth/register', 
                   data=json.dumps(new_user_data),
                   content_type='application/json')
        
        # Intentar login con contraseña incorrecta
        login_data = {
            'email': new_user_data['email'],
            'password': 'WrongPassword123'
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'inválidas' in data['error']
    
    def test_login_nonexistent_user(self, client):
        """Test de login con usuario inexistente"""
        login_data = {
            'email': 'nonexistent@example.com',
            'password': 'SomePassword123'
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'inválidas' in data['error']
    
    def test_get_user_salt(self, client, new_user_data):
        """Test de obtención de salt del usuario"""
        # Registrar usuario primero
        client.post('/api/auth/register', 
                   data=json.dumps(new_user_data),
                   content_type='application/json')
        
        # Obtener salt
        salt_data = {'email': new_user_data['email']}
        response = client.post('/api/auth/salt', 
                             data=json.dumps(salt_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'salt' in data
        assert len(data['salt']) > 0
    
    def test_get_salt_nonexistent_user(self, client):
        """Test de obtención de salt para usuario inexistente"""
        salt_data = {'email': 'nonexistent@example.com'}
        response = client.post('/api/auth/salt', 
                             data=json.dumps(salt_data),
                             content_type='application/json')
        
        # Debe devolver un salt falso para prevenir enumeración
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'salt' in data
        assert len(data['salt']) > 0
    
    def test_get_profile(self, auth_client):
        """Test de obtención de perfil de usuario autenticado"""
        response = auth_client.get('/api/user/profile')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'user' in data
        assert data['user']['email'] == 'test@example.com'
    
    def test_get_profile_unauthorized(self, client):
        """Test de obtención de perfil sin autenticación"""
        response = client.get('/api/user/profile')
        
        assert response.status_code == 401
    
    def test_update_profile(self, auth_client):
        """Test de actualización de perfil"""
        update_data = {
            'name': 'Updated Name',
            'preferences': {
                'theme': 'dark',
                'language': 'es'
            }
        }
        
        response = auth_client.put('/api/user/profile',
                                 data=json.dumps(update_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['user']['name'] == 'Updated Name'
        assert data['user']['preferences']['theme'] == 'dark'
    
    def test_get_users_list(self, client):
        """Test de obtención de lista de usuarios (endpoint de desarrollo)"""
        response = client.get('/api/users')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'users' in data
        assert isinstance(data['users'], list)

