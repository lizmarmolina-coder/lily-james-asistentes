import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, LogOut } from 'lucide-react';
import './App.css';
import { detectAndProcessIntent, getAvailableCommands } from './assistantActions';

const App = () => {
  const [activeAssistant, setActiveAssistant] = useState(null);
  const [messages, setMessages] = useState({ lily: [], james: [] });
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeAssistant]);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    const user = localStorage.getItem('user_info');
    if (token && user) {
      setGoogleAccessToken(token);
      setUserInfo(JSON.parse(user));
      setIsAuthenticated(true);
    }
  }, []);

  const assistants = {
    lily: {
      name: 'Lily',
      color: 'from-purple-600 via-pink-500 to-red-500',
      bgColor: '#17ABAE',
      hoverColor: '#15999C',
      greeting: '¡Hola! Soy Lily, tu asistente de negocios. \n\nEstoy aquí para ayudarte con estrategias empresariales, análisis de datos, soporte técnico y creación de dashboards en Power BI.\n\n¿En qué puedo ayudarte hoy?',
      systemPrompt: `Eres Lily, una asistente virtual de negocios experta en métricas y eficiencia. Eres profesional, orientada a resultados y proporcionas soluciones prácticas.`
    },
    james: {
      name: 'James',
      color: 'from-blue-600 via-cyan-500 to-teal-400',
      bgColor: '#17ABAE',
      hoverColor: '#15999C',
      greeting: '¡Hola! Soy James, tu asistente personal. \n\nPuedo ayudarte con la gestión de tareas, planificación de proyectos personales y organización de tu agenda.\n\n¿Qué necesitas organizar hoy?',
      systemPrompt: `Eres James, un asistente virtual personal enfocado en comodidad e inmediatez. Eres amigable, organizado y ayudas al usuario a ser más productivo.`
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scope = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    
    window.location.href = authUrl;
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        setGoogleAccessToken(accessToken);
        localStorage.setItem('google_access_token', accessToken);
        
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then(res => res.json())
          .then(user => {
            setUserInfo(user);
            localStorage.setItem('user_info', JSON.stringify(user));
            setIsAuthenticated(true);
          });
        
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('user_info');
    setGoogleAccessToken(null);
    setUserInfo(null);
    setIsAuthenticated(false);
    setActiveAssistant(null);
    setMessages({ lily: [], james: [] });
  };

  const initializeChat = (assistant) => {
    if (messages[assistant].length === 0) {
      const commands = getAvailableCommands(assistant);
      const welcomeMessage = assistants[assistant].greeting + 
        `\n\n💡 **${commands.message}**\n\n` +
        `**Google Drive:**\n${commands.drive.join('\n')}\n\n` +
        `**Google Calendar:**\n${commands.calendar.join('\n')}`;
      
      setMessages(prev => ({
        ...prev,
        [assistant]: [{
          type: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        }]
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !activeAssistant || isLoading) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [activeAssistant]: [...prev[activeAssistant], userMessage]
    }));

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      if (googleAccessToken) {
        const intentResult = await detectAndProcessIntent(currentInput, googleAccessToken);
        
        if (intentResult) {
          setMessages(prev => ({
            ...prev,
            [activeAssistant]: [
              ...prev[activeAssistant],
              {
                type: 'assistant',
                content: intentResult.message,
                timestamp: new Date(),
                googleAction: true,
                actionData: intentResult
              }
            ]
          }));
          setIsLoading(false);
          return;
        }
      }

      const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
      
      if (!apiKey || apiKey === 'pendiente_comprar_mañana') {
        throw new Error('API_KEY_NOT_CONFIGURED');
      }

      const currentAssistant = assistants[activeAssistant];
      
      let systemPrompt = currentAssistant.systemPrompt;
      if (isAuthenticated && userInfo) {
        systemPrompt += `\n\nEl usuario está autenticado con Google. Nombre: ${userInfo.name}, Email: ${userInfo.email}.`;
        
        const commands = getAvailableCommands(activeAssistant);
        systemPrompt += `\n\nPuedes ayudar al usuario con:\n- Buscar archivos en Google Drive\n- Gestionar eventos de Google Calendar\n\nEjemplos de comandos:\n${commands.drive.join('\n')}\n${commands.calendar.join('\n')}`;
      }

      const response = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...messages[activeAssistant]
              .filter(msg => msg.type !== 'system' && !msg.googleAction)
              .map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
              })),
            { role: 'user', content: currentInput }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantResponse = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      setMessages(prev => ({
        ...prev,
        [activeAssistant]: [
          ...prev[activeAssistant],
          {
            type: 'assistant',
            content: assistantResponse,
            timestamp: new Date()
          }
        ]
      }));
    } catch (error) {
      let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje. ';
      
      if (error.message === 'API_KEY_NOT_CONFIGURED') {
        errorMessage += '⚠️ La API Key de Anthropic no está configurada.';
      } else {
        errorMessage += 'Por favor intenta de nuevo.';
      }

      setMessages(prev => ({
        ...prev,
        [activeAssistant]: [
          ...prev[activeAssistant],
          {
            type: 'assistant',
            content: errorMessage,
            timestamp: new Date(),
            error: true
          }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const openAssistant = (assistant) => {
    setActiveAssistant(assistant);
    setIsMinimized(false);
    initializeChat(assistant);
  };

  const closeChat = () => {
    setActiveAssistant(null);
    setIsMinimized(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1a1d29] flex items-center justify-center p-8 relative overflow-hidden">
        {/* Animated wave background */}
        <div className="wave-background"></div>
        
        <div className="max-w-7xl w-full relative z-10">
          {/* Header */}
          <div className="text-left mb-16">
            <h1 className="text-5xl font-bold text-white mb-4" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.8)'}}>
              ¡Hola! <span className="animate-wave inline-block">👋</span>
            </h1>
            <h2 className="text-4xl font-bold text-white mb-6" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.8)'}}>
              Soy tu <span className="text-white">Asistente Virtual</span>
            </h2>
            <p className="text-white text-xl max-w-3xl" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.8)'}}>
              Para empezar, elige el perfil que mejor se adapte a tus necesidades actuales.
            </p>
          </div>

          {/* Assistant cards in row */}
          <div className="flex gap-8 mb-16 justify-start">
            {Object.entries(assistants).map(([key, assistant]) => (
              <button
                key={key}
                onClick={handleGoogleLogin}
                className="assistant-card group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105 shadow-2xl"
                style={{ 
                  backgroundColor: assistant.bgColor,
                  width: '280px',
                  height: '200px'
                }}
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative z-10 flex items-center justify-center h-full">
                  <h2 className="text-7xl font-bold text-white drop-shadow-lg">{assistant.name}</h2>
                </div>
              </button>
            ))}
          </div>

          {/* Description text */}
          <div className="text-left max-w-4xl">
            <p className="text-white text-base leading-relaxed italic" style={{textShadow: '1px 1px 4px rgba(0,0,0,0.8)'}}>
              La elección de tu asistente optimizará la forma en que gestionamos tus peticiones. 
              Si seleccionas a <span className="font-bold">Lily</span>, las respuestas serán más enfocadas en{' '}
              <span className="font-bold">métricas y eficiencia</span>. 
              Si eliges a <span className="font-bold">James</span>, priorizaremos la{' '}
              <span className="font-bold">comodidad y la inmediatez</span> en tus tareas diarias.
            </p>
          </div>
        </div>

        {/* Didcom logo */}
        <div className="absolute top-8 right-8 z-20">
          <div className="text-gray-400 text-4xl font-bold opacity-50">didcom</div>
        </div>
      </div>
    );
  }

  if (!activeAssistant) {
    return (
      <div className="min-h-screen bg-[#1a1d29] p-6 relative overflow-hidden">
        <div className="wave-background"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-xl p-6 mb-8 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {userInfo?.picture ? (
                  <img src={userInfo.picture} alt="Usuario" className="w-16 h-16 rounded-full border-4 border-purple-500 shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {userInfo?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-white text-xl">¡Hola, {userInfo?.name?.split(' ')[0] || 'Usuario'}!</p>
                  <p className="text-sm text-gray-400">{userInfo?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-3 text-red-400 hover:bg-red-900/30 rounded-xl transition-all duration-300 font-semibold border border-red-500/30"
              >
                <LogOut size={20} />
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="text-left mb-12">
            <h1 className="text-5xl font-bold text-white mb-4" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.8)'}}>
              Soy tu <span className="text-white">Asistente Virtual</span>
            </h1>
            <p className="text-xl text-white" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.8)'}}>
              Para empezar, elige el perfil que mejor se adapte a tus necesidades actuales.
            </p>
          </div>

          <div className="flex gap-8 mb-8 justify-start">
            {Object.entries(assistants).map(([key, assistant]) => (
              <button
                key={key}
                onClick={() => openAssistant(key)}
                className="assistant-card group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105 shadow-2xl"
                style={{ 
                  backgroundColor: assistant.bgColor,
                  width: '280px',
                  height: '200px'
                }}
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative z-10 flex items-center justify-center h-full">
                  <h2 className="text-7xl font-bold text-white drop-shadow-lg">{assistant.name}</h2>
                </div>
              </button>
            ))}
          </div>

          <div className="text-left max-w-4xl">
            <p className="text-white text-base leading-relaxed italic" style={{textShadow: '1px 1px 4px rgba(0,0,0,0.8)'}}>
              La elección de tu asistente optimizará la forma en que gestionamos tus peticiones. 
              Si seleccionas a <span className="font-bold">Lily</span>, las respuestas serán más enfocadas en{' '}
              <span className="font-bold">métricas y eficiencia</span>. 
              Si eliges a <span className="font-bold">James</span>, priorizaremos la{' '}
              <span className="font-bold">comodidad y la inmediatez</span> en tus tareas diarias.
            </p>
          </div>
        </div>

        <div className="absolute top-8 right-8 z-20">
          <div className="text-gray-400 text-4xl font-bold opacity-50">didcom</div>
        </div>
      </div>
    );
  }

  const currentAssistant = assistants[activeAssistant];

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`bg-gradient-to-r ${currentAssistant.color} text-white rounded-full p-5 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110`}
        >
          <MessageCircle size={28} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[650px] bg-gray-900 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden border-2 border-purple-500/30">
      <div className={`bg-gradient-to-r ${currentAssistant.color} text-white p-5 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-bold text-2xl">{currentAssistant.name}</h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 p-2 rounded-xl transition-all duration-300"
          >
            <Minimize2 size={20} />
          </button>
          <button
            onClick={closeChat}
            className="hover:bg-white/20 p-2 rounded-xl transition-all duration-300"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-800">
        {messages[activeAssistant].map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-lg ${
                message.type === 'user'
                  ? `bg-gradient-to-r ${currentAssistant.color} text-white`
                  : message.error
                  ? 'bg-red-900/50 text-red-200'
                  : 'bg-gray-700 text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-gray-900 border-t-2 border-gray-700">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribe tu mensaje..."
            className="flex-1 border-2 border-gray-700 bg-gray-800 text-white rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 text-sm placeholder-gray-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`bg-gradient-to-r ${currentAssistant.color} text-white rounded-2xl px-5 hover:shadow-xl transition-all duration-300 disabled:opacity-50`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;