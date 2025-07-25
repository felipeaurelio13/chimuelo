import React, { useEffect, useState, ChangeEvent } from 'react';

interface Child {
  id: string;
  name: string;
  birth_date: string;
}

interface HealthRecord {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  ai_extracted?: boolean;
  ai_result?: any;
}

const API_URL = 'http://localhost:5000/api';

const Timeline: React.FC = () => {
  const [child, setChild] = useState<Child | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: '', value: '', unit: '', notes: '' });
  const [childForm, setChildForm] = useState({ name: '', birth_date: '' });
  const [error, setError] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState<string>('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch child on mount
  useEffect(() => {
    fetch(`${API_URL}/children`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.children.length > 0) {
          setChild(data.children[0]);
        }
      });
  }, []);

  // Fetch records when child changes
  useEffect(() => {
    if (!child) return;
    setLoading(true);
    fetch(`${API_URL}/children/${child.id}/records`)
      .then(res => res.json())
      .then(data => {
        setRecords(data.records || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [child]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!child) return;
    const payload = {
      type: form.type,
      timestamp: new Date().toISOString(),
      data: {
        value: form.value,
        unit: form.unit,
        notes: form.notes,
        ai_result: aiResult,
      },
      ai_extracted: !!aiResult,
    };
    const res = await fetch(`${API_URL}/children/${child.id}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setForm({ type: '', value: '', unit: '', notes: '' });
      setAiInput('');
      setAiResult(null);
      // Refresh records
      fetch(`${API_URL}/children/${child.id}/records`)
        .then(res => res.json())
        .then(data => setRecords(data.records || []));
    } else {
      const err = await res.json();
      setError(err.error || 'Error al crear registro');
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name: childForm.name,
      birth_date: childForm.birth_date,
      gender: 'other', // default for MVP
    };
    const res = await fetch(`${API_URL}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setChild(data.child);
    } else {
      const err = await res.json();
      setError(err.error || 'Error al crear niño');
    }
  };

  const handleAiInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setAiInput(e.target.value);
    setAiResult(null);
    setAiError(null);
  };

  const handleAnalyzeAI = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const payload = {
        input: aiInput,
        inputType: 'text',
        schema: {
          type: 'object',
          properties: {
            tipo: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            datos: {
              type: 'object',
              properties: {
                peso: { type: 'number' },
                talla: { type: 'number' },
                sintoma: { type: 'string' },
                hito: { type: 'string' }
              },
              minProperties: 1
            }
          },
          required: ['tipo', 'timestamp', 'datos']
        },
        options: { model: 'gpt-4-1106-preview', temperature: 0.2, maxTokens: 1024 }
      };
      const res = await fetch(`${API_URL}/openai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data.data);
      } else {
        const err = await res.json();
        setAiError(err.error || 'Error en análisis IA');
      }
    } catch (e) {
      setAiError('Error en análisis IA');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h2>Timeline de Salud</h2>
      {!child && (
        <>
          <h3>Registrar niño</h3>
          <form onSubmit={handleCreateChild} style={{ marginBottom: 24 }}>
            <input
              required
              placeholder="Nombre"
              value={childForm.name}
              onChange={e => setChildForm(f => ({ ...f, name: e.target.value }))}
            />{' '}
            <input
              required
              type="date"
              placeholder="Fecha de nacimiento"
              value={childForm.birth_date}
              onChange={e => setChildForm(f => ({ ...f, birth_date: e.target.value }))}
            />{' '}
            <button type="submit">Crear</button>
          </form>
        </>
      )}
      {child && (
        <>
          <div style={{ marginBottom: 16 }}>
            <b>Niño registrado:</b> {child.name} (nacido el {child.birth_date})
          </div>
          <h3>Análisis IA de input de salud</h3>
          <textarea
            placeholder="Describe un síntoma, evento, peso, talla, etc. (texto libre para IA)"
            value={aiInput}
            onChange={handleAiInputChange}
            rows={3}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button onClick={handleAnalyzeAI} disabled={aiLoading || !aiInput} style={{ marginBottom: 8 }}>
            {aiLoading ? 'Analizando...' : 'Analizar con IA'}
          </button>
          {aiError && <div style={{ color: 'red', fontWeight: 'bold' }}>{aiError}</div>}
          {aiResult && (
            <div style={{ background: '#f0f0f0', padding: 8, marginBottom: 8 }}>
              <b>Resultado IA:</b>
              <pre style={{ fontSize: 12 }}>{JSON.stringify(aiResult, null, 2)}</pre>
            </div>
          )}
          <h3>Agregar registro de salud</h3>
          <form onSubmit={handleAddRecord} style={{ marginBottom: 24 }}>
            <input
              required
              placeholder="Tipo (ej: weight, height, symptom)"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            />{' '}
            <input
              required
              placeholder="Valor"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            />{' '}
            <input
              placeholder="Unidad (ej: kg, cm)"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            />{' '}
            <input
              placeholder="Notas"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />{' '}
            <button type="submit">Agregar</button>
          </form>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <h3>Registros recientes</h3>
          {loading ? <p>Cargando...</p> : (
            <ul>
              {records.map(r => (
                <li key={r.id}>
                  <b>{r.type}</b> — {r.data.value} {r.data.unit} <i>({new Date(r.timestamp).toLocaleString()})</i>
                  {r.data.notes && <> — {r.data.notes}</>}
                  {r.data.ai_result && (
                    <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                      <b>IA:</b> <pre style={{ display: 'inline' }}>{JSON.stringify(r.data.ai_result, null, 2)}</pre>
                    </div>
                  )}
                </li>
              ))}
              {records.length === 0 && <li>No hay registros aún.</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default Timeline;
