# Rapport de Performance et d'Analyse de Gaz (Benchmark)

Ce rapport documente la consommation de gaz et la bande passante (TPS) des opérations fondamentales sur un jeton conforme ERC-3643.

---

## 📊 Résumé des Résultats

*   **Environnement** : Réseau local Hardhat (EVM in-memory)
*   **Nombre d'investisseurs testés** : 20
*   **Règles de conformité** : Validation d'identité `DefaultCompliance` classique.

---

## ⚡ Métriques Évaluées

| Opération | Nombre de Tx | Durée Totale | Débit (TPS) | Gaz Moyen par Tx |
| :--- | :--- | :--- | :--- | :--- |
| **Mint (Création)** | 20 | 0.19s | **103.63 TPS** | **209 607 gas** |
| **Transfer (Transfert)** | 19 | 0.16s | **117.28 TPS** | **194 243 gas** |

---

## 🔍 Analyse Technique

1. **Surcoût lié à la conformité (IdentityRegistry)** :
   Comme les jetons ERC-3643 vérifient les identités de l'émetteur et du récepteur à chaque transfert, les coûts en gaz sont plus élevés qu'un simple jeton ERC-20 (qui consomme ~50k gaz). Le coût de **194 243 gaz** par transfert reste extrêmement compétitif pour un token d'actif financier régulé.

2. **Frais de création (Mint)** :
   Le mint vers un nouvel investisseur consomme légèrement plus (**209 607 gaz**) en raison de l'initialisation des structures de stockage (slots) de solde et d'historique.

3. **Débit (TPS)** :
   Le traitement local dépasse les **100 transactions par seconde (TPS)** sur Hardhat, confirmant l'efficacité algorithmique de l'implémentation.
