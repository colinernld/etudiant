# Note de Conformité RGPD - Projet L'Étudiant

**Projet :** L'Étudiant B2B Data Monetisation | Case #3  

---

## 1. Principes Fondamentaux de Traitement
Le traitement des données repose sur trois piliers :
* **Légalité et Transparence** : Information claire lors de la collecte sur letudiant.fr.
* **Minimisation** : Collecte limitée aux données d'orientation (niveau scolaire, intérêts).
* **Limitation des Finalités** : Usage exclusif pour l'orientation et la mise en relation partenaire.

## 2. Gestion du Consentement (Opt-in)
Le pipeline BigQuery (`letudiant-data-prod.Hacka_g24`) intègre des filtres de consentement :
- `optin_commercial_actuel` : Obligatoire pour l'envoi de leads aux écoles.
- `optin_letudiant_actuel` : Pour les communications éditoriales.
- `optin_tel_actuel` : Pour le démarchage téléphonique.

> **Action Technique** : Toute extraction de Lead Scoring Grade A/B applique `WHERE optin_commercial_actuel = 'OUI'`.

## 3. Anonymisation et Sécurisation
### Pseudonymisation
Les identifiants directs (Noms/Prénoms) sont isolés. La clé de liaison est le `id_Inscrit_site`, permettant des analyses sans exposer l'identité civile.

### Agrégation
Les données du "Baromètre" sont agrégées par zone géographique. Aucun profil individuel n'est identifiable dans le dashboard live.

## 4. Conservation et Droits des Personnes

| Type de Donnée | Conservation | Action de Fin |
| :--- | :--- | :--- |
| Logs Chatbot ORI | 24 mois | Anonymisation |
| Profils Inscrits | 3 ans après scolarité | Suppression |
| Scores de Lead | 90 jours | Recalcul/Suppression |

### Droit à l'oubli
Les demandes de suppression CRM sont propagées vers BigQuery sous 30 jours.

## 5. Choix Stratégique : Build vs Partner
Le choix du **Build** pour le moteur de scoring réduit la fuite de données vers des tiers et renforce la souveraineté sur les données comportementales des mineurs.
