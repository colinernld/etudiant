// ─── BigQuery query runner ────────────────────────────────────────────────────
// Calls the BigQuery REST API via google-auth token (ADC already configured)
// Usage: replace PROJECT_ID and ensure GOOGLE_APPLICATION_CREDENTIALS is set.
// In a real deployment this runs server-side; here we simulate with real-looking
// data that matches the exact schema of letudiant-data-prod.Hacka_g24

const PROJECT = "letudiant-data-prod";
const DATASET = "Hacka_g24";

// ─── BIGQUERY QUERIES (prêts à coller dans BQ console ou notebook) ─────────
export const BQ_QUERIES = {
  monthly_conversations: `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(created_at)) AS month,
      COUNT(*) AS conversations,
      COUNTIF(id_Inscrit_site IS NOT NULL) AS identified,
      ROUND(AVG(nb_input_tokens)) AS avg_tokens
    FROM \`${PROJECT}.${DATASET}.Agent_Conversationnel_ORI_Conversation\`
    WHERE created_at >= '2025-01-01'
    GROUP BY month ORDER BY month`,

  domain_distribution: `
    SELECT d.domaine_etude, COUNT(*) AS cnt
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_domaine_etude\` d
      ON s.id_domaine_etude = d.id_domaine_etude
    WHERE d.domaine_etude IS NOT NULL
    GROUP BY 1 ORDER BY cnt DESC LIMIT 15`,

  study_level_dist: `
    SELECT sl.study_level, COUNT(*) AS cnt
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_study_level\` sl
      ON s.id_study_level = sl.id_study_level
    WHERE sl.study_level IS NOT NULL
    GROUP BY 1 ORDER BY cnt DESC LIMIT 12`,

  lead_scoring: `
    SELECT
      CASE
        WHEN score >= 75 THEN 'A — Hot'
        WHEN score >= 40 THEN 'B — Warm'
        ELSE 'C — Cold'
      END AS grade,
      COUNT(*) AS count,
      ROUND(AVG(score), 1) AS avg_score
    FROM (
      SELECT
        id_Inscrit_site,
        EXP(-DATE_DIFF(CURRENT_DATE(), DATE(created_at), DAY) / 90.0) * 100 * 0.35
        + CASE WHEN id_Inscrit_site IS NOT NULL THEN 60 ELSE 20 END * 0.25
        + LEAST(nb_input_tokens / 50000.0, 1) * 100 * 0.25
        + CASE WHEN id_Inscrit_site IS NOT NULL THEN 80 ELSE 20 END * 0.15
        AS score
      FROM \`${PROJECT}.${DATASET}.Agent_Conversationnel_ORI_Conversation\`
    )
    GROUP BY 1 ORDER BY 1`,

  salon_conversion: `
    SELECT
      saison,
      COUNT(*) AS inscrits,
      COUNTIF(Showed_up = TRUE) AS venus,
      ROUND(COUNTIF(Showed_up = TRUE) / COUNT(*) * 100, 1) AS taux_conversion
    FROM \`${PROJECT}.${DATASET}.Salons_Inscrits_et_venus\`
    GROUP BY 1 ORDER BY 1`,

  crm_engagement: `
    SELECT
      MESSAGE_TYPE,
      COUNT(*) AS envois,
      COUNTIF(opened = TRUE) AS opens,
      COUNTIF(clicked = TRUE) AS clicks,
      ROUND(COUNTIF(opened = TRUE) / COUNT(*) * 100, 1) AS open_rate,
      ROUND(COUNTIF(clicked = TRUE) / COUNT(*) * 100, 1) AS ctr
    FROM \`${PROJECT}.${DATASET}.CRM_Communication\`
    WHERE MESSAGE_TYPE IS NOT NULL
    GROUP BY 1 ORDER BY envois DESC LIMIT 10`,

  optin_funnel: `
    SELECT
      COUNTIF(optin_commercial_actuel = 'True') AS commercial,
      COUNTIF(optin_letudiant_actuel = 'True') AS letudiant,
      COUNTIF(optin_tel_actuel = 'True') AS telephone,
      COUNTIF(optin_COACHING = 'True') AS coaching,
      COUNTIF(optin_FINANCE = 'True') AS finance,
      COUNT(*) AS total
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\`
  `,
};