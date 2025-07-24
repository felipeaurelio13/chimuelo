import pytest
import json
from src.models.health_models import Child, HealthRecord, ChatHistory, Insight, db

class TestHealth:
    """Tests para las APIs de gestión de datos de salud"""
    
    def test_create_child(self, auth_client, test_child_data):
        """Test de creación de perfil de niño"""
        response = auth_client.post('/api/children',
                                  data=json.dumps(test_child_data),
                                  content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'child' in data
        assert data['child']['name'] == test_child_data['name']
        assert data['child']['gender'] == test_child_data['gender']
    
    def test_get_children(self, auth_client, test_child_data):
        """Test de obtención de lista de hijos"""
        # Crear un niño primero
        auth_client.post('/api/children',
                        data=json.dumps(test_child_data),
                        content_type='application/json')
        
        # Obtener lista
        response = auth_client.get('/api/children')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'children' in data
        assert len(data['children']) == 1
        assert data['children'][0]['name'] == test_child_data['name']
    
    def test_update_child(self, auth_client, test_child_data):
        """Test de actualización de perfil de niño"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Actualizar el niño
        update_data = {
            'name': 'Maxi Updated',
            'blood_type': 'O+',
            'allergies': ['peanuts', 'shellfish']
        }
        
        response = auth_client.put(f'/api/children/{child_id}',
                                 data=json.dumps(update_data),
                                 content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['child']['name'] == 'Maxi Updated'
        assert data['child']['blood_type'] == 'O+'
        assert 'peanuts' in data['child']['allergies']
    
    def test_create_health_record(self, auth_client, test_child_data, test_record_data):
        """Test de creación de registro de salud"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Crear registro de salud
        response = auth_client.post(f'/api/children/{child_id}/records',
                                  data=json.dumps(test_record_data),
                                  content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'record' in data
        assert data['record']['type'] == test_record_data['type']
        assert data['record']['data']['value'] == test_record_data['data']['value']
    
    def test_get_health_records(self, auth_client, test_child_data, test_record_data):
        """Test de obtención de registros de salud"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Crear un registro
        auth_client.post(f'/api/children/{child_id}/records',
                        data=json.dumps(test_record_data),
                        content_type='application/json')
        
        # Obtener registros
        response = auth_client.get(f'/api/children/{child_id}/records')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'records' in data
        assert len(data['records']) == 1
        assert data['records'][0]['type'] == test_record_data['type']
    
    def test_get_health_records_with_filters(self, auth_client, test_child_data):
        """Test de obtención de registros con filtros"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Crear múltiples registros de diferentes tipos
        weight_record = {
            'type': 'weight',
            'timestamp': '2024-07-21T10:00:00Z',
            'data': {'value': 10.5, 'unit': 'kg'}
        }
        
        height_record = {
            'type': 'height',
            'timestamp': '2024-07-21T11:00:00Z',
            'data': {'value': 85, 'unit': 'cm'}
        }
        
        auth_client.post(f'/api/children/{child_id}/records',
                        data=json.dumps(weight_record),
                        content_type='application/json')
        
        auth_client.post(f'/api/children/{child_id}/records',
                        data=json.dumps(height_record),
                        content_type='application/json')
        
        # Filtrar por tipo
        response = auth_client.get(f'/api/children/{child_id}/records?type=weight')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['records']) == 1
        assert data['records'][0]['type'] == 'weight'
    
    def test_save_chat_message(self, auth_client, test_child_data, test_chat_message_data):
        """Test de guardado de mensaje de chat"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Guardar mensaje de chat
        response = auth_client.post(f'/api/children/{child_id}/chat',
                                  data=json.dumps(test_chat_message_data),
                                  content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'chat_message' in data
        assert data['chat_message']['role'] == test_chat_message_data['role']
        assert data['chat_message']['content'] == test_chat_message_data['content']
    
    def test_get_chat_history(self, auth_client, test_child_data, test_chat_message_data):
        """Test de obtención de historial de chat"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Guardar un mensaje
        auth_client.post(f'/api/children/{child_id}/chat',
                        data=json.dumps(test_chat_message_data),
                        content_type='application/json')
        
        # Obtener historial
        response = auth_client.get(f'/api/children/{child_id}/chat')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'messages' in data
        assert len(data['messages']) == 1
        assert data['messages'][0]['content'] == test_chat_message_data['content']
    
    def test_get_insights(self, auth_client, test_child_data):
        """Test de obtención de insights"""
        # Crear un niño primero
        create_response = auth_client.post('/api/children',
                                         data=json.dumps(test_child_data),
                                         content_type='application/json')
        child_id = json.loads(create_response.data)['child']['id']
        
        # Obtener insights (inicialmente vacío)
        response = auth_client.get(f'/api/children/{child_id}/insights')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'insights' in data
        assert isinstance(data['insights'], list)
    
    def test_web_search(self, auth_client):
        """Test de búsqueda web"""
        response = auth_client.get('/api/search?q=fiebre infantil')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'results' in data
        assert 'query' in data
        assert data['query'] == 'fiebre infantil'
        assert isinstance(data['results'], list)
    
    def test_web_search_missing_query(self, auth_client):
        """Test de búsqueda web sin parámetro de consulta"""
        response = auth_client.get('/api/search')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'requerido' in data['error']
    
    def test_unauthorized_access(self, client, test_child_data):
        """Test de acceso no autorizado a endpoints protegidos"""
        # Intentar crear niño sin autenticación
        response = client.post('/api/children',
                             data=json.dumps(test_child_data),
                             content_type='application/json')
        
        assert response.status_code == 401
    
    def test_invalid_child_id(self, auth_client):
        """Test con ID de niño inválido"""
        invalid_id = 'invalid-uuid'
        
        response = auth_client.get(f'/api/children/{invalid_id}/records')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'inválido' in data['error']
    
    def test_nonexistent_child(self, auth_client):
        """Test con niño inexistente"""
        nonexistent_id = '00000000-0000-0000-0000-000000000000'
        
        response = auth_client.get(f'/api/children/{nonexistent_id}/records')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
        assert 'no encontrado' in data['error']

