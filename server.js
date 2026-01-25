const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Récupère la clé depuis le fichier caché .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- ROUTE 1 : GÉNÉRATION DE QUIZ ---
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
        Format JSON uniquement : { "questions": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..." } ] }`;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalJson = JSON.parse(rawAnswer);
        
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Quiz :", error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 2 : GÉNÉRATION DE FLASHCARDS ---
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
        - "front": Une question ou un concept clé.
        - "back": La réponse ou définition précise.
        
        IMPORTANT : Respecte la typographie française (espace avant ? et !).
        Format JSON attendu : { "flashcards": [ { "front": "Question ?", "back": "Réponse." } ] }`;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalJson = JSON.parse(rawAnswer);

        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Flashcards :", error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 3 : GÉNÉRATION DE FICHE DE RÉVISION (STYLE BRISTOL) ---
app.post('/generate-summary', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n3. 📝 Fiche Révision : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es un étudiant brillant qui prépare ses examens.
        Analyse ce document de cours (Titre: "${title}").
        
        Tâche : Rédige une "Fiche de révision" synthétique et ultra-claire.
        Style : Prise de notes (bullet points, flèches, gras).
        
        Structure attendue (en Markdown) :
        # 📑 Fiche : ${title}
        
        ## 🎯 L'essentiel en 3 phrases
        [Résumé ultra-court]
        
        ## 🔑 Concepts Clés
        - **[Concept 1]** : [Explication simple]
        - **[Concept 2]** : [Explication simple]
        
        ## 🧠 À retenir par cœur
        > [Définition ou formule importante]
        
        ## ⚠️ Astuces / Pièges
        - [Conseil d'ami pour l'examen]

        Format de sortie JSON : { "summary": "Le contenu en markdown ici..." }
        `;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalJson = JSON.parse(rawAnswer);

        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Summary :", error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveur EduLib prêt sur le port ${PORT}`));