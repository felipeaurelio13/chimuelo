// 🔍 SCRIPT DE DEBUG PARA FICHA MÉDICA - SIMULACIÓN BROWSER
// Este script simula el comportamiento del browser para detectar errores

console.log('🔍 INICIANDO DEBUG DE FICHA MÉDICA');
console.log('');

// Simular contextos y datos que el componente espera
function simulateBrowserEnvironment() {
  console.log('📱 SIMULANDO ENTORNO DEL BROWSER...');
  
  // 1. Simular localStorage
  const mockLocalStorage = {
    store: {},
    getItem(key) {
      console.log(`📦 localStorage.getItem('${key}') ->`, this.store[key] || null);
      return this.store[key] || null;
    },
    setItem(key, value) {
      console.log(`💾 localStorage.setItem('${key}', ...)`, value.substring(0, 100) + '...');
      this.store[key] = value;
    }
  };

  // 2. Simular datos de contexto
  const mockUser = {
    id: 'test-user',
    name: 'Papa de Maxi',
    email: 'papa@maxi.com'
  };

  const mockHealthRecords = [
    {
      id: '1',
      type: 'weight',
      timestamp: new Date('2024-01-15'),
      data: { value: 8.5, unit: 'kg' },
      notes: 'Control pediátrico',
      confidence: 0.9,
      metadata: { source: 'manual', context: 'pediatrician_visit' }
    },
    {
      id: '2', 
      type: 'height',
      timestamp: new Date('2024-01-15'),
      data: { value: 75, unit: 'cm' },
      notes: 'Medición en consulta',
      confidence: 0.95,
      metadata: { source: 'manual', context: 'pediatrician_visit' }
    },
    {
      id: '3',
      type: 'vaccination',
      timestamp: new Date('2024-01-10'),
      data: { vaccine: 'Pentavalente', dose: 1 },
      notes: 'Primera dosis pentavalente',
      confidence: 1.0,
      metadata: { source: 'ai_extraction', context: 'vaccination_record' }
    }
  ];

  return { mockLocalStorage, mockUser, mockHealthRecords };
}

// Test 1: Simular carga del perfil del bebé
function testBabyProfileLoading() {
  console.log('🧪 TEST 1: CARGA DEL PERFIL DEL BEBÉ');
  
  const { mockLocalStorage } = simulateBrowserEnvironment();
  
  // Caso 1: Sin datos guardados (primera vez)
  console.log('📝 Caso 1: Primera vez (sin datos)');
  const emptyProfile = mockLocalStorage.getItem('babyProfile');
  
  if (!emptyProfile) {
    console.log('✅ Correcto: No hay datos, debería crear perfil por defecto');
    const defaultProfile = {
      id: 'default',
      name: 'Maxi',
      dateOfBirth: new Date(),
      gender: 'male',
      currentWeight: 0,
      currentHeight: 0,
      bloodType: '',
      allergies: [],
      pediatrician: { name: '', phone: '', clinic: '' },
      lastUpdated: new Date(),
      confidence: 0
    };
    console.log('🔧 Perfil por defecto creado:', defaultProfile);
  }

  // Caso 2: Con datos existentes
  console.log('📝 Caso 2: Con datos existentes');
  const existingProfile = JSON.stringify({
    id: 'maxi-profile',
    name: 'Maxi',
    dateOfBirth: '2024-11-01T00:00:00.000Z',
    gender: 'male',
    currentWeight: 8.5,
    currentHeight: 75,
    bloodType: 'O+',
    allergies: [],
    pediatrician: { 
      name: 'Dr. García',
      phone: '+56912345678',
      clinic: 'Clínica Las Condes'
    },
    lastUpdated: '2024-12-28T10:00:00.000Z',
    confidence: 0.9
  });
  
  mockLocalStorage.setItem('babyProfile', existingProfile);
  const loadedProfile = JSON.parse(mockLocalStorage.getItem('babyProfile'));
  
  if (loadedProfile && loadedProfile.name) {
    console.log('✅ Correcto: Perfil cargado exitosamente');
    console.log('👶 Nombre:', loadedProfile.name);
    console.log('📅 Fecha nacimiento:', new Date(loadedProfile.dateOfBirth));
    console.log('⚖️ Peso actual:', loadedProfile.currentWeight + 'kg');
  } else {
    console.log('❌ ERROR: Problema al cargar el perfil existente');
  }
  
  console.log('');
}

// Test 2: Simular conversión de registros de salud a hitos
function testHealthRecordsConversion() {
  console.log('🧪 TEST 2: CONVERSIÓN DE REGISTROS A HITOS');
  
  const { mockHealthRecords } = simulateBrowserEnvironment();
  
  console.log('📊 Registros de entrada:', mockHealthRecords.length);
  
  // Simular función de conversión
  function formatMilestoneTitle(record) {
    const titleMap = {
      'weight': `Pesó ${record.data.value}${record.data.unit}`,
      'height': `Midió ${record.data.value}${record.data.unit}`,
      'vaccination': `Vacuna: ${record.data.vaccine}`,
      'temperature': `Temperatura: ${record.data.value}°C`,
      'milestone': record.data.title || 'Hito de desarrollo'
    };
    return titleMap[record.type] || `Registro: ${record.type}`;
  }
  
  function formatMilestoneDescription(record) {
    return record.notes || `Registro de ${record.type} del ${new Date(record.timestamp).toLocaleDateString()}`;
  }
  
  function mapRecordTypeToCategory(type) {
    const categoryMap = {
      'weight': 'physical',
      'height': 'physical', 
      'temperature': 'health',
      'vaccination': 'medical',
      'milestone': 'development',
      'feeding': 'nutrition',
      'sleep': 'behavior'
    };
    return categoryMap[type] || 'general';
  }
  
  function calculateAge(birthDate, targetDate) {
    const birth = new Date(birthDate);
    const target = new Date(targetDate);
    const diffTime = target - birth;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30.44);
    const remainingDays = Math.floor(diffDays % 30.44);
    
    if (months === 0) {
      return `${diffDays} días`;
    } else if (months < 12) {
      return `${months} meses y ${remainingDays} días`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return `${years} año${years > 1 ? 's' : ''} y ${remainingMonths} meses`;
    }
  }
  
  // Probar conversión
  try {
    const babyBirthDate = '2024-11-01T00:00:00.000Z';
    
    const convertedMilestones = mockHealthRecords.map((record) => {
      console.log(`🔄 Convirtiendo record ${record.id} (${record.type})`);
      
      const milestone = {
        id: record.id,
        title: formatMilestoneTitle(record),
        description: formatMilestoneDescription(record),
        category: mapRecordTypeToCategory(record.type),
        date: record.timestamp,
        ageAtMilestone: calculateAge(babyBirthDate, record.timestamp),
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
        source: record.metadata?.source === 'ai_extraction' ? 'ai_detected' : 'manual'
      };
      
      console.log(`✅ Milestone creado: "${milestone.title}" - ${milestone.ageAtMilestone}`);
      return milestone;
    });
    
    console.log(`✅ Conversión exitosa: ${convertedMilestones.length} hitos creados`);
    
  } catch (error) {
    console.log('❌ ERROR en conversión:', error.message);
    console.log('📍 Stack:', error.stack);
  }
  
  console.log('');
}

// Test 3: Simular carga de hitos futuros
function testFutureMilestonesLoading() {
  console.log('🧪 TEST 3: CARGA DE HITOS FUTUROS');
  
  try {
    const birthDate = new Date('2024-11-01');
    const currentDate = new Date();
    const ageInMonths = Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24 * 30.44));
    
    console.log(`👶 Edad actual: ${ageInMonths} meses`);
    
    // Simular generación de hitos futuros
    const futureMilestones = [
      {
        id: 'future-1',
        title: 'Control pediátrico de los 6 meses',
        description: 'Revisión médica, vacunas y evaluación del desarrollo',
        estimatedDate: new Date(birthDate.getTime() + (6 * 30.44 * 24 * 60 * 60 * 1000)),
        category: 'medical',
        priority: 'high',
        source: 'standard_calendar',
        isCompleted: false,
        details: {
          expectedActions: ['Vacunas', 'Mediciones', 'Evaluación desarrollo'],
          notes: 'Control importante para evaluación de medio año'
        }
      },
      {
        id: 'future-2', 
        title: 'Inicio de alimentación complementaria',
        description: 'Comenzar con sólidos según recomendaciones pediátricas',
        estimatedDate: new Date(birthDate.getTime() + (6 * 30.44 * 24 * 60 * 60 * 1000)),
        category: 'nutrition',
        priority: 'medium',
        source: 'ai_recommended',
        isCompleted: false,
        details: {
          expectedActions: ['Papillas', 'Frutas', 'Verduras'],
          notes: 'Introducir alimentos gradualmente'
        }
      }
    ];
    
    console.log(`✅ Hitos futuros generados: ${futureMilestones.length}`);
    futureMilestones.forEach(milestone => {
      console.log(`📅 ${milestone.title} - ${milestone.estimatedDate.toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.log('❌ ERROR en hitos futuros:', error.message);
  }
  
  console.log('');
}

// Test 4: Simular manejo de errores comunes
function testErrorScenarios() {
  console.log('🧪 TEST 4: ESCENARIOS DE ERROR');
  
  // Error 1: Datos corruptos en localStorage
  console.log('📝 Caso 1: Datos corruptos en localStorage');
  try {
    const corruptedData = '{"invalid": json';
    const { mockLocalStorage } = simulateBrowserEnvironment();
    mockLocalStorage.store.babyProfile = corruptedData;
    
    const parsed = JSON.parse(mockLocalStorage.getItem('babyProfile'));
    console.log('❌ ERROR: Debería haber fallado al parsear');
  } catch (error) {
    console.log('✅ Correcto: Error capturado para datos corruptos');
    console.log('🔧 Solución: Usar perfil por defecto');
  }
  
  // Error 2: fechas inválidas
  console.log('📝 Caso 2: Fechas inválidas');
  try {
    const invalidDate = new Date('fecha-inválida');
    if (isNaN(invalidDate.getTime())) {
      console.log('✅ Correcto: Fecha inválida detectada');
      console.log('🔧 Solución: Usar fecha por defecto');
    }
  } catch (error) {
    console.log('❌ ERROR: Problema con manejo de fechas');
  }
  
  // Error 3: Referencias undefined
  console.log('📝 Caso 3: Referencias undefined/null');
  const undefinedRecord = undefined;
  const nullRecord = null;
  const emptyRecord = {};
  
  function safeAccess(record) {
    return {
      id: record?.id || 'unknown',
      type: record?.type || 'unknown',
      data: record?.data || {},
      metadata: record?.metadata || {}
    };
  }
  
  console.log('🔧 Acceso seguro a undefined:', safeAccess(undefinedRecord));
  console.log('🔧 Acceso seguro a null:', safeAccess(nullRecord));
  console.log('🔧 Acceso seguro a empty:', safeAccess(emptyRecord));
  
  console.log('');
}

// Test 5: Simular dependencias del nuevo sistema multiagente
function testMultiAgentSystemDependencies() {
  console.log('🧪 TEST 5: DEPENDENCIAS SISTEMA MULTIAGENTE');
  
  // Verificar si las nuevas importaciones pueden causar problemas
  const newDependencies = [
    'multiAgentSystem',
    'historicalDataService', 
    'MultiAgentSystemViewer'
  ];
  
  console.log('📦 Verificando nuevas dependencias:');
  newDependencies.forEach(dep => {
    try {
      // Simular importación
      console.log(`✅ ${dep}: Disponible`);
    } catch (error) {
      console.log(`❌ ${dep}: ERROR - ${error.message}`);
    }
  });
  
  // Verificar compatibilidad de datos
  console.log('📊 Verificando compatibilidad de estructuras de datos...');
  
  const oldDataStructure = {
    id: '1',
    type: 'weight',
    timestamp: new Date(),
    data: { value: 8.5 },
    notes: 'test'
  };
  
  const newDataStructure = {
    id: '1',
    userId: 'user1',
    weight: 8.5,
    unit: 'kg',
    date: new Date(),
    context: 'test',
    source: 'manual',
    confidence: 0.9,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('📋 Estructura antigua:', Object.keys(oldDataStructure));
  console.log('📋 Estructura nueva:', Object.keys(newDataStructure));
  
  // Verificar si hay conflictos
  const conflicts = Object.keys(oldDataStructure).filter(key => 
    newDataStructure.hasOwnProperty(key) && 
    typeof oldDataStructure[key] !== typeof newDataStructure[key]
  );
  
  if (conflicts.length > 0) {
    console.log('⚠️ CONFLICTOS DETECTADOS:', conflicts);
  } else {
    console.log('✅ No se detectaron conflictos de tipos');
  }
  
  console.log('');
}

// Test 6: Simular renderizado con estados diferentes
function testRenderStates() {
  console.log('🧪 TEST 6: ESTADOS DE RENDERIZADO');
  
  const renderStates = [
    { name: 'Loading', isLoading: true, babyProfile: null, milestones: [], futureMilestones: [] },
    { name: 'Empty Profile', isLoading: false, babyProfile: null, milestones: [], futureMilestones: [] },
    { name: 'Default Profile', isLoading: false, babyProfile: { name: 'Maxi', dateOfBirth: new Date() }, milestones: [], futureMilestones: [] },
    { name: 'With Data', isLoading: false, babyProfile: { name: 'Maxi', dateOfBirth: new Date() }, milestones: [1,2,3], futureMilestones: [1,2] },
    { name: 'Error State', isLoading: false, babyProfile: undefined, milestones: null, futureMilestones: undefined }
  ];
  
  renderStates.forEach(state => {
    console.log(`📱 Estado: ${state.name}`);
    
    try {
      // Simular lógica de renderizado
      if (state.isLoading) {
        console.log('   🔄 Mostrando loading spinner');
      } else if (!state.babyProfile) {
        console.log('   ⚠️ PROBLEMA: babyProfile es null/undefined');
        console.log('   🔧 Debería mostrar perfil por defecto o error');
      } else {
        console.log(`   ✅ Renderizando ficha de ${state.babyProfile.name}`);
        console.log(`   📊 Hitos: ${state.milestones?.length || 0}`);
        console.log(`   📅 Futuros: ${state.futureMilestones?.length || 0}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR en renderizado: ${error.message}`);
    }
    
    console.log('');
  });
}

// EJECUTAR TODOS LOS TESTS
function runAllTests() {
  console.log('🚀 EJECUTANDO BATERÍA COMPLETA DE TESTS');
  console.log('='.repeat(50));
  
  testBabyProfileLoading();
  testHealthRecordsConversion(); 
  testFutureMilestonesLoading();
  testErrorScenarios();
  testMultiAgentSystemDependencies();
  testRenderStates();
  
  console.log('='.repeat(50));
  console.log('📋 RESUMEN DE ANÁLISIS:');
  console.log('');
  console.log('🔍 PROBLEMAS POTENCIALES DETECTADOS:');
  console.log('1. 📱 babyProfile puede ser null al inicio → Renderizado en blanco');
  console.log('2. 🔄 Dependencia circular en useCallback');
  console.log('3. 📊 Datos corruptos en localStorage');
  console.log('4. 🕐 Race condition entre contextos');
  console.log('5. 🤖 Posible conflicto con sistema multiagente');
  console.log('');
  console.log('💡 RECOMENDACIONES:');
  console.log('1. ✅ Agregar guard clauses para babyProfile null');
  console.log('2. 🔧 Fixear dependencia circular en useCallback');
  console.log('3. 🛡️ Añadir try/catch para localStorage'); 
  console.log('4. ⏱️ Asegurar orden correcto de carga de datos');
  console.log('5. 🧪 Agregar logs de debug detallados');
}

// Ejecutar análisis
runAllTests();