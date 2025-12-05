export default async function handler(req, res) {
  console.log('Function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Request body:', req.body);
    
    // Test simple
    return res.status(200).json({ 
      content: [{ 
        type: 'text', 
        text: 'Hola! Esta es una respuesta de prueba. Si ves esto, la función está funcionando.' 
      }]
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}