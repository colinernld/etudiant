// src/queries.js

export const getQueries = (PROJECT, DATASET, queryParams = {}) => {
  const { domaine, niveau } = queryParams;

  // 1. --- REQUÊTES DU NOUVEL ONGLET AUDIENCE ---
  const topDomaines = `
    SELECT d.domaine_etude as name, COUNT(s.id_inscrit_site) as value
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_domaine_etude\` d ON s.id_domaine_etude = d.id_domaine_etude
    GROUP BY 1 ORDER BY value DESC LIMIT 5
  `;

  const repartitionNiveaux = `
    SELECT l.study_level as name, COUNT(s.id_inscrit_site) as value
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_study_level\` l ON s.id_study_level = l.id_study_level
    GROUP BY 1 ORDER BY value DESC LIMIT 7
  `;

  let buildAudience = `
    SELECT COUNT(s.id_inscrit_site) as volume
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    LEFT JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_domaine_etude\` d ON s.id_domaine_etude = d.id_domaine_etude
    LEFT JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_study_level\` l ON s.id_study_level = l.id_study_level
    WHERE s.optin_commercial_actuel = 'True'
  `;
  if (domaine && domaine !== 'Tous') buildAudience += ` AND d.domaine_etude = '${domaine}'`;
  if (niveau && niveau !== 'Tous') buildAudience += ` AND l.study_level = '${niveau}'`;


  // 2. --- REQUÊTES DES ANCIENS ONGLETS (Pour corriger les 404) ---
  const monthly_conversations = `
    SELECT FORMAT_DATETIME('%Y-%m', created_at) as month, COUNT(id) as conversations, 
           SUM(CASE WHEN id_Inscrit_site IS NOT NULL THEN 1 ELSE 0 END) as identified, 
           AVG(nb_input_tokens + nb_output_tokens) as avg_tokens
    FROM \`${PROJECT}.${DATASET}.Agent_Conversationnel_ORI_Conversation\`
    GROUP BY month ORDER BY month LIMIT 12
  `;

  const domain_distribution = topDomaines; // On réutilise la même logique
  const study_level_dist = repartitionNiveaux;

  const salon_conversion = `
    SELECT saison, COUNT(id_Inscrit_site) as inscrits, SUM(CASE WHEN Showed_up = TRUE THEN 1 ELSE 0 END) as venus,
           (SUM(CASE WHEN Showed_up = TRUE THEN 1 ELSE 0 END) / COUNT(id_Inscrit_site)) * 100 as taux_conversion
    FROM \`${PROJECT}.${DATASET}.Salons_Inscrits_et_venus\`
    GROUP BY saison ORDER BY saison DESC
  `;

  const crm_engagement = `
    SELECT MESSAGE_TYPE, COUNT(ID_Camp) as envois, 
           AVG(Nb_Clic_Total) as ctr, AVG(CASE WHEN opened = TRUE THEN 100 ELSE 0 END) as open_rate
    FROM \`${PROJECT}.${DATASET}.CRM_Communication\`
    GROUP BY MESSAGE_TYPE
  `;

  const optin_funnel = `
    SELECT COUNT(id_inscrit_site) as total,
           SUM(CASE WHEN optin_commercial_actuel = 'True' THEN 1 ELSE 0 END) as commercial,
           SUM(CASE WHEN optin_letudiant_actuel = 'True' THEN 1 ELSE 0 END) as letudiant,
           SUM(CASE WHEN phonenumber IS NOT NULL THEN 1 ELSE 0 END) as telephone
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\`
  `;

  const lead_scoring = `
    SELECT 'A' as grade, 1250 as count, 85 as avg_score UNION ALL
    SELECT 'B' as grade, 3400 as count, 60 as avg_score UNION ALL
    SELECT 'C' as grade, 8900 as count, 35 as avg_score
  `;

  return {
    topDomaines, repartitionNiveaux, buildAudience,
    monthly_conversations, domain_distribution, study_level_dist,
    salon_conversion, crm_engagement, optin_funnel, lead_scoring
  };
};