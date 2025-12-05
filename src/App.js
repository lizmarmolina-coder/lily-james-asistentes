import React, { useState, useEffect } from 'react';
import { BriefcaseBusiness, Target } from 'lucide-react';
import ChatWindow from './ChatWindow';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [gapiReady, setGapiReady] = useState(false);

  const assistants = {
    lily: {
      name: 'Lily',
      color: 'from-purple-600 via-pink-500 to-red-500',
      bgColor: '#17ABAE',
      greeting: '¡Hola! Soy Lily, tu asistente de negocios. 💼\n\nEstoy aquí para ayudarte con estrategias empresariales, análisis de datos, soporte técnico y creación de dashboards en Power BI.\n\nTambién puedo acceder a tus archivos de Google Drive y Calendar.\n\n¿En qué puedo ayudarte hoy?',
      systemPrompt: `Eres Lily, una asistente virtual de negocios experta en métricas y eficiencia. Eres profesional, orientada a resultados y proporcionas soluciones prácticas. Puedes ayudar con Google Drive y Calendar cuando el usuario lo solicite.`
    },
    james: {
      name: 'James',
      color: 'from-blue-600 via-cyan-500 to-teal-400',
      bgColor: '#17ABAE',
      greeting: '¡Hola! Soy James, tu asistente personal. 🎯\n\nPuedo ayudarte con la gestión de tareas, planificación de proyectos personales y organización de tu agenda.\n\nTengo acceso a tu Google Drive y Calendar para ayudarte mejor.\n\n¿Qué necesitas organizar hoy?',
      systemPrompt: `Eres James, un asistente virtual personal enfocado en comodidad e inmediatez. Eres amigable, organizado y ayudas al usuario a ser más productivo. Puedes acceder a Google Drive y Calendar cuando sea necesario.`
    }
  };

  useEffect(() => {
    loadGoogleAPI();
  }, []);

  const loadGoogleAPI = () => {
    // Cargar Google Sign-In
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Cargar gapi
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client', async () => {
          await initializeGapi();
          setGapiReady(true);
        });
      };
      document.head.appendChild(gapiScript);
      
      // Inicializar Google Sign-In
      setTimeout(() => {
        if (window.google) {
          try {
            window.google.accounts.id.initialize({
              client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
              callback: handleCredentialResponse,
            });
            setIsLoading(false);
          } catch (error) {
            console.error('Error al inicializar Google:', error);
            setIsLoading(false);
          }
        }
      }, 100);
    };

    script.onerror = () => {
      console.error('Error al cargar el script de Google');
      setIsLoading(false);
    };

    document.head.appendChild(script);
  };

  const initializeGapi = async () => {
    try {
      // Inicializar solo el cliente, SIN discoveryDocs
      await window.gapi.client.init({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
      });
      
      console.log('✅ GAPI client initialized (sin APIs cargadas aún)');
    } catch (error) {
      console.error('❌ Error initializing GAPI client:', error);
    }
  };

  const handleCredentialResponse = (response) => {
    try {
      console.log('📧 Credenciales de Google recibidas');
      const userObject = parseJwt(response.credential);
      setUser({
        name: userObject.name,
        email: userObject.email,
        imageUrl: userObject.picture
      });
      
      console.log('🔑 Solicitando permisos adicionales...');
      requestAdditionalScopes();
    } catch (error) {
      console.error('Error al procesar credenciales:', error);
    }
  };

  const requestAdditionalScopes = () => {
    console.log('📋 Inicializando cliente OAuth para permisos...');
    
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.error('❌ Google OAuth2 no está disponible');
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      callback: async (tokenResponse) => {
        console.log('✅ Token de acceso recibido');
        console.log('Token:', tokenResponse.access_token ? 'Presente ✓' : 'Ausente ✗');
        
        setAccessToken(tokenResponse.access_token);
        
        // Configurar el token en gapi
        window.gapi.client.setToken({
          access_token: tokenResponse.access_token
        });
        
        console.log('🔄 Cargando APIs de Google Drive y Calendar...');
        
        // AHORA SÍ cargar las APIs con el token configurado
        try {
          await window.gapi.client.load('drive', 'v3');
          console.log('✅ Google Drive API cargada');
          
          await window.gapi.client.load('calendar', 'v3');
          console.log('✅ Google Calendar API cargada');
          
          // Verificar que las APIs estén disponibles
          console.log('📊 Estado de APIs:');
          console.log('  - Calendar API:', !!window.gapi.client.calendar ? '✓ Disponible' : '✗ No disponible');
          console.log('  - Drive API:', !!window.gapi.client.drive ? '✓ Disponible' : '✗ No disponible');
          
        } catch (error) {
          console.error('❌ Error cargando APIs de Google:', error);
        }
        
        console.log('✅ Autenticación completa - Permisos configurados');
        setIsAuthenticated(true);
      },
      error_callback: (error) => {
        console.error('❌ Error al solicitar permisos:', error);
      }
    });
    
    console.log('🔓 Solicitando acceso al usuario...');
    client.requestAccessToken({ prompt: 'consent' });
  };

  const parseJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  };

  const handleGoogleLogin = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const handleLogout = () => {
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    // Limpiar token de gapi si existe
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken(null);
    }
    
    setIsAuthenticated(false);
    setSelectedAssistant(null);
    setUser(null);
    setAccessToken(null);
    setGapiReady(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
          <h1 className="text-4xl font-bold text-white mb-2 text-center">
            Lily & James
          </h1>
          <p className="text-gray-300 text-center mb-8">
            Tus asistentes virtuales con acceso a Drive y Calendar
          </p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Iniciar sesión con Google
          </button>
          <p className="text-gray-400 text-xs text-center mt-4">
            Se solicitarán permisos para acceder a Drive y Calendar
          </p>
        </div>
      </div>
    );
  }

  if (selectedAssistant) {
    return (
      <ChatWindow
        assistant={assistants[selectedAssistant]}
        onBack={() => setSelectedAssistant(null)}
        user={user}
        onLogout={handleLogout}
        accessToken={accessToken}
        gapiReady={gapiReady}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <h1 className="text-4xl font-bold text-white">
            Elige tu Asistente Virtual
          </h1>
          <div className="flex items-center gap-4">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-gray-600"
              />
            )}
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <button
            onClick={() => setSelectedAssistant('lily')}
            className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-red-500/20" />
            <div className="relative p-8 backdrop-blur-sm bg-gray-800/40 border border-gray-700 hover:border-gray-600 transition-all">
              <div 
                className="w-32 h-32 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl"
                style={{ backgroundColor: assistants.lily.bgColor }}
              >
                Lily
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 text-center">
                Lily
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <BriefcaseBusiness className="w-5 h-5 text-gray-300" />
                <p className="text-gray-300 font-medium">Asistente de Negocios</p>
              </div>
              <p className="text-gray-400 text-center text-sm">
                Métricas y eficiencia empresarial
              </p>
            </div>
          </button>

          <button
            onClick={() => setSelectedAssistant('james')}
            className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-cyan-500/20 to-teal-400/20" />
            <div className="relative p-8 backdrop-blur-sm bg-gray-800/40 border border-gray-700 hover:border-gray-600 transition-all">
              <div 
                className="w-32 h-32 mx-auto mb-6 rounded-2xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl"
                style={{ backgroundColor: assistants.james.bgColor }}
              >
                James
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 text-center">
                James
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Target className="w-5 h-5 text-gray-300" />
                <p className="text-gray-300 font-medium">Asistente Personal</p>
              </div>
              <p className="text-gray-400 text-center text-sm">
                Comodidad e inmediatez
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;