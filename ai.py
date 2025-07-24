from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import json
import os
from src.utils.auth_utils import AuthUtils, SecurityValidator
from src.models.health_models import AuditLog, db
from datetime import datetime

ai_bp = Blueprint("ai", __name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")

@ai_bp.route("/openai/extract", methods=["POST"])
@jwt_required()
def openai_extract():
    """Extrae datos de salud de un input usando IA"""
    current_user_id = get_jwt_identity()
    client_ip = request.environ.get("HTTP_X_FORWARDED_FOR", request.remote_addr)

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400

        # Sanitizar input
        data = SecurityValidator.sanitize_input(data)

        required_fields = ["input", "inputType", "schema"]
        is_valid, message = SecurityValidator.validate_json_schema(data, required_fields)
        if not is_valid:
            return jsonify({"error": message}), 400

        input_content = data["input"]
        input_type = data["inputType"]
        schema = data["schema"]
        options = data.get("options", {})

        model = options.get("model", "gpt-4-1106-preview")
        temperature = options.get("temperature", 0.2)
        max_tokens = options.get("maxTokens", 1024)

        system_prompt = "Eres un extractor de datos médicos especializado. Devuelve únicamente JSON válido que cumpla exactamente con el schema proporcionado."
        user_prompt = build_extraction_prompt(input_content, input_type, schema)

        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        # Si el modelo es de visión, ajustar el payload
        if "vision" in model:
            payload["messages"] = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": "Extrae datos de salud de esta imagen según el schema JSON proporcionado."},
                    {"type": "image_url", "image_url": {"url": input_content}}
                ]}
            ]
            # Eliminar response_format si no es compatible con modelos de visión
            if "response_format" in payload: del payload["response_format"]

        openai_response = requests.post(f"{OPENAI_API_BASE}/chat/completions", headers=headers, json=payload)
        openai_response.raise_for_status()  # Lanza excepción para errores HTTP
        response_data = openai_response.json()

        extracted_content = response_data["choices"][0]["message"]["content"]
        extracted_data = json.loads(extracted_content)

        # Log de auditoría
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_data_extraction",
            severity="info",
            details=json.dumps({
                "input_type": input_type,
                "model": model,
                "usage": response_data.get("usage"),
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_data_extraction",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()

        return jsonify({
            "success": True,
            "data": extracted_data,
            "usage": response_data.get("usage"),
            "model": response_data.get("model"),
        }), 200

    except requests.exceptions.RequestException as e:
        error_message = f"Error al comunicarse con OpenAI: {e}"
        if e.response:
            error_message += f" - {e.response.text}"
        # Log de auditoría para errores
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_extraction_failed",
            severity="error",
            details=json.dumps({
                "input_type": data.get("inputType"),
                "error_message": error_message,
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_extraction_failed",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()
        return jsonify({"error": error_message}), 500
    except json.JSONDecodeError:
        # Log de auditoría para errores de JSON
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_extraction_json_error",
            severity="error",
            details=json.dumps({
                "input_type": data.get("inputType"),
                "error_message": "Respuesta de OpenAI no es un JSON válido",
                "raw_response": extracted_content, # Capturar la respuesta cruda
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_extraction_json_error",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()
        return jsonify({"error": "Respuesta de OpenAI no es un JSON válido"}), 500
    except Exception as e:
        # Log de auditoría para errores generales
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_extraction_general_error",
            severity="critical",
            details=json.dumps({
                "input_type": data.get("inputType"),
                "error_message": str(e),
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_extraction_general_error",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

@ai_bp.route("/openai/chat", methods=["POST"])
@jwt_required()
def openai_chat():
    """Realiza una consulta de chat con contexto"""
    current_user_id = get_jwt_identity()
    client_ip = request.environ.get("HTTP_X_FORWARDED_FOR", request.remote_addr)

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionaron datos"}), 400

        # Sanitizar input
        data = SecurityValidator.sanitize_input(data)

        required_fields = ["messages", "context"]
        is_valid, message = SecurityValidator.validate_json_schema(data, required_fields)
        if not is_valid:
            return jsonify({"error": message}), 400

        messages = data["messages"]
        context = data["context"]
        search_results = data.get("searchResults", [])
        options = data.get("options", {})

        model = options.get("model", "gpt-4o")
        temperature = options.get("temperature", 0.7)
        max_tokens = options.get("maxTokens", 2048)

        system_prompt = build_chat_system_prompt(context, search_results)

        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        openai_response = requests.post(f"{OPENAI_API_BASE}/chat/completions", headers=headers, json=payload)
        openai_response.raise_for_status()  # Lanza excepción para errores HTTP
        response_data = openai_response.json()

        chat_message = response_data["choices"][0]["message"]["content"]

        # Log de auditoría
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_chat_completion",
            severity="info",
            details=json.dumps({
                "model": model,
                "usage": response_data.get("usage"),
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_chat_completion",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": chat_message,
            "usage": response_data.get("usage"),
            "model": response_data.get("model"),
        }), 200

    except requests.exceptions.RequestException as e:
        error_message = f"Error al comunicarse con OpenAI: {e}"
        if e.response:
            error_message += f" - {e.response.text}"
        # Log de auditoría para errores
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_chat_failed",
            severity="error",
            details=json.dumps({
                "error_message": error_message,
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_chat_failed",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()
        return jsonify({"error": error_message}), 500
    except Exception as e:
        # Log de auditoría para errores generales
        audit_log = AuditLog(
            id=AuthUtils.generate_uuid(),
            user_id=current_user_id,
            event_type="ai_chat_general_error",
            severity="critical",
            details=json.dumps({
                "error_message": str(e),
                "ip_address": client_ip,
            }),
            ip_address=client_ip,
            user_agent=request.headers.get("User-Agent", ""),
            hash=AuthUtils.calculate_integrity_hash({
                "event": "ai_chat_general_error",
                "user_id": current_user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit_log)
        db.session.commit()
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

def build_extraction_prompt(input_content, input_type, schema):
    """Construye el prompt para la extracción de datos"""
    base_prompt = f"""Analiza el siguiente {input_type} y extrae todos los datos de salud relevantes según el schema JSON proporcionado.

Schema requerido:
{json.dumps(schema, indent=2)}

Input a analizar:
{input_content}

Instrucciones:
1. Extrae únicamente información explícitamente presente en el input
2. Si no hay suficiente información para un campo requerido, usa valores por defecto razonables
3. Asigna un nivel de confianza basado en la claridad de la información
4. Incluye el timestamp más preciso posible basado en el contexto
5. Devuelve únicamente JSON válido, sin texto adicional"""
    return base_prompt

def build_chat_system_prompt(context, search_results):
    """Construye el prompt del sistema para el chat"""
    prompt = f"""Eres un asistente especializado en salud infantil. Tu objetivo es ayudar a padres con preguntas sobre la salud y desarrollo de sus hijos.

Contexto del niño:
{json.dumps(context, indent=2)}"""

    if search_results:
        prompt += "\n\nInformación adicional de fuentes confiables:\n"
        for result in search_re             prompt += f"- {result.get("source", "Desconocido")}: {result.get("snippet", "")}\n"'\")}\n""'  prompt += f"""\n\nInstrucciones:
1. Proporciona respuestas informativas pero siempre recuerda que no reemplazas el consejo médico profesional
2. Si detectas algo que requiere atención médica inmediata, recomienda consultar con un pediatra
3. Usa el contexto del niño para personalizar tus respuestas
4. Cita las fuentes cuando uses información de búsquedas web
5. Mantén un tono cálido y comprensivo"""
    return prompt


