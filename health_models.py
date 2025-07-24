from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from src.models.user import db

class Child(db.Model):
    """Modelo para representar un niño en el sistema"""
    __tablename__ = 'children'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)  # 'male', 'female', 'other'
    blood_type = db.Column(db.String(5), nullable=True)
    allergies = db.Column(db.Text, nullable=True)  # JSON string
    medical_conditions = db.Column(db.Text, nullable=True)  # JSON string
    pediatrician_info = db.Column(db.Text, nullable=True)  # JSON string
    emergency_contact = db.Column(db.Text, nullable=True)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relaciones
    health_records = db.relationship('HealthRecord', backref='child', lazy=True, cascade='all, delete-orphan')
    chat_history = db.relationship('ChatHistory', backref='child', lazy=True, cascade='all, delete-orphan')
    insights = db.relationship('Insight', backref='child', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Child {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'gender': self.gender,
            'blood_type': self.blood_type,
            'allergies': json.loads(self.allergies) if self.allergies else [],
            'medical_conditions': json.loads(self.medical_conditions) if self.medical_conditions else [],
            'pediatrician_info': json.loads(self.pediatrician_info) if self.pediatrician_info else {},
            'emergency_contact': json.loads(self.emergency_contact) if self.emergency_contact else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }

class HealthRecord(db.Model):
    """Modelo para registros de salud y crecimiento"""
    __tablename__ = 'health_records'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    child_id = db.Column(db.String(36), db.ForeignKey('children.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'weight', 'height', 'temperature', etc.
    timestamp = db.Column(db.DateTime, nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON string con datos específicos
    ai_extracted = db.Column(db.Boolean, default=False)
    original_input = db.Column(db.Text, nullable=True)  # JSON string con input original
    ai_processing = db.Column(db.Text, nullable=True)  # JSON string con info de procesamiento IA
    tags = db.Column(db.Text, nullable=True)  # JSON string con tags
    is_scheduled = db.Column(db.Boolean, default=False)
    scheduled_for = db.Column(db.DateTime, nullable=True)
    reminder_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sync_status = db.Column(db.String(20), default='pending')  # 'pending', 'synced', 'error'
    
    def __repr__(self):
        return f'<HealthRecord {self.type} for {self.child_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'type': self.type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'data': json.loads(self.data) if self.data else {},
            'ai_extracted': self.ai_extracted,
            'original_input': json.loads(self.original_input) if self.original_input else None,
            'ai_processing': json.loads(self.ai_processing) if self.ai_processing else None,
            'tags': json.loads(self.tags) if self.tags else [],
            'is_scheduled': self.is_scheduled,
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'reminder_sent': self.reminder_sent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'sync_status': self.sync_status
        }

class ChatHistory(db.Model):
    """Modelo para historial de chat con IA"""
    __tablename__ = 'chat_history'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    child_id = db.Column(db.String(36), db.ForeignKey('children.id'), nullable=False)
    session_id = db.Column(db.String(36), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    context = db.Column(db.Text, nullable=True)  # JSON string con contexto
    ai_model = db.Column(db.String(50), nullable=True)
    tokens = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ChatHistory {self.role} for {self.child_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'context': json.loads(self.context) if self.context else {},
            'ai_model': self.ai_model,
            'tokens': self.tokens,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Insight(db.Model):
    """Modelo para insights y alertas generadas automáticamente"""
    __tablename__ = 'insights'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    child_id = db.Column(db.String(36), db.ForeignKey('children.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'growth_percentile', 'alert', 'milestone', etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    data = db.Column(db.Text, nullable=True)  # JSON string con datos específicos
    severity = db.Column(db.String(20), nullable=False)  # 'info', 'warning', 'alert', 'critical'
    is_read = db.Column(db.Boolean, default=False)
    is_dismissed = db.Column(db.Boolean, default=False)
    action_required = db.Column(db.Boolean, default=False)
    related_records = db.Column(db.Text, nullable=True)  # JSON string con IDs de registros relacionados
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    def __repr__(self):
        return f'<Insight {self.type} for {self.child_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'data': json.loads(self.data) if self.data else {},
            'severity': self.severity,
            'is_read': self.is_read,
            'is_dismissed': self.is_dismissed,
            'action_required': self.action_required,
            'related_records': json.loads(self.related_records) if self.related_records else [],
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

class SyncLog(db.Model):
    """Modelo para registro de operaciones de sincronización"""
    __tablename__ = 'sync_logs'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    operation = db.Column(db.String(50), nullable=False)  # 'push', 'pull', 'conflict_resolution'
    status = db.Column(db.String(20), nullable=False)  # 'success', 'error', 'pending'
    records_affected = db.Column(db.Integer, default=0)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    error = db.Column(db.Text, nullable=True)
    details = db.Column(db.Text, nullable=True)  # JSON string con detalles
    
    def __repr__(self):
        return f'<SyncLog {self.operation} for {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'operation': self.operation,
            'status': self.status,
            'records_affected': self.records_affected,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'error': self.error,
            'details': json.loads(self.details) if self.details else {}
        }

class AuditLog(db.Model):
    """Modelo para auditoría de eventos de seguridad"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True)
    event_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # 'info', 'warning', 'error', 'critical'
    details = db.Column(db.Text, nullable=False)  # JSON string
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    session_id = db.Column(db.String(36), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    hash = db.Column(db.String(64), nullable=False)  # Hash para integridad
    
    def __repr__(self):
        return f'<AuditLog {self.event_type} at {self.timestamp}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'severity': self.severity,
            'details': json.loads(self.details) if self.details else {},
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'session_id': self.session_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'hash': self.hash
        }

