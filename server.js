require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/generate', async (req, res) => {
    try {
        const { message, style, naturalness, language, coachMode } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El mensaje es obligatorio' });
        }

        const systemPrompt = `
Eres Crushly, asistente de citas con IA.
Estilo: ${style || 'Flirty'}. Naturalidad: ${naturalness || 7}/10. Idioma: ${language || 'Español'}.

Reglas de estilo:
- "Social": amigable, sin coqueteo, humor ligero.
- "Flirty/Funny/Mysterious/Direct": coqueteo y atracción.
Naturalidad 1=formal, 10=WhatsApp con jerga y emojis.

INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown, sin backticks. El formato exacto es:
{
  "opciones": [
    {
      "respuesta": "texto del mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve' : ''}"
    },
    {
      "respuesta": "texto del mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve' : ''}"
    },
    {
      "respuesta": "texto del mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve' : ''}"
    }
  ]
}

La primera opción es segura, la segunda atrevida, la tercera creativa/divertida.
NUNCA rompas el personaje. NUNCA digas "Como IA...".`;

        const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: "user", content: message }
            ],
        });

        const rawText = response.content[0].text.trim();
        
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            // Si el modelo metió backticks igual, los limpiamos
            const cleaned = rawText.replace(/```json|```/g, '').trim();
            parsed = JSON.parse(cleaned);
        }

        const opciones = parsed.opciones.map(op => ({
            respuesta: op.respuesta || '',
            coach: op.coach || ''
        }));

        res.json({ success: true, opciones, coachMode: !!coachMode });

    } catch (error) {
        console.error('Error al llamar a la API:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor.' 
        });
    }
});

app.listen(port, () => {
    console.log(`🔥 Servidor de Crushly corriendo en http://localhost:${port}`);
});
