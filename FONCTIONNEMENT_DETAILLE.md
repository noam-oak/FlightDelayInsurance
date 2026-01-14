# Fonctionnement Détaillé du Projet : Qui fait Quoi et Quand ?

Ce document décrit le cycle de vie complet d'une police d'assurance dans notre système, en détaillant le rôle précis de chaque composant à chaque étape.

---

## Phase 1 : L'Initialisation (Avant l'arrivée de l'utilisateur)

Avant que quiconque ne puisse acheter une assurance, le système doit être prêt.

1.  **Le Développeur (Admin)** :
    *   **Action** : Déploie le contrat principal (`InsuranceHub`) et les contrats de produits (`Basic`, `Premium`) sur la Blockchain.
    *   **But** : Mettre en place les règles du jeu immuables.
2.  **L'Investisseur (ou Admin)** :
    *   **Action** : Dépose de l'argent (ETH) dans le contrat `InsuranceHub`.
    *   **But** : Créer la "Pool de Liquidité". C'est cet argent qui servira à payer les futures indemnisations. Sans cela, le contrat refuse de vendre des polices.
3.  **L'API de Vol (Flight API)** :
    *   **Action** : Démarre et génère des vols fictifs (ex: Vol AF123 prévu à 14h00).
    *   **But** : Simuler la réalité des aéroports pour que le système ait des données à traiter.

---

## Phase 2 : La Souscription (L'Utilisateur entre en jeu)

C'est ici que l'interaction commence.

1.  **L'Utilisateur** :
    *   **Action** : Se connecte au site web (Frontend) avec son portefeuille (Wallet). Il cherche un vol et clique sur "Souscrire".
    *   **But** : Se protéger contre un retard.
2.  **Le Site Web (Frontend)** :
    *   **Action** : Prépare la transaction et demande à l'utilisateur de signer.
    *   **But** : Faciliter la communication technique avec la Blockchain.
3.  **Le Smart Contract (InsuranceHub)** :
    *   **Action** : Reçoit le paiement de l'utilisateur (la prime).
    *   **Vérification** : Il regarde s'il a assez d'argent dans la Pool pour payer le montant *maximum* promis.
    *   **Réservation** : Si oui, il déplace l'argent de la Pool vers une case "Réservé" (pour garantir que l'utilisateur sera payé quoi qu'il arrive).
    *   **Émission** : Il crée la police numérique et crie publiquement (événement `PolicyPurchased`) : *"Hey ! Une nouvelle assurance a été créée pour le vol AF123 !"*

---

## Phase 3 : La Surveillance (La magie invisible)

Pendant que l'utilisateur attend son avion, le système travaille tout seul.

1.  **L'Oracle Watcher** (Script Python) :
    *   **Action** : Il écoute en permanence la Blockchain. Il entend le cri du Smart Contract (`PolicyPurchased`).
    *   **Réaction** : Il ajoute le vol AF123 à sa liste de surveillance.
2.  **L'Oracle Watcher** (boucle continue) :
    *   **Action** : Toutes les X secondes, il demande à l'**API de Vol** : *"Quel est le statut du vol AF123 ?"*
    *   **But** : Faire le pont entre le monde réel (API) et la Blockchain.

---

## Phase 4 : Le Dénouement (Deux issues possibles)

Le vol a lieu. L'API de Vol met à jour ses données (soit "À l'heure", soit "En retard").

### Cas A : Le vol est en retard (Le sinistre)

1.  **L'API de Vol** : Indique "Retard de 200 minutes".
2.  **L'Oracle Watcher** :
    *   Détecte ce changement.
    *   Envoie une transaction au **Smart Contract** : *"Mise à jour pour AF123 : Retard 200 min, Raison Technique"*.
3.  **Le Smart Contract (InsuranceHub)** :
    *   Reçoit l'info.
    *   Interroge le contrat du **Produit** (`Basic.sol`) : *"Est-ce que 200 min de retard technique, ça mérite remboursement ?"*
    *   **Produit** : *"Oui, c'est > 180 min."*
    *   **Paiement** : Le Hub prend l'argent "Réservé" et l'envoie directement sur le portefeuille de l'utilisateur.
    *   **Clôture** : La police passe au statut `SETTLED` (Réglée).

### Cas B : Le vol est à l'heure (Pas de sinistre)

1.  **L'API de Vol** : Indique "Arrivé".
2.  **Le Smart Contract** :
    *   L'argent reste "Réservé" jusqu'à la fin de la période de couverture (ex: 24h après l'arrivée).
3.  **N'importe qui (souvent un script de nettoyage)** :
    *   **Action** : Appelle la fonction `expirePolicy`.
    *   **Réaction du Contrat** : Il voit que la date est passée et qu'aucun retard n'a été signalé.
    *   **Libération** : Il prend l'argent "Réservé" et le remet dans la "Pool de Liquidité" commune. L'assureur a gagné la prime.
    *   **Clôture** : La police passe au statut `EXPIRED`.

---

## Résumé des Rôles

| Acteur | Rôle | Analogie |
| :--- | :--- | :--- |
| **Smart Contract** | Banquier & Juge | Le coffre-fort automatique qui applique la loi. |
| **Oracle Watcher** | Détective | Celui qui observe le monde et rapporte les faits au juge. |
| **Flight API** | La Réalité | L'aéroport qui affiche les panneaux d'affichage. |
| **Frontend** | Guichet | L'interface jolie pour parler au robot. |
| **Utilisateur** | Client | Celui qui veut être protégé. |
