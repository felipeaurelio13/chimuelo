import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BabyProfile, MedicalMilestone, FutureMilestone, MedicalSummary } from '../types/medical';
import { calculateAge, formatAge } from '../utils/dateUtils';
import { dataIntegrityService } from '../services/dataIntegrityService';
import openaiService from '../services/openaiService';
import AppFooter from '../components/AppFooter';
import '../styles/MedicalFile.css';

interface EditProfileModalProps {
  profile: BabyProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Partial<BabyProfile>) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<BabyProfile>>({});

  useEffect(() => {
    if (profile) {
      setFormData({ ...profile });
    }
  }, [profile]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content medical-profile-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>✏️ Editar Perfil de Maxi</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>

        <form className="profile-form" onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
          onClose();
        }}>
          <div className="form-grid">
            <div className="form-group">
              <label>👶 Nombre</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del bebé"
              />
            </div>

            <div className="form-group">
              <label>📅 Fecha de Nacimiento</label>
              <input
                type="date"
                value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: new Date(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label>🚻 Género</label>
              <select
                value={formData.gender || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
              >
                <option value="">Seleccionar</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="form-group">
              <label>🩸 Tipo de Sangre</label>
              <input
                type="text"
                value={formData.bloodType || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bloodType: e.target.value }))}
                placeholder="A+, O-, etc."
              />
            </div>

            <div className="form-group">
              <label>⚖️ Peso Actual (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.currentWeight || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, currentWeight: parseFloat(e.target.value) }))}
                placeholder="0.0"
              />
            </div>

            <div className="form-group">
              <label>📏 Altura Actual (cm)</label>
              <input
                type="number"
                step="0.1"
                value={formData.currentHeight || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, currentHeight: parseFloat(e.target.value) }))}
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>🚨 Alergias</label>
            <textarea
              value={formData.allergies?.join(', ') || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                allergies: e.target.value.split(',').map(a => a.trim()).filter(a => a) 
              }))}
              placeholder="Separar con comas: leche, nueces, etc."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              💾 Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MedicalFile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { healthRecords, refreshHealthRecords } = useData();

  // State
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [milestones, setMilestones] = useState<MedicalMilestone[]>([]);
  const [futureMilestones, setFutureMilestones] = useState<FutureMilestone[]>([]);
  const [summary, setSummary] = useState<MedicalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'milestones' | 'future'>('profile');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MedicalMilestone | null>(null);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadMedicalFile();
  }, [user]);

  const loadMedicalFile = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('🔧 [DEBUG] Iniciando carga de ficha médica...');
      
      // Refresh health records first
      await refreshHealthRecords();
      console.log('🔧 [DEBUG] Health records refreshed');

      // Load baby profile using centralized service with error handling
      let profile;
      try {
        profile = dataIntegrityService.getBabyProfile();
        console.log('🔧 [DEBUG] Perfil cargado:', profile?.name || 'Sin nombre');
        
        // Ensure profile is never null
        if (!profile || !profile.name) {
          console.log('🔧 [DEBUG] Perfil inválido, creando por defecto');
          profile = {
            id: 'default',
            name: 'Maxi',
            dateOfBirth: new Date('2024-11-01'),
            gender: 'male' as const,
            currentWeight: 0,
            currentHeight: 0,
            bloodType: '',
            allergies: [],
            pediatrician: { name: '', phone: '', clinic: '' },
            lastUpdated: new Date(),
            confidence: 0
          };
        }
      } catch (profileError) {
        console.error('🔧 [DEBUG] Error cargando perfil, usando default:', profileError);
        profile = {
          id: 'default',
          name: 'Maxi',
          dateOfBirth: new Date('2024-11-01'),
          gender: 'male' as const,
          currentWeight: 0,
          currentHeight: 0,
          bloodType: '',
          allergies: [],
          pediatrician: { name: '', phone: '', clinic: '' },
          lastUpdated: new Date(),
          confidence: 0
        };
      }
      
      setBabyProfile(profile);

      // Convert health records to milestones
      const convertedMilestones = healthRecords.map((record: any) => ({
        id: record.id,
        title: formatMilestoneTitle(record),
        description: formatMilestoneDescription(record),
        category: mapRecordTypeToCategory(record.type),
        date: record.timestamp,
        ageAtMilestone: calculateAge(babyProfile?.dateOfBirth || new Date('2024-11-01'), record.timestamp),
        details: {
          notes: record.notes,
          measurements: record.data,
          parentNotes: record.metadata?.context
        },
        confidence: record.confidence || 0.8,
        requiresAttention: record.requiresAttention || false,
        tags: record.tags || [],
        relatedRecordIds: [],
        createdAt: record.createdAt || record.timestamp,
        updatedAt: record.updatedAt || record.timestamp,
        source: record.metadata?.source === 'ai_extraction' ? 'ai_detected' as const : 'manual' as const
      })) as MedicalMilestone[];

      setMilestones(convertedMilestones);
      console.log('🔧 [DEBUG] Hitos convertidos:', convertedMilestones.length);

      // Generate summary
      generateSummary(convertedMilestones);

    } catch (error) {
      console.error('🔧 [DEBUG] Error loading medical file:', error);
      
      // Ensure we always have a valid profile even on error
      setBabyProfile({
        id: 'default',
        name: 'Maxi',
        dateOfBirth: new Date('2024-11-01'),
        gender: 'male' as const,
        currentWeight: 0,
        currentHeight: 0,
        bloodType: '',
        allergies: [],
        pediatrician: { name: '', phone: '', clinic: '' },
        lastUpdated: new Date(),
        confidence: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, healthRecords, refreshHealthRecords]); // Removed babyProfile dependency to fix circular dependency

  const loadFutureMilestones = useCallback(() => {
    console.log('🔧 [DEBUG] Cargando hitos futuros...');
    
    // Use safe profile data
    const safeProfile = babyProfile || {
      dateOfBirth: new Date('2024-11-01'),
      name: 'Maxi'
    };
    
    const birthDate = safeProfile.dateOfBirth;
    const currentAge = calculateAge(birthDate, new Date());
    
    console.log('🔧 [DEBUG] Edad actual calculada:', currentAge);
    
    // Generate standard milestones based on age
    const standardMilestones = generateStandardMilestones(birthDate, currentAge);
    setFutureMilestones(standardMilestones);
    
    console.log('🔧 [DEBUG] Hitos futuros cargados:', standardMilestones.length);
  }, [babyProfile]);

  // Load future milestones when profile is ready
  useEffect(() => {
    if (babyProfile && !isLoading) {
      loadFutureMilestones();
    }
  }, [babyProfile, isLoading, loadFutureMilestones]);

  const generateStandardMilestones = (birthDate: Date, currentAge: string): FutureMilestone[] => {
    // This would be a comprehensive milestone generator
    // For now, returning sample milestones
    const milestones: FutureMilestone[] = [
      {
        id: 'vaccine_4m',
        title: 'Vacunas de los 4 meses',
        description: 'Segunda dosis de DTPa, Hib, Neumococo, Rotavirus',
        category: 'vaccination',
        expectedAge: '4 meses',
        expectedDate: new Date(birthDate.getTime() + (4 * 30 * 24 * 60 * 60 * 1000)),
        priority: 'high',
        status: 'pending',
        dynamicallyGenerated: false,
        source: 'standard_calendar',
        confidence: 0.95,
        reminderSet: false,
        dismissed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'checkup_6m',
        title: 'Control pediátrico 6 meses',
        description: 'Control de crecimiento, desarrollo neuromotor, inicio alimentación complementaria',
        category: 'medical_checkup',
        expectedAge: '6 meses',
        expectedDate: new Date(birthDate.getTime() + (6 * 30 * 24 * 60 * 60 * 1000)),
        priority: 'high',
        status: 'pending',
        dynamicallyGenerated: false,
        source: 'standard_calendar',
        confidence: 0.9,
        reminderSet: false,
        dismissed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return milestones.filter(m => m.expectedDate > new Date());
  };

  const generateAIMilestones = async () => {
    if (!babyProfile || !(await openaiService.isAvailable())) return;

    setIsGeneratingMilestones(true);
    try {
      const currentAge = calculateAge(babyProfile.dateOfBirth, new Date());
      const context = {
        babyName: babyProfile.name,
        age: currentAge,
        recentMilestones: milestones.slice(0, 5),
        allergies: babyProfile.allergies
      };

      const prompt = `Como pediatra experto especializado en desarrollo infantil, genera 5-8 hitos/milestones futuros personalizados para ${babyProfile.name}, un bebé de ${currentAge}.

CONTEXTO ACTUAL DE ${babyProfile.name.toUpperCase()}:
- Edad actual: ${currentAge}
- Alergias: ${babyProfile.allergies.join(', ') || 'Ninguna conocida'}
- Peso actual: ${babyProfile.currentWeight ? `${babyProfile.currentWeight} kg` : 'No registrado'}
- Altura actual: ${babyProfile.currentHeight ? `${babyProfile.currentHeight} cm` : 'No registrado'}
- Hitos recientes: ${milestones.map(m => m.title).slice(0, 3).join(', ')}

GENERA HITOS FUTUROS APROPIADOS PARA LA EDAD:

VACUNACIONES (según calendario AEP España):
- 2 meses: Hexavalente, Neumococo, Rotavirus
- 4 meses: Hexavalente, Neumococo, Rotavirus  
- 6 meses: Hexavalente, Neumococo, Rotavirus
- 12 meses: Triple vírica, Neumococo, Meningococo C
- 15 meses: Varicela
- 18 meses: Hexavalente, Polio

DESARROLLO NEUROMOTOR POR EDAD:
- 2-3 meses: Sonrisa social, seguimiento visual, sostiene cabeza
- 4-5 meses: Se gira, agarra objetos, balbucea
- 6-7 meses: Se sienta con apoyo, transfiere objetos
- 8-9 meses: Se sienta solo, gateo, pinza inferior
- 10-12 meses: Se pone de pie, primeras palabras
- 12-15 meses: Camina solo, torre de 2 cubos
- 15-18 meses: Corre, 10-20 palabras, usa cuchara

CONTROLES PEDIÁTRICOS:
- Cada mes los primeros 6 meses
- Cada 2 meses hasta el año
- Cada 3 meses hasta los 2 años

Para cada hito, genera:
- title: Título específico y claro
- description: Descripción detallada y práctica
- expectedAge: Edad específica (ej: "4 meses", "6 meses")
- priority: low/medium/high/critical
- category: vaccination/development/medical_checkup/preventive_care

FORMATO REQUERIDO - Responde SOLO un JSON array válido:
[
  {
    "title": "ejemplo",
    "description": "descripción detallada", 
    "expectedAge": "X meses",
    "priority": "medium",
    "category": "vaccination"
  }
]`;

              const response = await openaiService.chatCompletion([
          { role: 'system', content: `Eres un pediatra experto especializado en desarrollo infantil y calendarios de vacunación españoles. 

OBJETIVO: Generar hitos/milestones futuros específicos y realistas para bebés.

INSTRUCCIONES CLAVE:
- Responde SIEMPRE en formato JSON array válido
- Usa el calendario oficial AEP de vacunaciones
- Considera la edad específica del bebé
- Incluye hitos de desarrollo apropiados para la edad
- Sé específico con las edades esperadas
- Prioriza la seguridad y el bienestar del bebé

FORMATO OBLIGATORIO: Array de objetos JSON con las propiedades exactas: title, description, expectedAge, priority, category` },
          { role: 'user', content: prompt }
        ]);

      try {
        // Clean the response to ensure it's valid JSON
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
        }
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```.*?\n/, '').replace(/```\s*$/, '');
        }

        const aiMilestones = JSON.parse(cleanResponse);
        if (Array.isArray(aiMilestones) && aiMilestones.length > 0) {
          const newMilestones: FutureMilestone[] = aiMilestones.map((ai: any, index: number) => ({
            id: `ai_${Date.now()}_${index}`,
            title: ai.title || `Hito ${index + 1}`,
            description: ai.description || 'Consulta con tu pediatra para más información.',
            category: ai.category || 'medical_checkup',
            expectedAge: ai.expectedAge || 'Próximamente',
            expectedDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000), // Spread over coming months
            priority: ai.priority || 'medium',
            status: 'pending',
            dynamicallyGenerated: true,
            source: 'ai_recommended',
            confidence: 0.85,
            reminderSet: false,
            dismissed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          setFutureMilestones(prev => [...prev, ...newMilestones]);
        } else {
          throw new Error('No se generaron hitos válidos');
        }
      } catch (parseError) {
        console.error('Error parsing AI milestones:', parseError);
        // Agregar hitos de fallback basados en la edad
        addFallbackMilestones();
      }

    } catch (error) {
      console.error('Error generating AI milestones:', error);
      // Usar fallback si hay error general
      addFallbackMilestones();
    } finally {
      setIsGeneratingMilestones(false);
    }
  };

  const addFallbackMilestones = () => {
    if (!babyProfile) return;

    const birthDate = new Date(babyProfile.dateOfBirth);
    const currentDate = new Date();
    const ageInMonths = Math.floor((currentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    const fallbackMilestones: FutureMilestone[] = [];

    // Generar hitos basados en la edad actual
    const upcomingAges = [ageInMonths + 1, ageInMonths + 2, ageInMonths + 3, ageInMonths + 6, ageInMonths + 12];

    upcomingAges.forEach((targetAge, index) => {
      if (targetAge <= 24) { // Solo hasta 2 años
        let milestone: Partial<FutureMilestone> = {
          id: `fallback_${Date.now()}_${index}`,
          status: 'pending',
          dynamicallyGenerated: true,
          source: 'fallback',
          confidence: 0.7,
          reminderSet: false,
          dismissed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          expectedDate: new Date(birthDate.getTime() + targetAge * 30.44 * 24 * 60 * 60 * 1000),
          expectedAge: `${targetAge} meses`
        };

        // Asignar hitos específicos por edad
        if (targetAge === 2) {
          milestone = { ...milestone, title: "Primera vacunación - 2 meses", description: "Vacuna hexavalente, neumococo y rotavirus. Programar cita con pediatra.", category: "vaccination", priority: "high" };
        } else if (targetAge === 4) {
          milestone = { ...milestone, title: "Segunda vacunación - 4 meses", description: "Segunda dosis de hexavalente, neumococo y rotavirus.", category: "vaccination", priority: "high" };
        } else if (targetAge === 6) {
          milestone = { ...milestone, title: "Tercera vacunación - 6 meses", description: "Tercera dosis de hexavalente, neumococo y rotavirus. Inicio de alimentación complementaria.", category: "vaccination", priority: "high" };
        } else if (targetAge === 12) {
          milestone = { ...milestone, title: "Vacunaciones del año", description: "Triple vírica, neumococo y meningococo C. Revisión del desarrollo.", category: "vaccination", priority: "high" };
        } else if (targetAge >= 2 && targetAge <= 6) {
          milestone = { ...milestone, title: "Control pediátrico", description: "Revisión de peso, talla y desarrollo. Evaluación del crecimiento.", category: "medical_checkup", priority: "medium" };
        } else if (targetAge >= 6 && targetAge <= 12) {
          milestone = { ...milestone, title: "Desarrollo motor", description: "Evaluación de hitos motores: sedestación, gateo, bipedestación.", category: "development", priority: "medium" };
        } else {
          milestone = { ...milestone, title: "Revisión pediátrica", description: "Control rutinario de salud y desarrollo.", category: "medical_checkup", priority: "medium" };
        }

        fallbackMilestones.push(milestone as FutureMilestone);
      }
    });

    setFutureMilestones(prev => [...prev, ...fallbackMilestones]);
  };

  const updateProfile = (updates: Partial<BabyProfile>) => {
    if (!babyProfile) return;

    const updated = { ...babyProfile, ...updates, lastUpdated: new Date() };
    setBabyProfile(updated);
    
    // Use centralized service to update profile
    dataIntegrityService.setBabyProfile(updated);
  };

  const toggleMilestoneStatus = (id: string) => {
    setFutureMilestones(prev => prev.map(milestone => 
      milestone.id === id 
        ? { 
            ...milestone, 
            status: milestone.status === 'completed' ? 'pending' : 'completed',
            completedDate: milestone.status === 'pending' ? new Date() : undefined
          }
        : milestone
    ));
  };

  const dismissMilestone = (id: string) => {
    setFutureMilestones(prev => prev.map(milestone => 
      milestone.id === id 
        ? { ...milestone, dismissed: true, status: 'dismissed' }
        : milestone
    ));
  };

  // Helper functions
  const formatMilestoneTitle = (record: any): string => {
    switch (record.type) {
      case 'weight': return `Peso: ${record.data.value}kg`;
      case 'height': return `Altura: ${record.data.value}cm`;
      case 'temperature': return `Temperatura: ${record.data.value}°C`;
      case 'medication': return `Medicamento: ${record.data.name}`;
      case 'symptom': return `Síntoma: ${record.data.description}`;
      case 'milestone': return `Hito: ${record.data.description}`;
      default: return record.data.description || 'Registro médico';
    }
  };

  const formatMilestoneDescription = (record: any): string => {
    return record.notes || record.data.notes || 'Sin detalles adicionales';
  };

  const mapRecordTypeToCategory = (type: string): MedicalMilestone['category'] => {
    switch (type) {
      case 'medication': return 'health_event';
      case 'milestone': return 'development';
      case 'weight':
      case 'height': return 'growth';
      default: return 'other';
    }
  };

  const generateSummary = (milestones: MedicalMilestone[]) => {
    const summary: MedicalSummary = {
      totalMilestones: milestones.length,
      upcomingMilestones: futureMilestones.filter(m => m.status === 'pending').length,
      overdueItems: 0, // Calculate based on expected dates
      lastUpdate: new Date(),
      growthPercentiles: {
        weight: 50, // Would calculate from growth charts
        height: 50,
        headCircumference: 50
      },
      recentConcerns: milestones.filter(m => m.requiresAttention).map(m => m.title).slice(0, 3),
      recentAchievements: milestones.filter(m => m.category === 'development').map(m => m.title).slice(0, 3),
      aiInsights: [
        'Crecimiento dentro de parámetros normales',
        'Desarrollo psicomotor adecuado para la edad'
      ],
      recommendedActions: [
        'Programar próximo control pediátrico',
        'Continuar con rutina de alimentación'
      ]
    };

    setSummary(summary);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="medical-file loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando ficha médica de Maxi...</p>
        </div>
      </div>
    );
  }

  // Error state - if somehow babyProfile is still null after loading
  if (!babyProfile) {
    console.error('🔧 [DEBUG] babyProfile is null after loading - critical error');
    return (
      <div className="medical-file error">
        <div className="error-container">
          <h2>⚠️ Error al cargar la ficha médica</h2>
          <p>Hubo un problema cargando los datos de Maxi.</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setIsLoading(true);
              loadMedicalFile();
            }}
          >
            🔄 Reintentar
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Safe access to babyProfile properties
  const profileName = babyProfile?.name || 'Maxi';
  const profileDateOfBirth = babyProfile?.dateOfBirth || new Date('2024-11-01');

  return (
    <div className="medical-file">
      {/* Header */}
      <header className="medical-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Volver
        </button>
        <div className="header-content">
          <h1>🩺 Ficha Médica de {profileName}</h1>
          <p>Registro completo de salud y desarrollo</p>
        </div>
        <button 
          className="edit-profile-btn"
          onClick={() => setShowEditProfile(true)}
        >
          ✏️ Editar
        </button>
      </header>

      {/* Tabs */}
      <nav className="medical-tabs">
        <button 
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👶 Perfil
        </button>
        <button 
          className={`tab ${activeTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          📈 Historial ({milestones.length})
        </button>
        <button 
          className={`tab ${activeTab === 'future' ? 'active' : ''}`}
          onClick={() => setActiveTab('future')}
        >
          🔮 Próximos Hitos ({futureMilestones.filter(m => !m.dismissed).length})
        </button>
      </nav>

      {/* Content */}
      <main className="medical-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            {babyProfile && (
              <>
                {/* Summary Cards */}
                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="card-icon">👶</div>
                    <div className="card-content">
                      <h3>Edad Actual</h3>
                      <p className="card-value">
                        {formatAge(calculateAge(babyProfile.dateOfBirth, new Date()))}
                      </p>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="card-icon">⚖️</div>
                    <div className="card-content">
                      <h3>Peso Actual</h3>
                      <p className="card-value">
                        {babyProfile.currentWeight ? `${babyProfile.currentWeight} kg` : 'No registrado'}
                      </p>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="card-icon">📏</div>
                    <div className="card-content">
                      <h3>Altura Actual</h3>
                      <p className="card-value">
                        {babyProfile.currentHeight ? `${babyProfile.currentHeight} cm` : 'No registrado'}
                      </p>
                    </div>
                  </div>

                  <div className="summary-card">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                      <h3>Registros Totales</h3>
                      <p className="card-value">{milestones.length}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="profile-details">
                  <h3>📋 Información Personal</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="label">Nombre:</span>
                      <span className="value">{babyProfile.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Fecha de Nacimiento:</span>
                      <span className="value">{babyProfile.dateOfBirth.toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Género:</span>
                      <span className="value">{babyProfile.gender || 'No especificado'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Tipo de Sangre:</span>
                      <span className="value">{babyProfile.bloodType || 'No registrado'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Alergias:</span>
                      <span className="value">
                        {babyProfile.allergies.length > 0 ? babyProfile.allergies.join(', ') : 'Ninguna conocida'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="milestones-section">
            <div className="section-header">
              <h3>📈 Historial de Hitos Médicos</h3>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/capture')}
              >
                ➕ Agregar Registro
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h4>No hay hitos registrados aún</h4>
                <p>Comienza agregando datos de salud de {babyProfile?.name || 'Maxi'}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/capture')}
                >
                  Agregar primer registro
                </button>
              </div>
            ) : (
              <div className="milestones-timeline">
                {milestones.map((milestone) => (
                  <div 
                    key={milestone.id} 
                    className={`milestone-item ${milestone.requiresAttention ? 'attention' : ''}`}
                    onClick={() => setSelectedMilestone(milestone)}
                  >
                    <div className="milestone-date">
                      <span className="date">{milestone.date.toLocaleDateString()}</span>
                      <span className="age">{milestone.ageAtMilestone}</span>
                    </div>
                    <div className="milestone-content">
                      <h4 className="milestone-title">{milestone.title}</h4>
                      <p className="milestone-description">{milestone.description}</p>
                      <div className="milestone-tags">
                        <span className={`category-tag ${milestone.category}`}>
                          {milestone.category}
                        </span>
                        {milestone.requiresAttention && (
                          <span className="attention-tag">⚠️ Requiere atención</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'future' && (
          <div className="future-milestones-section">
            <div className="section-header">
              <h3>🔮 Próximos Hitos y Cuidados</h3>
              <div className="header-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={generateAIMilestones}
                  disabled={isGeneratingMilestones}
                  title="Genera hitos personalizados con información médica actualizada"
                >
                  {isGeneratingMilestones ? '⏳ Generando...' : '🤖 Generar con IA'}
                </button>
                {futureMilestones.length > 0 && (
                  <button 
                    className="btn btn-outline"
                    onClick={() => {
                      setFutureMilestones(prev => prev.filter(m => !m.dynamicallyGenerated));
                      generateAIMilestones();
                    }}
                    disabled={isGeneratingMilestones}
                    title="Actualizar hitos con información más reciente"
                  >
                    {isGeneratingMilestones ? '🔄 Actualizando...' : '🔄 Actualizar'}
                  </button>
                )}
              </div>
            </div>

            <div className="future-milestones-grid">
              {futureMilestones.filter(m => !m.dismissed).map((milestone) => (
                <div 
                  key={milestone.id} 
                  className={`future-milestone-card ${milestone.status} priority-${milestone.priority}`}
                >
                  <div className="milestone-header">
                    <h4>{milestone.title}</h4>
                    <div className="milestone-actions">
                      <button 
                        className={`status-btn ${milestone.status}`}
                        onClick={() => toggleMilestoneStatus(milestone.id)}
                        title={milestone.status === 'pending' ? 'Marcar como completado' : 'Marcar como pendiente'}
                      >
                        {milestone.status === 'completed' ? '✅' : '⭕'}
                      </button>
                      <button 
                        className="dismiss-btn"
                        onClick={() => dismissMilestone(milestone.id)}
                        title="Descartar"
                      >
                        ❌
                      </button>
                    </div>
                  </div>

                  <p className="milestone-description">{milestone.description}</p>

                  <div className="milestone-meta">
                    <span className="expected-age">📅 {milestone.expectedAge}</span>
                    <span className={`priority-badge ${milestone.priority}`}>
                      {milestone.priority}
                    </span>
                    {milestone.dynamicallyGenerated && (
                      <span className="ai-generated">🤖 IA</span>
                    )}
                  </div>

                  {milestone.status === 'completed' && milestone.completedDate && (
                    <div className="completion-info">
                      ✅ Completado el {milestone.completedDate.toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {futureMilestones.filter(m => !m.dismissed).length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔮</div>
                <h4>No hay hitos futuros programados</h4>
                <p>Usa la IA para generar recomendaciones personalizadas</p>
                <button 
                  className="btn btn-primary"
                  onClick={generateAIMilestones}
                  disabled={isGeneratingMilestones}
                >
                  {isGeneratingMilestones ? 'Generando...' : '🤖 Generar Hitos con IA'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        profile={babyProfile}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={updateProfile}
      />

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <div className="modal-overlay" onClick={() => setSelectedMilestone(null)}>
          <div className="modal-content milestone-detail-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>📋 Detalle del Hito</h2>
              <button className="close-btn" onClick={() => setSelectedMilestone(null)}>×</button>
            </header>

            <div className="milestone-detail-content">
              <h3>{selectedMilestone.title}</h3>
              <p className="milestone-date">
                📅 {selectedMilestone.date.toLocaleDateString()} • {selectedMilestone.ageAtMilestone}
              </p>
              <p className="milestone-description">{selectedMilestone.description}</p>

              {selectedMilestone.details.notes && (
                <div className="detail-section">
                  <h4>📝 Notas</h4>
                  <p>{selectedMilestone.details.notes}</p>
                </div>
              )}

              {selectedMilestone.details.measurements && (
                <div className="detail-section">
                  <h4>📊 Mediciones</h4>
                  <div className="measurements-grid">
                    {Object.entries(selectedMilestone.details.measurements).map(([key, value]) => (
                      <div key={key} className="measurement-item">
                        <span className="measurement-label">{key}:</span>
                        <span className="measurement-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="milestone-meta-info">
                <span className={`category-tag ${selectedMilestone.category}`}>
                  {selectedMilestone.category}
                </span>
                <span className="confidence-badge">
                  Confianza: {Math.round(selectedMilestone.confidence * 100)}%
                </span>
                <span className={`source-badge ${selectedMilestone.source}`}>
                  {selectedMilestone.source}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <AppFooter />
    </div>
  );
};

export default MedicalFile;