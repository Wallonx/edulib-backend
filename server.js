const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ VOTRE CLÉ API
const GEMINI_API_KEY = "AIzaSyAzeTE8HBH6UJO-KplSYy_GOt0BtS4UrP8"; 

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
            {
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }]
            },
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

// --- ROUTE 2 : GÉNÉRATION DE FLASHCARDS (NOUVELLE) ---
app.post('/generate-flashcards', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n2. ⚡ Flashcards : Traitement de ${title}`);

        // 1. Téléchargement
        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        // 2. Prompt Spécial Flashcards
        const promptText = `
        Tu es un expert en pédagogie et mémorisation.
        Analyse le document PDF fourni (Titre: "${title}").
        
        Tâche : Crée 8 "Flashcards" (Fiches de révision) pertinentes pour réviser ce cours.
        Chaque carte doit avoir un "front" (Question ou Concept) et un "back" (Réponse claire ou Définition).
        
        Format de réponse OBLIGATOIRE : Uniquement un objet JSON valide.
        Structure :
        {
          "flashcards": [
            {
              "front": "Concept ou Question",
              "back": "Explication courte et précise"
            }
          ]
        }`;

        // 3. Appel Gemini
        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        // 4. Nettoyage
        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalJson = JSON.parse(rawAnswer);

        res.json(finalJson);
        console.log("   ✅ Flashcards générées !");

    } catch (error) {
        console.error("❌ ERREUR Flashcards :", error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// Render utilise process.env.PORT, sinon 3001 en local
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveur EduLib prêt sur le port ${PORT}`));