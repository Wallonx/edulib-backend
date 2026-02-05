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

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { 
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }],
                generationConfig: { response_mime_type: "application/json" }
            },
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

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { 
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }],
                generationConfig: { response_mime_type: "application/json" }
            },
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

// --- ROUTE 3 : GÉNÉRATION DE FICHE DE RÉVISION OU RÉSUMÉ DE LIVRE ---
app.post('/generate-summary', async (req, res) => {
    try {
        // On récupère aussi le docType pour savoir quel prompt utiliser
        const { downloadURL, title, docType } = req.body;
        console.log(`\n3. 📝 Synthèse (${docType || 'cours'}) : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        // --- DÉFINITION DES PROMPTS ---
        
        // 1. Prompt pour les COURS (Existant)
        const promptCours = `
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
        `;

        // 2. Prompt pour les LIVRES (Nouveau)
        const promptLivre = `
        Tu es un critique littéraire et bibliothécaire expert.
        Ton objectif est de créer une **Fiche de Lecture Complète** pour le livre fourni ("${title}").

        CONSIGNES DE RÉDACTION :
        1. Adopte un ton analytique mais accessible.
        2. Utilise des émojis pour structurer la lecture.
        3. Fais ressortir l'essentiel pour quelqu'un qui veut comprendre l'œuvre sans la lire.
        4. Utilise strictement le format Markdown ci-dessous.

        STRUCTURE ATTENDUE (Markdown) :

        # 📚 Fiche de Lecture : ${title}

        ## 📝 Informations Clés
        - **Auteur** : (Déduis-le du document si possible)
        - **Genre** : (Roman, Essai, Théâtre, etc.)
        - **Thème central** : En une phrase.

        ## 📖 Résumé Global (Le Pitch)
        *Un paragraphe résumant l'intrigue générale ou l'argument principal du livre.*

        ## 🔍 Résumé Détaillé (Les moments clés)
        *Les points de bascule de l'histoire ou les chapitres clés.*
        - **Situation Initiale** : ...
        - **Élément Perturbateur** : ...
        - **Péripéties / Développement** : ...
        - **Dénouement / Conclusion** : ...

        ## 👥 Personnages Principaux (ou Concepts clés si essai)
        - **[Nom]** : Son rôle, sa psychologie, son évolution.
        - **[Nom]** : Son rôle, sa psychologie, son évolution.

        ## 🗝️ Thèmes & Analyse
        *Quels sont les messages cachés ou les sujets profonds abordés ?*
        - **[Thème 1]** : Analyse.
        - **[Thème 2]** : Analyse.

        ## 💬 Citation Marquante
        > "Une citation extraite du texte qui capture l'essence du livre."

        ## 🌟 Avis Critique & Portée
        *Pourquoi ce livre est-il important ? Que faut-il en retenir pour la culture générale ?*
        `;

        // SÉLECTION DU PROMPT SELON LE TYPE
        const promptText = (docType === 'livre') ? promptLivre : promptCours;
        const finalPrompt = `${promptText}\nFormat de sortie JSON : { "summary": "Le contenu en markdown ici..." }`;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { 
                contents: [{ parts: [{ text: finalPrompt }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }],
                generationConfig: { response_mime_type: "application/json" } 
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const finalJson = JSON.parse(rawAnswer);
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Summary :", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 4 : RÉSOLUTION D'EXERCICES ---
app.post('/solve-exercises', async (req, res) => {
    try {
        const { downloadURL, title } = req.body;
        console.log(`\n4. 🧮 Solveur : Traitement de ${title}`);

        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es un professeur particulier d'excellence (type prépa).
        Analyse le document PDF fourni ("${title}").
        
        TACHE :
        Identifie les exercices ou questions d'examen présents et fournis une correction détaillée pas à pas.
        
        IMPORTANT - FORMATAGE DES MATHÉMATIQUES :
        1. **N'utilise PAS de LaTeX** (pas de signes $ ou $$). C'est illisible sur l'interface.
        2. Écris les formules mathématiques en **texte brut clair** ou avec des symboles Unicode simples.
           - Exemple : Au lieu de $x^2$, écris "x²".
           - Exemple : Au lieu de $\\frac{a}{b}$, écris "a / b".
           - Exemple : Au lieu de $\\rightarrow$, écris "->".
        3. Pour les grosses équations complexes, utilise des **Blocs de Code** (triples guillemets) pour qu'elles soient bien alignées.

        CONSIGNES PÉDAGOGIQUES :
        1. Repère les exercices (ex: "Exercice 1", "Question 3").
        2. Pour chaque exercice, donne la solution complète avec la méthodologie.
        3. Explique les étapes clairement en français.
        4. Mets en **gras** les résultats finaux.

        STRUCTURE JSON ATTENDUE :
        {
            "solutions": [
                {
                    "title": "Exercice 1 : [Titre ou Sujet]",
                    "content": "### Énoncé détecté\n[Résumé]...\n\n### 💡 Méthodologie\n[Conseil]...\n\n### ✅ Résolution\n1. On commence par...\n2. Ensuite...\n\nCalcul : 2x + 4 = 0\nDonc x = -2\n\n### 🏁 Résultat Final\n**Réponse : -2**"
                }
            ]
        }
        `;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { 
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }],
                generationConfig: { response_mime_type: "application/json" } 
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let rawAnswer = aiResponse.data.candidates[0].content.parts[0].text;
        rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const finalJson = JSON.parse(rawAnswer);
        res.json(finalJson);

    } catch (error) {
        console.error("❌ ERREUR Solveur :", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

// --- ROUTE 5 : CHATBOT IA DOCUMENTAIRE (NOUVEAU) ---
app.post('/chat-document', async (req, res) => {
    try {
        const { downloadURL, title, userQuestion } = req.body;
        console.log(`\n5. 💬 Chat : Question sur ${title}`);
        console.log(`❓ Question : ${userQuestion}`);

        // Téléchargement du PDF
        const response = await axios.get(downloadURL, { responseType: 'arraybuffer' });
        const base64Data = Buffer.from(response.data).toString('base64');

        const promptText = `
        Tu es Eli, un assistant pédagogique virtuel intelligent et bienveillant.
        Ton rôle est d'aider l'étudiant à comprendre et maîtriser le document PDF fourni (Titre : "${title}").

        QUESTION DE L'UTILISATEUR : "${userQuestion}"

        CONSIGNES DE RÉPONSE :
        1. **Périmètre d'action** : Tu es un expert du SUJET traité dans ce document.
           - Si la question porte sur le cours, les exercices, la méthodologie ou des concepts liés au document : **Réponds de manière complète et pédagogique**.
           - Tu as le droit d'utiliser tes connaissances générales pour expliquer un concept ou une formule mentionnée dans le document, même si la définition n'est pas écrite explicitement dedans.
           - Pour la résolution d'exercices, utilise STRICTEMENT les données chiffrées du document.

        2. **Gestion du Hors-Sujet** :
           - Si la question n'a AUCUN rapport avec le thème du document (exemple : une question de cuisine alors que le document est des mathématiques, ou une question sur l'actualité), réponds poliment :
           "Désolé, mais le document que nous étudions actuellement ("${title}") ne traite pas de ce sujet. Je suis là pour t'aider à maîtriser ce cours précis. As-tu une question en rapport avec le document ?"

        3. **Ton et Style** :
           - Sois clair, encourageant et précis.
           - Utilise le format Markdown (gras pour les mots clés, listes à puces) pour aérer ta réponse.
           - Si l'utilisateur est bloqué, donne-lui des indices méthodologiques avant de donner la solution brute.

        Ta réponse doit être directement le texte de la réponse (pas de JSON).
        `;

        const aiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { 
                contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }]
                // Note: Pas de response_mime_type JSON ici, on veut du texte libre
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const answer = aiResponse.data.candidates[0].content.parts[0].text;
        
        // On renvoie un JSON simple contenant la réponse
        res.json({ answer: answer });

    } catch (error) {
        console.error("❌ ERREUR Chat :", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Erreur technique IA." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveur EduLib prêt sur le port ${PORT}`));