# Spécifications Produits Data - L'Étudiant (Case #3)

Ce document détaille les deux produits data phares issus de la plateforme, tels qu'implémentés dans la version actuelle du dashboard.

---

## 1. Produit : SaaS "Baromètre Live de l'Orientation"

Ce produit correspond à l'interface de pilotage interactive développée avec React et Recharts.

*   **Client cible** : Directions Marketing des écoles supérieures et Observatoires Régionaux de l'orientation.
*   **Description** : Un dashboard dynamique permettant de visualiser en temps réel les tendances d'intérêt des étudiants par filière et par métropole.
*   **Inputs (sourcés du code `App.jsx`)** :
    *   `trendData` : Flux mensuel des intentions pour les filières Commerce, Ingénierie et Art & Design.
    *   `regionalData` : Volume de requêtes géolocalisées (Paris, Lyon, Marseille, Bordeaux, Lille).
    *   `satisfactionData` : Analyse de sentiment issue des interactions utilisateurs.
*   **Transformations** :
    *   **Agrégation Temporelle** : Transformation des logs bruts en courbes de tendances mensuelles via Recharts.
    *   **Filtrage Dynamique** : Logique de tri par ville via le composant `Header` et le hook `useState`.
    *   **Calcul de Performance** : Génération de l'indicateur "Croissance vs N-1" (+15% en dynamique).
*   **Logique de Pricing** : Abonnement annuel (SaaS) avec frais d'installation (Setup fee). Accès illimité aux données de sa propre zone géographique.
*   **Profil de Marge** : **75%**. Coûts stables liés à l'hébergement Cloud et à la maintenance du front-end React.

---

## 2. Produit : Flux "Premium Leads Qualifiés"

Ce produit est le moteur de revenus directs, basé sur les métriques de conversion affichées en haut du dashboard.

*   **Client cible** : Responsables des admissions en écoles privées, CFA et universités internationales.
*   **Description** : Livraison de listes de prospects (leads) ayant manifesté une intention forte, filtrés par l'algorithme de scoring propriétaire.
*   **Inputs (sourcés du code `App.jsx`)** :
    *   `Total Leads Qualifiés` : Volume de 1 248 profils activables.
    *   `Taux de Conversion` : Performance moyenne de 12.4% affichée en KPI.
    *   `Indice de Confiance` : Score de fiabilité de 88% (issu du composant `ScoreCard`).
*   **Transformations** :
    *   **Lead Scoring** : Algorithme classant les profils de "Froid" à "Très Chaud" (Grade A).
    *   **Nettoyage RGPD** : Filtrage automatique pour ne transmettre que les profils ayant un `optin_commercial` valide.
    *   **Normalisation CRM** : Formatage des données pour une intégration directe dans les outils de vente des clients (Salesforce, Hubspot).
*   **Logique de Pricing** : Coût par Lead (CPL). Facturation au volume avec un tarif dégressif selon la qualité du score (Grade).
*   **Profil de Marge** : **90%**. Produit à très forte rentabilité car totalement automatisé par la pipeline de données.

---

**Note de conformité technique** : Ces deux produits respectent les principes de pseudonymisation détaillés dans le fichier `conformite-rgpd.md`.