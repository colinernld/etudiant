import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import { BQ_QUERIES } from './src/queries.js'; 

const app = express();
app.use(cors());

// MAGIE ICI : On ne met plus de keyFilename !
// Google Cloud ira lire la session ouverte par ton "gcloud auth"
const bigquery = new BigQuery({
  projectId: 'letudiant-data-prod' // Garde juste l'ID du projet
});

app.get('/api/data/:queryName', async (req, res) => {
  const { queryName } = req.params;
  const query = BQ_QUERIES[queryName];

  if (!query) {
    return res.status(404).json({ error: 'Requête non trouvée' });
  }

  try {
    console.log(`Exécution Live BQ: ${queryName}...`);
    // Lancement de la requête vers Google Cloud
    const [rows] = await bigquery.query({ query: query });
    res.json(rows);
  } catch (error) {
    console.error(`Erreur BQ sur ${queryName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Serveur API BigQuery Live démarré sur http://localhost:${PORT}`);
});