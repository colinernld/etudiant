// server.js
import express from 'express';
import cors from 'cors';
import alasql from 'alasql';

const app = express();
app.use(cors());
app.use(express.json());

console.log("⏳ Chargement des données DEV en mémoire (AlaSQL)...");

const initDB = async () => {
    try {
        // On utilise les fichiers _DEV (5000 lignes) pour que ça soit instantané !
        await alasql.promise(`
            CREATE TABLE Site_Inscrits;
            SELECT * INTO Site_Inscrits FROM CSV('./data/Site_Inscrits_DEV.csv', {headers:true, separator:','});
            
            CREATE TABLE CRM_Campagnes;
            SELECT * INTO CRM_Campagnes FROM CSV('./data/CRM_Campagnes_DEV.csv', {headers:true, separator:','});
            
            CREATE TABLE Salons;
            SELECT * INTO Salons FROM CSV('./data/Salons_Inscrits_DEV.csv', {headers:true, separator:','});
            
            CREATE TABLE Domaine_Etude;
            SELECT * INTO Domaine_Etude FROM CSV('./data/Domaine_Etude_DEV.csv', {headers:true, separator:','});
        `);
        console.log("✅ Base DEV locale prête ! Moteur SQL opérationnel 🚀");
    } catch (err) {
        console.error("❌ Erreur lors du chargement des CSV DEV :", err);
    }
};

initDB();

app.post('/api/query', async (req, res) => {
    try {
        const { sql } = req.body;
        console.log(`[Reçu] Exécution SQL : ${sql}`);
        
        const result = await alasql.promise(sql);
        res.json(result);
    } catch (error) {
        console.error("Erreur SQL:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 API Hackathon en écoute sur http://localhost:${PORT}`));