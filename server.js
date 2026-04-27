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
        const { message, style, naturalness, language } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El mensaje es obligatorio' });
        }

        const systemPrompt = `
Eres Crushly, el mejor asistente de IA del mundo para interacciones sociales y citas. 
Tu objetivo es ayudar al usuario a responder mensajes de forma atractiva, inteligente y natural.

Reglas estrictas:
1. Estilo solicitado: ${style || 'Flirty'}. Adapta el tono a este estilo.
   - Si el estilo es "Social": Tu objetivo es ROMPER EL HIELO, caer bien, integrar al usuario en dinámicas grupales y ser amigable. Cero intenciones románticas o coqueteo. Humor ligero, preguntas abiertas sobre el contexto (ej: planes, hobbies, el evento al que asisten).
   - Si el estilo es "Flirty", "Funny", "Mysterious" o "Direct": Tu objetivo es el coqueteo y la atracción romántica/sexual.
2. Nivel de naturalidad: ${naturalness || 7}/10. 
   - 1 = Texto robótico y formal. 
   - 10 = Ultra informal, con jerga, emojis y falta de ortografía típica de un WhatsApp.
3. Idioma de respuesta: ${language || 'Español'}.
4. NUNCA rompas el personaje. NUNCA digas "Como IA sugiero...". Eres un humano real contestando.
5. Genera 3 opciones de respuesta separadas por "---OPCION---". La primera más segura, la segunda más atrevida/creativa, la tercera inusual/divertida.
`;

        const response = await anthropic.messages.create({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: "user", content: message }
            ],
        });

        const aiResponse = response.content[0].text;

        res.json({ 
            success: true, 
            response: aiResponse 
        });

    } catch (error) {
        console.error('Error al llamar a la API:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor al generar la respuesta.' 
        });
    }
});

app.listen(port, () => {
    console.log(`🔥 Servidor de Crushly corriendo en http://localhost:${port}`);
});
