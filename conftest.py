import pytest
from src.main import app, db
from src.models.user import User
from src.models.health_models import Child, HealthRecord, ChatHistory, Insight, SyncLog, AuditLog
from flask_jwt_extended import create_access_token
import json

@pytest.fixture(scope="session")
def client():
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

@pytest.fixture(scope="function")
def auth_client(client):
    with app.app_context():
        # Crear un usuario de prueba
        test_user = User(
            id="test_user_id",
            email="test@example.com",
            name="Test User",
            password_hash="hashed_password", # No se usa en tests de JWT
            salt="test_salt",
            preferences=json.dumps({"language": "en"}) # Ejemplo de preferencias
        )
        db.session.add(test_user)
        db.session.commit()

        # Generar un token de acceso para el usuario de prueba
        access_token = create_access_token(identity=test_user.id)
        client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"
        
        yield client
        
        # Limpiar usuario después de cada test
        db.session.delete(test_user)
        db.session.commit()

@pytest.fixture(scope="function")
def new_user_data():
    return {
        "email": "newuser@example.com",
        "password": "SecurePass123",
        "name": "New User"
    }

@pytest.fixture(scope="function")
def test_child_data():
    return {
        "name": "Maxi",
        "birth_date": "2022-01-15T00:00:00Z",
        "gender": "male"
    }

@pytest.fixture(scope="function")
def test_record_data():
    return {
        "type": "weight",
        "timestamp": "2024-07-21T10:00:00Z",
        "data": {"value": 10.5, "unit": "kg"}, 
        "ai_extracted": False
    }

@pytest.fixture(scope="function")
def test_chat_message_data():
    return {
        "session_id": "chat_session_123",
        "role": "user",
        "content": "Hola, ¿cómo está mi hijo?"
    }

@pytest.fixture(scope="function")
def test_insight_data():
    return {
        "type": "growth_percentile",
        "title": "Crecimiento acelerado",
        "description": "El crecimiento de Maxi está por encima del percentil 90.",
        "severity": "info"
    }

@pytest.fixture(scope="function")
def test_openai_extract_data():
    return {
        "input": "El niño tiene fiebre de 38.5 grados y tos.",
        "inputType": "text",
        "schema": {
            "type": "object",
            "properties": {
                "symptom": {"type": "string"}, 
                "temperature": {"type": "number"}, 
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            }
        }
    }

@pytest.fixture(scope="function")
def test_openai_chat_data():
    return {
        "messages": [{"role": "user", "content": "¿Qué hago si mi hijo tiene fiebre?"}],
        "context": {"child_name": "Maxi", "age": "2 años"}, 
        "searchResults": []
    }



