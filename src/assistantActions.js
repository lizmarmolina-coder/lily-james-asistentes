// assistantActions.js
// Detecta intenciones del usuario y ejecuta acciones de Google

import {
  searchDriveFiles,
  listRecentFiles,
  getTodayEvents,
  getWeekEvents,
  createCalendarEvent,
  searchCalendarEvents,
  formatDriveFile,
  formatCalendarEvent
} from './googleServices';

/**
 * Detectar si el usuario quiere buscar archivos en Drive
 */
const detectDriveSearch = (message) => {
  const driveKeywords = [
    'buscar archivo',
    'buscar documento',
    'encuentra el archivo',
    'encuentra el documento',
    'busca en drive',
    'busca en mi drive',
    'archivos recientes',
    'documentos recientes',
    'mis archivos',
    'mis documentos'
  ];

  return driveKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

/**
 * Detectar si el usuario quiere ver eventos del calendario
 */
const detectCalendarView = (message) => {
  const calendarKeywords = [
    'eventos de hoy',
    'agenda de hoy',
    'qué tengo hoy',
    'calendario hoy',
    'eventos de la semana',
    'agenda de la semana',
    'próximos eventos',
    'mi agenda',
    'mi calendario',
    'reuniones de hoy',
    'reuniones de la semana'
  ];

  return calendarKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

/**
 * Detectar si el usuario quiere crear un evento
 */
const detectCalendarCreate = (message) => {
  const createKeywords = [
    'crear evento',
    'crear reunión',
    'agendar',
    'programar reunión',
    'programar evento',
    'añadir evento',
    'agregar evento',
    'nueva reunión',
    'nuevo evento'
  ];

  return createKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
};

/**
 * Extraer término de búsqueda del mensaje
 */
const extractSearchTerm = (message) => {
  // Patrones para extraer el término de búsqueda
  const patterns = [
    /buscar (?:archivo|documento) (?:llamado|de|sobre|con nombre)?\s*["']?([^"']+)["']?/i,
    /encuentra (?:el )?(?:archivo|documento) (?:llamado|de|sobre)?\s*["']?([^"']+)["']?/i,
    /busca (?:el )?(?:archivo|documento)?\s*["']?([^"']+)["']?/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Procesar solicitud de búsqueda en Drive
 */
export const processDriveSearch = async (message, accessToken) => {
  const searchTerm = extractSearchTerm(message);
  
  if (!searchTerm) {
    // Si no hay término específico, mostrar archivos recientes
    const files = await listRecentFiles(accessToken, 10);
    
    if (files.length === 0) {
      return {
        success: false,
        message: 'No pude acceder a tus archivos de Drive. Verifica que tengas permisos.'
      };
    }

    const formattedFiles = files.map(formatDriveFile);
    return {
      success: true,
      action: 'list_recent',
      files: formattedFiles,
      message: `📁 Aquí están tus archivos más recientes:\n\n${formatFilesList(formattedFiles)}`
    };
  }

  // Buscar archivos con el término
  const files = await searchDriveFiles(accessToken, searchTerm, 10);
  
  if (files.length === 0) {
    return {
      success: true,
      files: [],
      message: `No encontré archivos con el término "${searchTerm}". ¿Quieres que busque algo más?`
    };
  }

  const formattedFiles = files.map(formatDriveFile);
  return {
    success: true,
    action: 'search',
    searchTerm,
    files: formattedFiles,
    message: `📁 Encontré ${files.length} archivo(s) con "${searchTerm}":\n\n${formatFilesList(formattedFiles)}`
  };
};

/**
 * Procesar solicitud de calendario
 */
export const processCalendarView = async (message, accessToken) => {
  const isToday = message.toLowerCase().includes('hoy');
  const isWeek = message.toLowerCase().includes('semana');

  let events;
  let timeframe;

  if (isToday) {
    events = await getTodayEvents(accessToken);
    timeframe = 'hoy';
  } else if (isWeek) {
    events = await getWeekEvents(accessToken);
    timeframe = 'esta semana';
  } else {
    // Por defecto, mostrar eventos de hoy
    events = await getTodayEvents(accessToken);
    timeframe = 'hoy';
  }

  if (events.length === 0) {
    return {
      success: true,
      events: [],
      message: `📅 No tienes eventos programados para ${timeframe}. ¡Tienes el día libre!`
    };
  }

  const formattedEvents = events.map(formatCalendarEvent);
  return {
    success: true,
    action: 'view_events',
    timeframe,
    events: formattedEvents,
    message: `📅 Tus eventos para ${timeframe}:\n\n${formatEventsList(formattedEvents)}`
  };
};

/**
 * Procesar solicitud de crear evento
 */
export const processCalendarCreate = async (message, accessToken) => {
  // Esta función requiere más procesamiento para extraer detalles del evento
  // Por ahora, devolvemos un mensaje pidiendo más información
  
  return {
    success: true,
    action: 'create_event_prompt',
    message: `📅 Para crear un evento, necesito algunos detalles:\n\n` +
             `• Título del evento\n` +
             `• Fecha y hora de inicio\n` +
             `• Duración o hora de fin\n` +
             `• (Opcional) Descripción\n\n` +
             `Por ejemplo: "Crear reunión el lunes a las 10am por 1 hora llamada Revisión de proyecto"`
  };
};

/**
 * Detectar y procesar intenciones del usuario
 */
export const detectAndProcessIntent = async (message, accessToken) => {
  // Verificar intenciones en orden de prioridad
  
  if (detectDriveSearch(message)) {
    return await processDriveSearch(message, accessToken);
  }
  
  if (detectCalendarCreate(message)) {
    return await processCalendarCreate(message, accessToken);
  }
  
  if (detectCalendarView(message)) {
    return await processCalendarView(message, accessToken);
  }

  // No se detectó ninguna intención especial
  return null;
};

/**
 * Formatear lista de archivos para mostrar
 */
const formatFilesList = (files) => {
  return files.map((file, index) => 
    `${index + 1}. **${file.nombre}**\n   📄 Tipo: ${file.tipo}\n   🕐 Modificado: ${file.modificado}\n   🔗 [Abrir archivo](${file.link})`
  ).join('\n\n');
};

/**
 * Formatear lista de eventos para mostrar
 */
const formatEventsList = (events) => {
  return events.map((event, index) => 
    `${index + 1}. **${event.titulo}**\n   🕐 ${event.inicio} - ${event.fin}\n   📅 ${event.fecha}${event.descripcion ? `\n   📝 ${event.descripcion}` : ''}\n   🔗 [Ver en Calendar](${event.link})`
  ).join('\n\n');
};

/**
 * Obtener comandos disponibles según el asistente
 */
export const getAvailableCommands = (assistantName) => {
  const driveCommands = [
    '📁 "Buscar archivo sobre marketing"',
    '📁 "Muestra mis archivos recientes"',
    '📁 "Busca el documento de Q4"'
  ];

  const calendarCommands = [
    '📅 "Qué eventos tengo hoy"',
    '📅 "Muestra mi agenda de la semana"',
    '📅 "Crear reunión mañana a las 2pm"'
  ];

  if (assistantName === 'lily') {
    return {
      drive: driveCommands,
      calendar: calendarCommands.slice(0, 2), // Lily se enfoca más en Drive
      message: 'Puedo ayudarte a buscar documentos empresariales y revisar tu agenda:'
    };
  } else if (assistantName === 'james') {
    return {
      drive: driveCommands.slice(0, 2),
      calendar: calendarCommands, // James se enfoca más en Calendar
      message: 'Puedo ayudarte a gestionar tu agenda y encontrar archivos:'
    };
  }

  return { drive: [], calendar: [], message: '' };
};