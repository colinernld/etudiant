# Spécifications Produits Data - L'Étudiant (Cas #3)

---

## Produit 1 : Lead Scoring (Leads Data-as-a-Service)

*   **Client cible :** Directions des admissions des écoles d'enseignement supérieur privées et CFA.
*   **Description :** Algorithme attribuant un grade (A — Hot, B — Warm, C — Cold) à chaque prospect en fonction de la profondeur de son engagement conversationnel et de son identification sur la plateforme.
*   **Inputs :**
    *   Table : `Agent_Conversationnel_ORI_Conversation`
    *   Données : Date de la conversation (`created_at`), identification utilisateur (`id_Inscrit_site`), volume de tokens (`nb_input_tokens`).
*   **Transformations :**
    *   **Calcul du Score Composite :** Formule SQL (`lead_scoring`) pondérant la récence de l'interaction (décroissance exponentielle sur 90 jours : 35%), l'identification de l'utilisateur (25%), la profondeur de l'échange (ratio de tokens : 25%), et la complétude du profil (15%).
    *   **Catégorisation :** Conversion du score continu (0-100) en grades discrets (A ≥ 75, B ≥ 40, C < 40).
    *   **Filtrage Légal :** Croisement avec la requête `optin_funnel` (`Site_Inscrits`) pour ne retenir que les profils ayant `optin_commercial_actuel = 'OUI'` (40.2% de la base, soit 278k profils activables).
*   **Logique de Pricing :** Coût par Lead (CPL) qualifié. Le prix varie selon le grade (ex: Grade A facturé au prix fort).
*   **Profil de Marge :** **85%**. Les coûts de traitement BigQuery sont marginaux par rapport à la valeur de revente d'un profil "Hot".

---

## Produit 2 : Observatoire d'Audience et d'Engagement (SaaS Dashboard)

*   **Client cible :** Responsables Marketing des établissements supérieurs et annonceurs du secteur éducatif.
*   **Description :** Tableau de bord interactif (onglets : Vue d'ensemble, Audience, Salons) permettant d'analyser la saisonnalité de la demande, l'intérêt par domaine, et l'efficacité des canaux d'acquisition.
*   **Inputs :**
    *   Tables : `Site_Inscrits` (et ses dimensions), `Agent_Conversationnel_ORI_Conversation`, `Salons_Inscrits_et_venus`.
    *   Données : Domaines d'études, niveaux d'études, historique des conversations mensuelles, statuts de présence aux salons.
*   **Transformations :**
    *   **Analyse de Saisonnalité :** Agrégation mensuelle des conversations (`monthly_conversations`) mettant en évidence les pics d'activité (ex: Rentrée Sept 2025, Boost Parcoursup Jan 2026).
    *   **Segmentation d'Audience :** Distribution volumétrique par domaine d'étude (`domain_distribution` - ex: Commerce représente 18% de la base) et par niveau (`study_level_dist`).
    *   **Mesure d'Efficacité Physique :** Calcul du taux de conversion "Inscrit → Venu" pour les salons physiques (`salon_conversion`, actuellement mesuré à 28.4%).
*   **Logique de Pricing :** Abonnement SaaS annuel. L'accès donne droit de visualisation et d'export (selon la licence) aux données de marché pour orienter les stratégies de communication des écoles.
*   **Profil de Marge :** **70%**. Nécessite l'amortissement du développement front-end et le maintien des pipelines BigQuery en temps réel.