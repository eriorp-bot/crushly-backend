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
        const { message, style, naturalness, language, coachMode, gender } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El mensaje es obligatorio' });
        }

        const genderContext = {
            'male': 'El usuario es HOMBRE heterosexual. Sus respuestas deben sonar masculinas, directas y con la energía de un hombre seguro de sí mismo que coquetea con una mujer.',
            'female': 'El usuario es MUJER. Sus respuestas deben sonar femeninas, con personalidad propia, seguras pero no desesperadas. Una mujer que sabe lo que quiere y no persigue.',
            'other': 'El usuario no se identifica con géneros binarios. Usá un tono neutro, auténtico y natural.'
        };

        const styleContext = {
            'Flirty': {
                male: 'Coqueto y atrevido. Generá tensión sexual sin ser vulgar. Mostrá interés pero sin parecer necesitado.',
                female: 'Coqueta y misteriosa. Mostrá interés sin entregarte del todo. Dejá que él persiga.'
            },
            'Funny': {
                male: 'Humor masculino: sarcasmo ligero, autoconfianza, wit. Nada de payaso.',
                female: 'Humor femenino: ingenioso, juguetón, con personalidad. Que haga reír sin perder elegancia.'
            },
            'Mysterious': {
                male: 'Poco disponible, respuestas cortas que generan curiosidad. Que ella quiera saber más.',
                female: 'Enigmática, no revela todo. Que él sienta que tiene que ganarse su atención.'
            },
            'Direct': {
                male: 'Directo y seguro. Sin rodeos. Un hombre que sabe lo que quiere.',
                female: 'Directa y empoderada. Clara en lo que busca sin parecer agresiva.'
            },
            'Social': {
                male: 'Amigable, romper el hielo sin intención romántica obvia. Natural y relajado.',
                female: 'Amigable y abierta. Crea conexión genuina antes de cualquier coqueteo.'
            }
        };

        const selectedGender = gender || 'male';
        const selectedStyle = style || 'Flirty';
        const styleDesc = styleContext[selectedStyle]?.[selectedGender === 'male' ? 'male' : selectedGender === 'female' ? 'female' : 'male'] || '';

        const systemPrompt = `
Eres Crushly, el mejor coach de citas con IA del mundo.
${genderContext[selectedGender] || genderContext['male']}

Estilo de respuesta: ${selectedStyle}
Descripción del estilo: ${styleDesc}

Nivel de naturalidad: ${naturalness || 7}/10
- 1 = Formal y estructurado
- 10 = Ultra informal, jerga, emojis, errores típicos de WhatsApp

Idioma de respuesta: ${language || 'Español'}
CRÍTICO: Responde SIEMPRE en ${language || 'Español'}. Si el idioma es inglés, responde en inglés. Si es portugués, en portugués. Si es francés, en francés.

INSTRUCCIÓN DE FORMATO CRÍTICA: Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después. Sin markdown. Sin backticks. Exactamente este formato:
{
  "opciones": [
    {
      "respuesta": "mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve de por qué funciona esta respuesta' : ''}"
    },
    {
      "respuesta": "mensaje aquí", 
      "coach": "${coachMode ? 'explicación psicológica breve de por qué funciona esta respuesta' : ''}"
    },
    {
      "respuesta": "mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve de por qué funciona esta respuesta' : ''}"
    }
  ]
}

Opción 1: más segura y efectiva
Opción 2: más atrevida o creativa
Opción 3: divertida o inesperada

NUNCA rompas el personaje. NUNCA digas "Como IA...". Sos un coach humano experto.`;

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
