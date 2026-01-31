require('dotenv').config(); // Charge le fichier .env
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

        // MODIFICATION : Utilisation de gemini-2.5-flash (Quota: 1000 RPM)
        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalJson = JSON.parse(rawAnswer);
        
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Quiz :", error.response ? error.response.data : error.message);
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

        // MODIFICATION : Utilisation de gemini-2.5-flash
        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        const finalJson = JSON.parse(rawAnswer);

        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Flashcards :", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 3 : GÉNÉRATION DE FICHE DE RÉVISION ---
app.post('/generate-summary', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n3. 📝 Fiche Révision (Avancée) : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es un expert en synthèse pédagogique et "Sketchnoting". 
        Ton objectif est de créer la fiche de révision PARFAITE pour un étudiant, basée sur le document fourni ("${title}").

        CONSIGNES DE RÉDACTION :
        1. **Synthèse intelligente** : Ne recopie pas le texte, reformule pour clarifier.
        2. **Visuel** : Utilise des émojis pertinents pour chaque section.
        3. **Mise en valeur** : Mets en **gras** les mots-clés importants.
        4. **Structure** : Utilise strictement le format Markdown ci-dessous.

        STRUCTURE ATTENDUE (Markdown) :

        # 📑 Fiche : ${title}

        ## 🎯 Objectif & Contexte
        *En 2 phrases : De quoi parle ce cours et pourquoi c'est important ?*

        ## 🔑 Concepts Fondamentaux (Le cœur du cours)
        *Liste les 3 à 5 grands points à comprendre absolument.*
        - **[Concept 1]** : Explication claire et concise.
        - **[Concept 2]** : Explication claire et concise.
        *(Utilise des sous-points si nécessaire)*

        ## 📖 Vocabulaire & Définitions
        *Les termes techniques précis.*
        - **[Terme A]** : Définition.
        - **[Terme B]** : Définition.

        ## 🧠 À retenir par cœur (Dates / Formules / Chiffres)
        > [Formule mathématique, Date historique ou Théorème clé]
        > [Autre élément incontournable]

        ## 💡 Exemple Concret / Application
        *Un exemple simple pour illustrer la théorie (ex: "Imaginez que...").*

        ## ⚠️ Les Pièges de l'examen
        - [Erreur classique à ne pas faire]
        - [Confusion fréquente à éviter]

        Format de sortie JSON : { "summary": "Le contenu en markdown ici..." }
        `;

        // MODIFICATION : Utilisation de gemini-2.5-flash
        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        
        // Nettoyage agressif pour éviter les bugs JSON
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Parsing sécurisé
        let finalJson;
        try {
            finalJson = JSON.parse(rawAnswer);
        } catch (e) {
            console.error("Erreur parsing JSON IA, tentative de correction...");
            finalJson = { summary: rawAnswer }; 
        }

        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Summary :", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveur EduLib prêt sur le port ${PORT}`));