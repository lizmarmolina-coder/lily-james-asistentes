import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Calendar, FileText, Loader2, Users } from 'lucide-react';

function ChatWindow({ assistant, onBack, user, onLogout, accessToken, gapiReady }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: assistant.greeting
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (accessToken && gapiReady) {
      console.log('✅ Access token y GAPI disponibles');
    }
  }, [accessToken, gapiReady]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============================================
  // HERRAMIENTAS DE GOOGLE DRIVE
  // ============================================

  const searchDriveFiles = async (query, maxResults = 10) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('🔍 Buscando en Drive:', query);
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains '${query}' and trashed=false&pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size,owners)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Drive API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Archivos encontrados:', data.files?.length || 0);
      
      return {
        success: true,
        files: data.files || [],
        count: data.files?.length || 0
      };
    } catch (error) {
      console.error('❌ Error searching Drive:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  };

  const listRecentFiles = async (maxResults = 20) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('📁 Listando archivos recientes...');
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Drive API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Archivos recientes:', data.files?.length || 0);
      
      return {
        success: true,
        files: data.files || [],
        count: data.files?.length || 0
      };
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  };

  const getFileById = async (fileId) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('📄 Obteniendo archivo:', fileId);
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink,size,owners,description`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Drive API error: ${response.status}`);
      }

      const file = await response.json();
      console.log('✅ Archivo obtenido:', file.name);
      
      return {
        success: true,
        file: file
      };
    } catch (error) {
      console.error('❌ Error getting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ============================================
  // HERRAMIENTAS DE GOOGLE CONTACTS
  // ============================================

  const searchContacts = async (query, maxResults = 10) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('👤 Buscando contactos:', query);
      
      const response = await fetch(
        `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations&pageSize=${maxResults}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Contacts API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Contactos encontrados:', data.results?.length || 0);
      
      // Formatear los contactos para respuesta más limpia
      const contacts = (data.results || []).map(result => {
        const person = result.person;
        return {
          resourceName: person.resourceName,
          name: person.names?.[0]?.displayName || 'Sin nombre',
          email: person.emailAddresses?.[0]?.value || null,
          phone: person.phoneNumbers?.[0]?.value || null,
          organization: person.organizations?.[0]?.name || null
        };
      });
      
      return {
        success: true,
        contacts: contacts,
        count: contacts.length
      };
    } catch (error) {
      console.error('❌ Error searching contacts:', error);
      return {
        success: false,
        error: error.message,
        contacts: []
      };
    }
  };

  const listContacts = async (maxResults = 20) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('📇 Listando contactos...');
      
      const response = await fetch(
        `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=${maxResults}&sortOrder=LAST_MODIFIED_DESCENDING`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Contacts API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Contactos listados:', data.connections?.length || 0);
      
      // Formatear los contactos
      const contacts = (data.connections || []).map(person => ({
        resourceName: person.resourceName,
        name: person.names?.[0]?.displayName || 'Sin nombre',
        email: person.emailAddresses?.[0]?.value || null,
        phone: person.phoneNumbers?.[0]?.value || null,
        organization: person.organizations?.[0]?.name || null
      }));
      
      return {
        success: true,
        contacts: contacts,
        count: contacts.length
      };
    } catch (error) {
      console.error('❌ Error listing contacts:', error);
      return {
        success: false,
        error: error.message,
        contacts: []
      };
    }
  };

  // ============================================
  // HERRAMIENTAS DE GOOGLE CALENDAR
  // ============================================

  const listCalendarEvents = async (timeMin, timeMax, maxResults = 10) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('📅 Listando eventos del calendario...');
      
      const startTime = timeMin || new Date().toISOString();
      const endTime = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startTime)}&timeMax=${encodeURIComponent(endTime)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Eventos encontrados:', data.items?.length || 0);
      
      return {
        success: true,
        events: data.items || [],
        count: data.items?.length || 0
      };
    } catch (error) {
      console.error('❌ Error listing events:', error);
      return {
        success: false,
        error: error.message,
        events: []
      };
    }
  };

  const searchCalendarEvents = async (query, timeMin, timeMax) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('🔍 Buscando eventos:', query);
      
      const startTime = timeMin || new Date().toISOString();
      const endTime = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(query)}&timeMin=${encodeURIComponent(startTime)}&timeMax=${encodeURIComponent(endTime)}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Eventos encontrados:', data.items?.length || 0);
      
      return {
        success: true,
        events: data.items || [],
        count: data.items?.length || 0
      };
    } catch (error) {
      console.error('❌ Error searching events:', error);
      return {
        success: false,
        error: error.message,
        events: []
      };
    }
  };

  const createCalendarEvent = async (eventData) => {
    if (!accessToken) {
      throw new Error('No hay token de acceso disponible');
    }

    try {
      console.log('📝 Creando evento:', eventData.summary);
      
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const event = await response.json();
      console.log('✅ Evento creado:', event.id);
      
      return {
        success: true,
        event: event
      };
    } catch (error) {
      console.error('❌ Error creating event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ============================================
  // MANEJADOR DE HERRAMIENTAS
  // ============================================

  const handleToolCall = async (toolName, toolInput) => {
    console.log(`🔧 Ejecutando herramienta: ${toolName}`, toolInput);
    
    try {
      switch (toolName) {
        case 'search_drive':
          return await searchDriveFiles(toolInput.query, toolInput.maxResults || 10);
          
        case 'list_recent_files':
          return await listRecentFiles(toolInput.maxResults || 20);
          
        case 'get_file_by_id':
          return await getFileById(toolInput.fileId);
          
        case 'list_calendar_events':
          return await listCalendarEvents(
            toolInput.timeMin,
            toolInput.timeMax,
            toolInput.maxResults || 10
          );
          
        case 'search_calendar_events':
          return await searchCalendarEvents(
            toolInput.query,
            toolInput.timeMin,
            toolInput.timeMax
          );
          
        case 'create_calendar_event':
          return await createCalendarEvent(toolInput.event);
          
        case 'search_contacts':
          return await searchContacts(toolInput.query, toolInput.maxResults || 10);
          
        case 'list_contacts':
          return await listContacts(toolInput.maxResults || 20);
          
        default:
          return {
            success: false,
            error: `Herramienta desconocida: ${toolName}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ============================================
  // DEFINICIÓN DE HERRAMIENTAS PARA CLAUDE
  // ============================================

  const tools = [
    {
      name: 'search_drive',
      description: 'Busca archivos en Google Drive del usuario por nombre o contenido. Útil para encontrar documentos, hojas de cálculo, presentaciones, etc.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda para encontrar archivos en Drive'
          },
          maxResults: {
            type: 'number',
            description: 'Número máximo de resultados a retornar (default: 10)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'list_recent_files',
      description: 'Lista los archivos más recientes de Google Drive del usuario, ordenados por fecha de modificación.',
      input_schema: {
        type: 'object',
        properties: {
          maxResults: {
            type: 'number',
            description: 'Número máximo de archivos a listar (default: 20)'
          }
        },
        required: []
      }
    },
    {
      name: 'list_calendar_events',
      description: 'Lista eventos del calendario de Google del usuario en un rango de fechas específico.',
      input_schema: {
        type: 'object',
        properties: {
          timeMin: {
            type: 'string',
            description: 'Fecha/hora de inicio en formato ISO (default: ahora)'
          },
          timeMax: {
            type: 'string',
            description: 'Fecha/hora de fin en formato ISO (default: +7 días)'
          },
          maxResults: {
            type: 'number',
            description: 'Número máximo de eventos (default: 10)'
          }
        },
        required: []
      }
    },
    {
      name: 'search_calendar_events',
      description: 'Busca eventos específicos en el calendario por término de búsqueda.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda para eventos'
          },
          timeMin: {
            type: 'string',
            description: 'Fecha/hora de inicio (default: ahora)'
          },
          timeMax: {
            type: 'string',
            description: 'Fecha/hora de fin (default: +30 días)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'create_calendar_event',
      description: 'Crea un nuevo evento en Google Calendar. Requiere al menos summary, start y end.',
      input_schema: {
        type: 'object',
        properties: {
          event: {
            type: 'object',
            description: 'Datos del evento a crear (summary, description, start, end, location, attendees)',
            properties: {
              summary: { type: 'string', description: 'Título del evento' },
              description: { type: 'string', description: 'Descripción del evento' },
              start: {
                type: 'object',
                properties: {
                  dateTime: { type: 'string', description: 'Fecha/hora inicio ISO' },
                  timeZone: { type: 'string', description: 'Zona horaria' }
                }
              },
              end: {
                type: 'object',
                properties: {
                  dateTime: { type: 'string', description: 'Fecha/hora fin ISO' },
                  timeZone: { type: 'string', description: 'Zona horaria' }
                }
              },
              location: { type: 'string', description: 'Ubicación del evento' }
            }
          }
        },
        required: ['event']
      }
    }
  ];

  // ============================================
  // ENVIAR MENSAJE CON SOPORTE DE HERRAMIENTAS
  // ============================================

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setToolCalls([]);

    try {
      let conversationMessages = [...messages, userMessage];
      let continueLoop = true;
      let iterationCount = 0;
      const maxIterations = 5;

      while (continueLoop && iterationCount < maxIterations) {
        iterationCount++;

        // Preparar el cuerpo de la solicitud
        const requestBody = {
          messages: conversationMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          systemPrompt: assistant.systemPrompt + (accessToken ? 
            '\n\n**HERRAMIENTAS DISPONIBLES:**\n' +
            '**Google Drive:**\n' +
            '- search_drive: Buscar archivos/documentos por nombre o contenido\n' +
            '- list_recent_files: Listar archivos modificados recientemente\n\n' +
            '**Google Calendar:**\n' +
            '- list_calendar_events: Listar eventos en un rango de fechas\n' +
            '- search_calendar_events: Buscar eventos específicos por texto\n' +
            '- create_calendar_event: Crear nuevos eventos (puede incluir attendees con emails)\n\n' +
            '**Google Contacts:**\n' +
            '- search_contacts: Buscar contactos por NOMBRE o EMAIL (usa esto cuando el usuario mencione un nombre de persona)\n' +
            '- list_contacts: Listar contactos recientes del usuario\n\n' +
            '**REGLAS IMPORTANTES:**\n' +
            '1. Si el usuario menciona un NOMBRE DE PERSONA (ej: "Elsa", "Juan Pérez"), SIEMPRE usa search_contacts primero para obtener su email.\n' +
            '2. Al crear eventos con participantes, PRIMERO busca los contactos para obtener emails correctos, LUEGO crea el evento.\n' +
            '3. search_drive es SOLO para buscar ARCHIVOS/DOCUMENTOS, NO para buscar personas.\n' +
            '4. Si necesitas un email y no lo tienes, pregunta al usuario o busca en contactos.\n\n' +
            'Ejemplo de flujo correcto:\n' +
            'Usuario: "Crea una reunión con Juan"\n' +
            '1. Ejecutar: search_contacts con query="Juan" para obtener su email\n' +
            '2. Ejecutar: create_calendar_event con el email encontrado en attendees' : 
            '\n\nNOTA: El usuario aún no ha otorgado permisos para acceder a Drive, Calendar y Contactos.'
          )
        };

        // Solo incluir herramientas si hay token de acceso
        if (accessToken) {
          requestBody.tools = tools;
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          let errorMessage = 'Error al enviar mensaje';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            errorMessage = `Error ${response.status}: ${errorText || 'Error del servidor'}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('📨 Respuesta de Claude:', data);

        // Verificar si Claude quiere usar herramientas
        if (data.stop_reason === 'tool_use') {
          console.log('🔧 Claude solicita usar herramientas');
          
          // Agregar respuesta de Claude (con tool_use)
          conversationMessages.push({
            role: 'assistant',
            content: data.content
          });

          // Ejecutar todas las herramientas solicitadas
          const toolResults = [];
          for (const contentBlock of data.content) {
            if (contentBlock.type === 'tool_use') {
              console.log(`🛠️ Ejecutando: ${contentBlock.name}`);
              setToolCalls(prev => [...prev, {
                name: contentBlock.name,
                input: contentBlock.input
              }]);

              const result = await handleToolCall(contentBlock.name, contentBlock.input);
              
              toolResults.push({
                type: 'tool_result',
                tool_use_id: contentBlock.id,
                content: JSON.stringify(result)
              });
            }
          }

          // Agregar resultados de herramientas a la conversación
          conversationMessages.push({
            role: 'user',
            content: toolResults
          });

          // Continuar el loop para obtener la respuesta final de Claude
          continueLoop = true;
        } else {
          // Respuesta final de Claude
          const assistantMessage = {
            role: 'assistant',
            content: data.content[0].text
          };

          setMessages(prev => [...prev, assistantMessage]);
          continueLoop = false;
        }
      }

      if (iterationCount >= maxIterations) {
        console.warn('⚠️ Se alcanzó el límite de iteraciones');
      }

    } catch (error) {
      console.error('❌ Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Lo siento, hubo un error: ${error.message}. Por favor intenta de nuevo.`
        }
      ]);
    } finally {
      setIsLoading(false);
      setToolCalls([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: assistant.bgColor }}
            >
              {assistant.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{assistant.name}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                {accessToken ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Conectado a Drive, Calendar y Contactos
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                    Sin permisos de Google
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={user?.imageUrl}
              alt={user?.name}
              className="w-10 h-10 rounded-full border-2 border-gray-600"
            />
            <button
              onClick={onLogout}
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {/* Indicador de herramientas en uso */}
          {toolCalls.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-purple-900/50 border border-purple-600 rounded-2xl p-4 max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-purple-200 font-medium text-sm">Usando herramientas...</span>
                </div>
                <div className="space-y-1">
                  {toolCalls.map((tool, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-purple-300">
                      {tool.name === 'search_drive' || tool.name === 'list_recent_files' ? (
                        <FileText className="w-3 h-3" />
                      ) : tool.name === 'search_contacts' || tool.name === 'list_contacts' ? (
                        <Users className="w-3 h-3" />
                      ) : (
                        <Calendar className="w-3 h-3" />
                      )}
                      <span>{tool.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {isLoading && toolCalls.length === 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg px-6 py-3 transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;