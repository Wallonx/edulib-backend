require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- FONCTION DE NETTOYAGE JSON (C'est elle qui corrige ton bug "Unexpected token") ---
function extractJSON(text) {
    try {
        // Trouve le début '{' et la fin '}' du JSON pour ignorer le texte "Voici..."
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}') + 1;
        if (startIndex === -1 || endIndex === 0) return null;
        
        const jsonString = text.substring(startIndex, endIndex);
        return JSON.parse(jsonString);
    } catch (e) {
        return null;
    }
}

// --- ROUTE 1 : QUIZ ---
app.post('/generate-quiz', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n1. 📝 Quiz : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es un professeur expert.
        Analyse le document PDF fourni (Titre: "${title}").
        Tâche : Crée un QCM de 5 questions basé STRICTEMENT sur le contenu.
        IMPORTANT : Ne réponds RIEN d'autre que le JSON. Pas de "Voici le quiz".
        Format JSON uniquement : { "questions": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..." } ] }`;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const rawText = aiResponse.data.candidates[0].content.parts[0].text;
        const finalJson = extractJSON(rawText); // Utilisation du nettoyeur

        if (!finalJson) throw new Error("Réponse IA invalide (Pas de JSON)");
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Quiz :", error.response?.data || error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 2 : FLASHCARDS ---
app.post('/generate-flashcards', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n2. ⚡ Flashcards : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es un expert en pédagogie.
        Analyse ce document (Titre: "${title}").
        Tâche : Crée 8 "Flashcards" pour réviser.
        IMPORTANT : Ne réponds RIEN d'autre que le JSON. Pas de "Voici les cartes".
        Format JSON attendu : { "flashcards": [ { "front": "Question ?", "back": "Réponse." } ] }`;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const rawText = aiResponse.data.candidates[0].content.parts[0].text;
        const finalJson = extractJSON(rawText); // Utilisation du nettoyeur

        if (!finalJson) throw new Error("Réponse IA invalide (Pas de JSON)");
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Flashcards :", error.response?.data || error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 3 : FICHE RÉVISION ---
app.post('/generate-summary', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n3. 📝 Fiche Révision : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es un expert en synthèse. Crée une fiche de révision parfaite pour : "${title}".
        Utilise le format Markdown.
        IMPORTANT : Renvoie le résultat dans un objet JSON.
        Format de sortie JSON : { "summary": "# Titre\n\n## Contenu..." }
        `;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const rawText = aiResponse.data.candidates[0].content.parts[0].text;
        const finalJson = extractJSON(rawText); // Utilisation du nettoyeur

        if (!finalJson) throw new Error("Réponse IA invalide (Pas de JSON)");
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Summary :", error.response?.data || error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveur EduLib prêt sur le port ${PORT}`));