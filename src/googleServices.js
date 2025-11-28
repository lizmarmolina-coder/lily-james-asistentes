// googleServices.js
// Funciones para interactuar con Google Drive y Calendar

// ==================== GOOGLE DRIVE ====================

/**
 * Buscar archivos en Google Drive
 * @param {string} accessToken - Token de acceso de Google
 * @param {string} query - Término de búsqueda
 * @param {number} maxResults - Número máximo de resultados (default: 10)
 */
export const searchDriveFiles = async (accessToken, query, maxResults = 10) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains '${query}'&pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al buscar archivos');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error en searchDriveFiles:', error);
    return [];
  }
};

/**
 * Listar archivos recientes de Google Drive
 * @param {string} accessToken - Token de acceso de Google
 * @param {number} maxResults - Número máximo de resultados (default: 10)
 */
export const listRecentFiles = async (accessToken, maxResults = 10) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al listar archivos');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error en listRecentFiles:', error);
    return [];
  }
};

/**
 * Leer contenido de un documento de Google Docs
 * @param {string} accessToken - Token de acceso de Google
 * @param {string} fileId - ID del documento
 */
export const readDocument = async (accessToken, fileId) => {
  try {
    // Exportar como texto plano
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al leer documento');
    }

    const text = await response.text();
    return text;
  } catch (error) {
    console.error('Error en readDocument:', error);
    return null;
  }
};

/**
 * Buscar archivos en una carpeta específica
 * @param {string} accessToken - Token de acceso de Google
 * @param {string} folderId - ID de la carpeta
 * @param {number} maxResults - Número máximo de resultados
 */
export const listFilesInFolder = async (accessToken, folderId, maxResults = 20) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents&pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al listar archivos de la carpeta');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error en listFilesInFolder:', error);
    return [];
  }
};

// ==================== GOOGLE CALENDAR ====================

/**
 * Listar eventos del calendario
 * @param {string} accessToken - Token de acceso de Google
 * @param {number} maxResults - Número máximo de eventos (default: 10)
 * @param {string} timeMin - Fecha mínima en formato ISO (default: ahora)
 */
export const listCalendarEvents = async (accessToken, maxResults = 10, timeMin = null) => {
  try {
    const now = timeMin || new Date().toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${now}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al listar eventos');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error en listCalendarEvents:', error);
    return [];
  }
};

/**
 * Obtener eventos de hoy
 * @param {string} accessToken - Token de acceso de Google
 */
export const getTodayEvents = async (accessToken) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMin = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeMax = tomorrow.toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener eventos de hoy');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error en getTodayEvents:', error);
    return [];
  }
};

/**
 * Crear un nuevo evento en el calendario
 * @param {string} accessToken - Token de acceso de Google
 * @param {Object} eventData - Datos del evento
 */
export const createCalendarEvent = async (accessToken, eventData) => {
  try {
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startTime,
        timeZone: 'America/Hermosillo'
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: 'America/Hermosillo'
      },
      reminders: {
        useDefault: true
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      throw new Error('Error al crear evento');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en createCalendarEvent:', error);
    return null;
  }
};

/**
 * Buscar eventos por texto
 * @param {string} accessToken - Token de acceso de Google
 * @param {string} searchText - Texto a buscar
 */
export const searchCalendarEvents = async (accessToken, searchText) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(searchText)}&orderBy=startTime&singleEvents=true`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al buscar eventos');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error en searchCalendarEvents:', error);
    return [];
  }
};

/**
 * Obtener eventos de la próxima semana
 * @param {string} accessToken - Token de acceso de Google
 */
export const getWeekEvents = async (accessToken) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMin = today.toISOString();
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const timeMax = nextWeek.toISOString();
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener eventos de la semana');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error en getWeekEvents:', error);
    return [];
  }
};

// ==================== UTILIDADES ====================

/**
 * Formatear archivo de Drive para mostrar
 * @param {Object} file - Archivo de Drive
 */
export const formatDriveFile = (file) => {
  const date = new Date(file.modifiedTime);
  const formattedDate = date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return {
    nombre: file.name,
    tipo: file.mimeType.split('.').pop(),
    modificado: formattedDate,
    link: file.webViewLink
  };
};

/**
 * Formatear evento de Calendar para mostrar
 * @param {Object} event - Evento de Calendar
 */
export const formatCalendarEvent = (event) => {
  const startDate = new Date(event.start.dateTime || event.start.date);
  const endDate = new Date(event.end.dateTime || event.end.date);

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return {
    titulo: event.summary || 'Sin título',
    descripcion: event.description || '',
    inicio: formatTime(startDate),
    fin: formatTime(endDate),
    fecha: formatDate(startDate),
    link: event.htmlLink
  };
};