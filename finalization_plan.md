# Plan de Finalisation de la Suite de Tokenisation ERC-3643

Ce plan détaille les étapes d'implémentation pour finaliser le projet et assurer une qualité de production.

---

## 📋 Répartition des tâches par phase

### 🛡️ Phase 1 : Qualité, Robustesse & Sécurité
*   **Fuzz Testing (Foundry)** :
    *   Configurer Foundry en parallèle de Hardhat.
    *   Écrire des tests de Fuzzing sur les identités et la conformité pour prouver mathématiquement qu'aucune suite de transferts ne peut aboutir à ce qu'un portefeuille non vérifié possède des jetons.
*   **Analyse Statique Slither** :
    *   Lancer l'outil Slither sur les contrats intelligents et rédiger le rapport de vulnérabilités.
*   **Script de Charge & Gaz** :
    *   Développer un script pour mesurer les transactions par seconde (TPS) et les coûts de gaz (en Gwei) lors des opérations de Mint et transfert.

### 🌐 Phase 2 : Déploiement sur Testnet Public
*   **Pipeline GitHub Actions** :
    *   Créer/mettre à jour un workflow déployant sur Sepolia en utilisant les secrets configurés.
*   **Script Faucet** :
    *   Ajouter un script automatique d'obtention de Sepolia ETH ou d'alerte de balance basse pour le compte Issuer.
*   **Configuration Mode Démo** :
    *   S'assurer que le Dashboard bascule vers un RPC public Sepolia si `NODE_ENV=demo`.

### 📊 Phase 3 : Monitoring & Observabilité
*   **Exporteur Prometheus** :
    *   Ajouter un exportateur Prometheus léger sur le service `indexer` pour suivre la cadence d'indexation et le nombre de clients WebSocket.
*   **Alertes Slack/Discord** :
    *   Envoyer une notification Webhook si le retard d'indexation dépasse 30 secondes.

### 🛠️ Phase 4 : CI, DevEx & Storybook
*   **Formatage & Qualité de code** :
    *   Mettre en place Prettier, ESLint, et Husky pour automatiser la qualité du code avant chaque commit.
*   **Storybook** :
    *   Ajouter une configuration minimale Storybook pour documenter visuellement la table des investisseurs et les fenêtres modales.

### 📖 Phase 5 : Documentation Finale & Pitch
*   **Script de démo en 5 minutes** :
    *   Écrire le `README` racine détaillant le parcours type (`curl /deployToken` ➔ visualisations Dashboard ➔ transfert autorisé/refusé).
*   **Slide unique de Pitch** :
    *   Créer une diapositive textuelle synthétisant le Problème, la Solution, la Stack technique et l'URL de démo.

### ⚖️ Phase 6 : Licences & Notices
*   **Licence GPL-3** :
    *   Valider les implications de la licence GPL-3 et apposer les notices d'utilisation correspondantes.
