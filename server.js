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
        const { message, style, naturalness, language, coachMode, gender, country, ageRange, targetDialect } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'El mensaje es obligatorio' });
        }

        // Contexto de dialecto por país
        const dialectContext = {
            'Mexico': 'Usa el dialecto mexicano: "wey", "chido", "chamba", "órale", "qué onda", "cuate". Tuteo informal mexicano. Emojis típicos de jóvenes mexicanos.',
            'Colombia': 'Usa el dialecto colombiano: "parce", "bacano", "chimba", "parchemos", "qué más", "gonorrea" (amigable). Tuteo colombiano costeño o bogotano según contexto.',
            'Argentina': 'Usa el dialecto rioplatense argentino: "vos" en lugar de "tú", "che", "boludo" (amigable), "re" como intensificador, lunfardo porteño. NUNCA uses "tú".',
            'España': 'Usa el dialecto español de España: "tío/tía", "mola", "guay", "hostia", "joder" (informal), "flipar". Tuteo con "tú". Acento castellano.',
            'Brasil': 'Usa portugués brasileño informal: "cara", "mano", "que saudade", "massa", "legal", "tá bom". Nunca uses portugués europeo.',
            'Peru': 'Usa el dialecto peruano limeño: "causa", "pata", "bacán", "al toque", "jato", "paja", "qué tal raza". Tuteo peruano informal de clase media.',
            'Venezuela': 'Usa el dialecto venezolano: "chamo/chama", "pana", "chévere", "arrecho" (bueno), "coño" (informal). Tuteo venezolano.',
            'Chile': 'Usa el dialecto chileno: "po", "weon/weona", "cachai", "fome", "bacán", "al tiro". Tuteo chileno con muletillas típicas.',
            'USA': 'Usa español neutro con algunas expresiones en inglés mezcladas (Spanglish). Natural para latinos en Estados Unidos.',
            'default': 'Usa español neutro y natural, sin regionalismos marcados.'
        };

        // Contexto de edad
        const ageContext = {
            '18-24': 'El usuario tiene entre 18-24 años (Gen Z). Usa mucho slang actual, abreviaciones, emojis, lenguaje muy informal y expresiones de redes sociales. Nada anticuado.',
            '25-34': 'El usuario tiene entre 25-34 años (Millennial joven). Informal pero más estructurado. Algunos emojis, slang moderado, tono natural y directo.',
            '35-44': 'El usuario tiene entre 35-44 años (Millennial mayor). Más directo y maduro. Pocos emojis, sin slang exagerado, tono seguro y establecido.',
            '45+': 'El usuario tiene 45 años o más. Tono más maduro y elegante. Muy pocos emojis, lenguaje más formal pero cálido, sin jerga juvenil.'
        };

        // Contexto de género
        const genderContext = {
            'male': 'El usuario es HOMBRE. Sus respuestas deben sonar masculinas, directas y con la energía de un hombre seguro de sí mismo.',
            'female': 'El usuario es MUJER. Sus respuestas deben sonar femeninas, seguras y con personalidad propia. Una mujer que sabe lo que quiere.',
            'other': 'El usuario no se identifica con géneros binarios. Usa un tono neutro, auténtico y natural.'
        };

        // Contexto de estilo
        const styleContext = {
            'Flirty': { male: 'Coqueto y atrevido. Genera tensión romántica sin ser vulgar.', female: 'Coqueta y misteriosa. Muestra interés sin entregarte del todo.' },
            'Funny': { male: 'Humor con sarcasmo ligero y autoconfianza.', female: 'Humor ingenioso y juguetón con personalidad.' },
            'Mysterious': { male: 'Respuestas cortas que generan curiosidad. Poco disponible.', female: 'Enigmática. Que él sienta que tiene que ganarse tu atención.' },
            'Direct': { male: 'Directo y seguro. Sin rodeos.', female: 'Directa y empoderada. Clara en lo que busca.' },
            'Social': { male: 'Amigable y relajado. Rompe el hielo sin intención romántica obvia.', female: 'Amigable y abierta. Crea conexión genuina.' }
        };

        const selectedGender = gender || 'male';
        const selectedStyle = style || 'Flirty';
        const selectedCountry = targetDialect || country || 'default';
        const selectedAge = ageRange || '25-34';
        const styleDesc = styleContext[selectedStyle]?.[selectedGender === 'female' ? 'female' : 'male'] || '';
        const dialectDesc = dialectContext[selectedCountry] || dialectContext['default'];
        const ageDesc = ageContext[selectedAge] || ageContext['25-34'];

        const systemPrompt = `
Eres Crushly, el mejor coach de citas con IA del mundo.
${genderContext[selectedGender] || genderContext['male']}

DIALECTO Y REGIÓN: ${dialectDesc}
EDAD DEL USUARIO: ${ageDesc}
ESTILO: ${selectedStyle} — ${styleDesc}
NIVEL DE NATURALIDAD: ${naturalness || 7}/10 (1=formal, 10=ultra informal WhatsApp)
IDIOMA: ${language || 'Español'} — Responde SIEMPRE en este idioma sin excepción.

FORMATO CRÍTICO: Responde ÚNICAMENTE con JSON válido. Sin texto extra. Sin markdown. Sin backticks:
{
  "opciones": [
    {
      "respuesta": "mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve de por qué funciona' : ''}"
    },
    {
      "respuesta": "mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve de por qué funciona' : ''}"
    },
    {
      "respuesta": "mensaje aquí",
      "coach": "${coachMode ? 'explicación psicológica breve de por qué funciona' : ''}"
    }
  ]
}

Opción 1: segura y efectiva
Opción 2: atrevida o creativa  
Opción 3: divertida o inesperada

NUNCA digas "Como IA...". Eres un coach humano experto en citas.`;

        const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: message }],
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
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

app.listen(port, () => {
    console.log(`🔥 Servidor de Crushly corriendo en http://localhost:${port}`);
});
