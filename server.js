import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import { getQueries } from './src/queries.js';

const app = express();
app.use(cors());


// Google Cloud ira lire la session ouverte par ton "gcloud auth"
const bigquery = new BigQuery({
  projectId: 'letudiant-data-prod' // Garde juste l'ID du projet
});

app.get('/api/data/:queryName', async (req, res) => {
    try {
      const { queryName } = req.params;
      const PROJECT = 'letudiant-data-prod';
      const DATASET = 'Hacka_g24';
      
      // On appelle notre fonction avec les paramètres de l'URL !
      const queries = getQueries(PROJECT, DATASET, req.query);
      const sqlQuery = queries[queryName];
  
      if (!sqlQuery) {
        return res.status(404).json({ error: `Requête ${queryName} non trouvée` });
      }
  
      const options = {
        query: sqlQuery,
        location: 'EU',
        useQueryCache: false, 
      };
  
      const [rows] = await bigquery.query(options);
      res.json(rows);
    } catch (error) {
      console.error(`🚨 Erreur BQ sur la route ${req.params.queryName} :`, error);
      res.status(500).json({ error: error.message });
    }
});

// DÉMARRAGE DU SERVEUR
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Serveur Backend Hacka_g24 lancé avec succès !`);
  console.log(`📡 En écoute sur : http://localhost:${PORT}`);
  console.log(`🧠 Prêt à interroger BigQuery (letudiant-data-prod) en temps réel.\n`);
});