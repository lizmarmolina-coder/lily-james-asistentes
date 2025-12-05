export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, systemPrompt, tools } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages required' });
    }

    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    // Preparar el cuerpo de la solicitud
    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048, // Aumentado para respuestas más largas con herramientas
      system: systemPrompt || 'Eres un asistente virtual útil.',
      messages: messages
    };

    // Solo agregar tools si están presentes
    if (tools && Array.isArray(tools) && tools.length > 0) {
      requestBody.tools = tools;
      console.log('🔧 Herramientas habilitadas:', tools.map(t => t.name).join(', '));
    }

    console.log('📤 Enviando solicitud a Claude...');
    console.log('   Mensajes:', messages.length);
    console.log('   Herramientas:', tools?.length || 0);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Anthropic error:', errorText);
      return res.status(response.status).json({ 
        error: 'Error from Anthropic',
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Log para debugging
    console.log('📨 Respuesta de Claude:');
    console.log('   Stop reason:', data.stop_reason);
    console.log('   Content blocks:', data.content?.length || 0);
    
    if (data.stop_reason === 'tool_use') {
      const toolsUsed = data.content
        .filter(block => block.type === 'tool_use')
        .map(block => block.name);
      console.log('   🔧 Herramientas solicitadas:', toolsUsed.join(', '));
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}