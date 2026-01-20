const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ REMETTEZ VOTRE CLÉ API ICI (Gardez les guillemets)
const GEMINI_API_KEY = "AIzaSyAzeTE8HBH6UJO-KplSYy_GOt0BtS4UrP8"; 

app.post('/generate-quiz', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n1. Traitement de : ${title}`);

        // --- 1. TÉLÉCHARGEMENT ---
        console.log("   📥 Téléchargement du fichier...");
        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        
        // Conversion Base64 (Format universel pour Gemini)
        const base64Data = Buffer.from(response.data).toString('base64');
        console.log(`   ✅ Fichier prêt (${response.data.length} octets)`);

        // --- 2. ENVOI À GEMINI 2.0 ---
        console.log("2. Envoi à Gemini 2.0 Flash (Lecture native)...");
        
        const promptText = `
        Tu es un professeur expert.
        Analyse le document PDF fourni (Titre: "${title}").
        
        Tâche : Crée un QCM de 5 questions basé STRICTEMENT sur le contenu de ce document.
        
        Format de réponse OBLIGATOIRE : Uniquement un objet JSON valide (pas de markdown, pas de balises \`\`\`json).
        Structure :
        {
          "questions": [
            {
              "question": "...",
              "options": ["A", "B", "C", "D"],
              "correct": 0,
              "explanation": "..."
            }
          ]
        }`;

        // 👇 CHANGEMENT MAJEUR : ON PASSE SUR GEMINI 2.0 FLASH EXP
        // C'est le modèle le plus récent et le plus robuste pour les fichiers.
        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: promptText },
                        {
                            inline_data: {
                                mime_type: "application/pdf",
                                data: base64Data
                            }
                        }
                    ]
                }]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        // --- 3. RÉCEPTION ---
        if (!aiResponse.data.candidates || !aiResponse.data.candidates[0]) {
            throw new Error("Gemini 2.0 n'a rien renvoyé. Le document est peut-être trop complexe.");
        }

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        
        // Nettoyage agressif du JSON
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const finalJson = JSON.parse(rawAnswer);
        
        res.json(finalJson);
        console.log("3. 🚀 SUCCÈS : Quiz généré avec Gemini 2.0 !");

    } catch (error) {
        console.error("❌ ERREUR :", error.message);
        if (error.response) {
            // Affiche l'erreur exacte renvoyée par Google
            console.error(">> Détail Google :", JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

app.listen(3001, () => console.log("✅ Serveur EduLib (Gemini 2.0) prêt sur le port 3001"));