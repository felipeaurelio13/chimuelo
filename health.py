from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User, db
from src.models.health_models import Child, HealthRecord, ChatHistory, Insight, SyncLog, AuditLog
from src.utils.auth_utils import AuthUtils, SecurityValidator, rate_limiter
from datetime import datetime, timedelta
import json
import requests

health_bp = Blueprint('health', __name__)

@health_bp.route('/children', methods=['GET'])
@jwt_required()
def get_children():
    """Obtiene la lista de hijos del usuario autenticado"""
    try:
        current_user_id = get_jwt_identity()
        
        children = Child.query.filter_by(user_id=current_user_id, is_active=True).all()
        
        return jsonify({
            'success': True,
            'children': [child.to_dict() for child in children]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children', methods=['POST'])
@jwt_required()
def create_child():
    """Crea un nuevo perfil de hijo"""
    try:
        current_user_id = get_jwt_identity()
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Sanitizar input
        data = SecurityValidator.sanitize_input(data)
        
        # Validar campos requeridos
        required_fields = ['name', 'birth_date', 'gender']
        is_valid, message = SecurityValidator.validate_json_schema(data, required_fields)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Crear nuevo hijo
        child_id = AuthUtils.generate_uuid()
        
        new_child = Child(
            id=child_id,
            user_id=current_user_id,
            name=data['name'].strip(),
            birth_date=datetime.fromisoformat(data['birth_date'].replace('Z', '+00:00')).date(),
            gender=data['gender'],
            blood_type=data.get('blood_type'),
            allergies=json.dumps(data.get('allergies', [])),
            medical_conditions=json.dumps(data.get('medical_conditions', [])),
            pediatrician_info=json.dumps(data.get('pediatrician_info', {})),
            emergency_contact=json.dumps(data.get('emergency_contact', {}))
        )
        
        db.session.add(new_child)
        db.session.commit()
        
        # Log de auditoría
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type='child_created',
            severity='info',
            details=json.dumps({
                'child_id': child_id,
                'child_name': data['name'],
                'ip_address': client_ip
            }),
            ip_address=client_ip,
            user_agent=request.headers.get('User-Agent', ''),
            hash=AuthUtils.calculate_integrity_hash({
                'event': 'child_created',
                'user_id': current_user_id,
                'child_id': child_id,
                'timestamp': datetime.utcnow().isoformat()
            })
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Perfil del niño creado exitosamente',
            'child': new_child.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children/<child_id>', methods=['PUT'])
@jwt_required()
def update_child(child_id):
    """Actualiza el perfil de un hijo"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validar UUID
        if not SecurityValidator.validate_uuid(child_id):
            return jsonify({'error': 'ID de niño inválido'}), 400
        
        child = Child.query.filter_by(id=child_id, user_id=current_user_id, is_active=True).first()
        if not child:
            return jsonify({'error': 'Niño no encontrado'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Sanitizar input
        data = SecurityValidator.sanitize_input(data)
        
        # Actualizar campos permitidos
        if 'name' in data:
            child.name = data['name'].strip()
        
        if 'birth_date' in data:
            child.birth_date = datetime.fromisoformat(data['birth_date'].replace('Z', '+00:00')).date()
        
        if 'gender' in data:
            child.gender = data['gender']
        
        if 'blood_type' in data:
            child.blood_type = data['blood_type']
        
        if 'allergies' in data:
            child.allergies = json.dumps(data['allergies'])
        
        if 'medical_conditions' in data:
            child.medical_conditions = json.dumps(data['medical_conditions'])
        
        if 'pediatrician_info' in data:
            child.pediatrician_info = json.dumps(data['pediatrician_info'])
        
        if 'emergency_contact' in data:
            child.emergency_contact = json.dumps(data['emergency_contact'])
        
        child.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Perfil del niño actualizado exitosamente',
            'child': child.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children/<child_id>/records', methods=['GET'])
@jwt_required()
def get_health_records(child_id):
    """Obtiene los registros de salud de un niño"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validar UUID
        if not SecurityValidator.validate_uuid(child_id):
            return jsonify({'error': 'ID de niño inválido'}), 400
        
        # Verificar que el niño pertenece al usuario
        child = Child.query.filter_by(id=child_id, user_id=current_user_id, is_active=True).first()
        if not child:
            return jsonify({'error': 'Niño no encontrado'}), 404
        
        # Parámetros de consulta
        record_type = request.args.get('type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # Construir consulta
        query = HealthRecord.query.filter_by(child_id=child_id)
        
        if record_type:
            query = query.filter_by(type=record_type)
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(HealthRecord.timestamp >= start_dt)
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(HealthRecord.timestamp <= end_dt)
        
        # Ordenar por timestamp descendente
        query = query.order_by(HealthRecord.timestamp.desc())
        
        # Aplicar paginación
        records = query.offset(offset).limit(limit).all()
        total_count = query.count()
        
        return jsonify({
            'success': True,
            'records': [record.to_dict() for record in records],
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children/<child_id>/records', methods=['POST'])
@jwt_required()
def create_health_record(child_id):
    """Crea un nuevo registro de salud"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validar UUID
        if not SecurityValidator.validate_uuid(child_id):
            return jsonify({'error': 'ID de niño inválido'}), 400
        
        # Verificar que el niño pertenece al usuario
        child = Child.query.filter_by(id=child_id, user_id=current_user_id, is_active=True).first()
        if not child:
            return jsonify({'error': 'Niño no encontrado'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Sanitizar input
        data = SecurityValidator.sanitize_input(data)
        
        # Validar campos requeridos
        required_fields = ['type', 'timestamp', 'data']
        is_valid, message = SecurityValidator.validate_json_schema(data, required_fields)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Crear nuevo registro
        record_id = AuthUtils.generate_uuid()
        
        new_record = HealthRecord(
            id=record_id,
            child_id=child_id,
            type=data['type'],
            timestamp=datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')),
            data=json.dumps(data['data']),
            ai_extracted=data.get('ai_extracted', False),
            original_input=json.dumps(data.get('original_input')) if data.get('original_input') else None,
            ai_processing=json.dumps(data.get('ai_processing')) if data.get('ai_processing') else None,
            tags=json.dumps(data.get('tags', [])),
            is_scheduled=data.get('is_scheduled', False),
            scheduled_for=datetime.fromisoformat(data['scheduled_for'].replace('Z', '+00:00')) if data.get('scheduled_for') else None,
            sync_status='pending'
        )
        
        db.session.add(new_record)
        db.session.commit()
        
        # Log de auditoría
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type='health_record_created',
            severity='info',
            details=json.dumps({
                'child_id': child_id,
                'record_id': record_id,
                'record_type': data['type'],
                'ai_extracted': data.get('ai_extracted', False),
                'ip_address': client_ip
            }),
            ip_address=client_ip,
            user_agent=request.headers.get('User-Agent', ''),
            hash=AuthUtils.calculate_integrity_hash({
                'event': 'health_record_created',
                'user_id': current_user_id,
                'record_id': record_id,
                'timestamp': datetime.utcnow().isoformat()
            })
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registro de salud creado exitosamente',
            'record': new_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children/<child_id>/chat', methods=['GET'])
@jwt_required()
def get_chat_history(child_id):
    """Obtiene el historial de chat de un niño"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validar UUID
        if not SecurityValidator.validate_uuid(child_id):
            return jsonify({'error': 'ID de niño inválido'}), 400
        
        # Verificar que el niño pertenece al usuario
        child = Child.query.filter_by(id=child_id, user_id=current_user_id, is_active=True).first()
        if not child:
            return jsonify({'error': 'Niño no encontrado'}), 404
        
        # Parámetros de consulta
        session_id = request.args.get('session_id')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Construir consulta
        query = ChatHistory.query.filter_by(child_id=child_id)
        
        if session_id:
            query = query.filter_by(session_id=session_id)
        
        # Ordenar por timestamp ascendente para mantener orden de conversación
        query = query.order_by(ChatHistory.timestamp.asc())
        
        # Aplicar paginación
        messages = query.offset(offset).limit(limit).all()
        total_count = query.count()
        
        return jsonify({
            'success': True,
            'messages': [message.to_dict() for message in messages],
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children/<child_id>/chat', methods=['POST'])
@jwt_required()
def save_chat_message(child_id):
    """Guarda un mensaje de chat"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validar UUID
        if not SecurityValidator.validate_uuid(child_id):
            return jsonify({'error': 'ID de niño inválido'}), 400
        
        # Verificar que el niño pertenece al usuario
        child = Child.query.filter_by(id=child_id, user_id=current_user_id, is_active=True).first()
        if not child:
            return jsonify({'error': 'Niño no encontrado'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Sanitizar input
        data = SecurityValidator.sanitize_input(data)
        
        # Validar campos requeridos
        required_fields = ['session_id', 'role', 'content']
        is_valid, message = SecurityValidator.validate_json_schema(data, required_fields)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Crear nuevo mensaje
        message_id = AuthUtils.generate_uuid()
        
        new_message = ChatHistory(
            id=message_id,
            child_id=child_id,
            session_id=data['session_id'],
            role=data['role'],
            content=data['content'],
            context=json.dumps(data.get('context')) if data.get('context') else None,
            ai_model=data.get('ai_model'),
            tokens=data.get('tokens')
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Mensaje guardado exitosamente',
            'chat_message': new_message.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/children/<child_id>/insights', methods=['GET'])
@jwt_required()
def get_insights(child_id):
    """Obtiene los insights de un niño"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validar UUID
        if not SecurityValidator.validate_uuid(child_id):
            return jsonify({'error': 'ID de niño inválido'}), 400
        
        # Verificar que el niño pertenece al usuario
        child = Child.query.filter_by(id=child_id, user_id=current_user_id, is_active=True).first()
        if not child:
            return jsonify({'error': 'Niño no encontrado'}), 404
        
        # Parámetros de consulta
        insight_type = request.args.get('type')
        severity = request.args.get('severity')
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        # Construir consulta
        query = Insight.query.filter_by(child_id=child_id, is_dismissed=False)
        
        if insight_type:
            query = query.filter_by(type=insight_type)
        
        if severity:
            query = query.filter_by(severity=severity)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        # Filtrar insights no expirados
        query = query.filter(
            (Insight.expires_at.is_(None)) | 
            (Insight.expires_at > datetime.utcnow())
        )
        
        # Ordenar por severidad y fecha
        severity_order = {'critical': 1, 'alert': 2, 'warning': 3, 'info': 4}
        query = query.order_by(
            Insight.severity.case(severity_order).asc(),
            Insight.generated_at.desc()
        )
        
        # Aplicar paginación
        insights = query.offset(offset).limit(limit).all()
        total_count = query.count()
        
        return jsonify({
            'success': True,
            'insights': [insight.to_dict() for insight in insights],
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@health_bp.route('/search', methods=['GET'])
@jwt_required()
def search_web():
    """Realiza búsquedas web de información médica"""
    try:
        current_user_id = get_jwt_identity()
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        
        # Rate limiting para búsquedas
        if not rate_limiter.is_allowed(f"search_{current_user_id}", limit=20, window=3600):
            return jsonify({'error': 'Límite de búsquedas excedido. Intenta más tarde.'}), 429
        
        query = request.args.get('q')
        if not query:
            return jsonify({'error': 'Parámetro de búsqueda requerido'}), 400
        
        # Sanitizar query
        query = SecurityValidator.sanitize_input(query)
        
        # Realizar búsqueda usando DuckDuckGo (simulado)
        search_results = perform_medical_search(query)
        
        # Log de auditoría
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type='web_search',
            severity='info',
            details=json.dumps({
                'query': query,
                'results_count': len(search_results),
                'ip_address': client_ip
            }),
            ip_address=client_ip,
            user_agent=request.headers.get('User-Agent', ''),
            hash=AuthUtils.calculate_integrity_hash({
                'event': 'web_search',
                'user_id': current_user_id,
                'query': query,
                'timestamp': datetime.utcnow().isoformat()
            })
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'query': query,
            'results': search_results
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

def perform_medical_search(query):
    """Realiza búsqueda médica usando fuentes confiables"""
    # Esta es una implementación simulada
    # En producción, se integraría con APIs de búsqueda médica confiables
    
    medical_sources = [
        {
            'source': 'Mayo Clinic',
            'url': f'https://www.mayoclinic.org/search?q={query}',
            'snippet': f'Información médica confiable sobre {query} de Mayo Clinic.',
            'relevance': 0.9
        },
        {
            'source': 'WebMD',
            'url': f'https://www.webmd.com/search?q={query}',
            'snippet': f'Recursos de salud y información médica sobre {query}.',
            'relevance': 0.8
        },
        {
            'source': 'Healthline',
            'url': f'https://www.healthline.com/search?q={query}',
            'snippet': f'Artículos de salud revisados médicamente sobre {query}.',
            'relevance': 0.85
        }
    ]
    
    # Filtrar y ordenar por relevancia
    filtered_results = [result for result in medical_sources if result['relevance'] > 0.7]
    filtered_results.sort(key=lambda x: x['relevance'], reverse=True)
    
    return filtered_results[:5]  # Limitar a 5 resultados

