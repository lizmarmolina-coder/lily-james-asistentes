import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';

function ChatWindow({ assistant, onBack, user, onLogout, accessToken }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: assistant.greeting
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const searchDrive = async (query) => {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name contains '${query}' and trashed=false`,
        pageSize: 10,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)'
      });
      return response.result.files || [];
    } catch (error) {
      console.error('Error searching Drive:', error);
      return [];
    }
  };

  const getCalendarEvents = async (timeMin, timeMax) => {
    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      return response.result.items || [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  };

  const detectIntent = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Detectar búsqueda en Drive
    if (lowerMessage.includes('busca') || lowerMessage.includes('encuentra') || 
        lowerMessage.includes('archivo') || lowerMessage.includes('documento') ||
        lowerMessage.includes('drive')) {
      return 'search_drive';
    }
    
    // Detectar consulta de calendario
    if (lowerMessage.includes('agenda') || lowerMessage.includes('calendario') ||
        lowerMessage.includes('reunión') || lowerMessage.includes('evento') ||
        lowerMessage.includes('cita') || lowerMessage.includes('programado')) {
      return 'check_calendar';
    }
    
    return 'chat';
  };

  const extractSearchQuery = (message) => {
    const patterns = [
      /busca?\s+(?:el\s+)?(?:archivo\s+)?(?:documento\s+)?(?:sobre\s+)?['"]?([^'"]+)['"]?/i,
      /encuentra?\s+(?:el\s+)?(?:archivo\s+)?(?:documento\s+)?(?:sobre\s+)?['"]?([^'"]+)['"]?/i,
      /archivo\s+(?:de\s+)?(?:sobre\s+)?['"]?([^'"]+)['"]?/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const userInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const intent = detectIntent(userInput);
      let contextInfo = '';

      // Si tiene permisos de Drive/Calendar y detectamos intención
      if (accessToken && window.gapi) {
        if (intent === 'search_drive') {
          const query = extractSearchQuery(userInput);
          if (query) {
            const files = await searchDrive(query);
            if (files.length > 0) {
              contextInfo = `\n\n[INFORMACIÓN DE GOOGLE DRIVE]\nEncontré ${files.length} archivos relacionados:\n${files.map(f => `- ${f.name} (${f.mimeType}) - ${f.webViewLink}`).join('\n')}\n[FIN DE INFORMACIÓN]`;
            } else {
              contextInfo = `\n\n[INFORMACIÓN DE GOOGLE DRIVE]\nNo encontré archivos con "${query}" en Google Drive.\n[FIN DE INFORMACIÓN]`;
            }
          }
        } else if (intent === 'check_calendar') {
          const events = await getCalendarEvents();
          if (events.length > 0) {
            contextInfo = `\n\n[INFORMACIÓN DE GOOGLE CALENDAR]\nEventos de hoy:\n${events.map(e => {
              const start = e.start.dateTime || e.start.date;
              const summary = e.summary || 'Sin título';
              return `- ${start}: ${summary}`;
            }).join('\n')}\n[FIN DE INFORMACIÓN]`;
          } else {
            contextInfo = `\n\n[INFORMACIÓN DE GOOGLE CALENDAR]\nNo tienes eventos programados para hoy.\n[FIN DE INFORMACIÓN]`;
          }
        }
      }

      // Llamar a la API con contexto adicional
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          systemPrompt: assistant.systemPrompt + (contextInfo ? `\n\nContexto adicional del usuario:${contextInfo}\n\nUsa esta información real para responder al usuario de forma específica y útil.` : '')
        })
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
      
      const assistantMessage = {
        role: 'assistant',
        content: data.content[0].text
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
        }
      ]);
    } finally {
      setIsLoading(false);
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
              <p className="text-sm text-gray-400">
                {accessToken ? 'Con acceso a Drive y Calendar' : 'Asistente Virtual'}
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
          {isLoading && (
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