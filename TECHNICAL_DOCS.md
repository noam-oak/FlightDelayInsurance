# Documentation Technique : Flight Delay Insurance dApp

## 1. Vue d'ensemble
Ce projet est une application décentralisée (dApp) d'assurance paramétrique pour les retards de vol. Elle permet aux utilisateurs de souscrire une police d'assurance sur la blockchain qui indemnise automatiquement (sans intervention humaine) en cas de retard de vol confirmé par un oracle.

Le système repose sur trois piliers principaux :
1.  **Smart Contracts (Blockchain)** : Gèrent la logique d'assurance, la trésorerie et les paiements.
2.  **API & Oracle (Backend)** : Simule les données de vol et transmet les informations du monde réel vers la blockchain.
3.  **Interface Utilisateur (Frontend)** : Permet aux utilisateurs d'acheter des polices et de suivre leurs vols.

---

## 2. Architecture du Système

```mermaid
graph TD
    User[Utilisateur] -->|Achète Police| Web[Frontend (Next.js)]
    Web -->|Interaction Contract| Hub[InsuranceHub (Smart Contract)]
    
    subgraph Blockchain
        Hub
        Product[Produit d'Assurance (ex: Basic.sol)]
        Hub -->|Délègue Logique| Product
    end

    subgraph Backend / Oracle
        Watcher[Oracle Watcher (Python)]
        FlightAPI[Flight Simulator API (FastAPI)]
    end

    Watcher -->|Écoute Événements| Hub
    Watcher -->|Polls Status| FlightAPI
    Watcher -->|updateFlightStatus| Hub
```

### Flux de données
1.  **Souscription** : L'utilisateur achète une police via le Frontend. Le contrat `InsuranceHub` émet un événement `PolicyPurchased`.
2.  **Surveillance** : Le service `Oracle Watcher` détecte cet événement et commence à surveiller le vol concerné via la `FlightAPI`.
3.  **Mise à jour** : Si le statut du vol change dans l'API (simulé), le `Watcher` envoie une transaction `updateFlightStatus` au contrat `InsuranceHub`.
4.  **Indemnisation** : Le contrat vérifie les conditions via le produit associé (ex: `Basic.sol`). Si les conditions sont remplies (ex: retard > 3h), le paiement est envoyé automatiquement à l'utilisateur.

---

## 3. Smart Contracts (Solidity)

Les contrats sont situés dans le dossier `dApp/contracts/`.

### `InsuranceHub.sol`
C'est le cœur du système. Il agit comme un gestionnaire de pool de liquidité et de polices.
*   **Rôles** :
    *   `DEFAULT_ADMIN_ROLE` : Peut enregistrer de nouveaux produits.
    *   `ORACLE_ROLE` : Seul ce rôle peut appeler `updateFlightStatus` pour mettre à jour les données de vol.
*   **Fonctionnalités clés** :
    *   `buyPolicy` : L'utilisateur paie une prime (Premium) pour couvrir un vol spécifique. Le contrat réserve immédiatement le montant maximum de l'indemnisation (`reservedWei`) pour garantir la solvabilité.
    *   `updateFlightStatus` : Appelée par l'oracle. Met à jour le statut du vol, la raison et le retard. Déclenche automatiquement le remboursement (`settlePolicy`) si éligible.
    *   `expirePolicy` : Libère les fonds réservés si le vol est arrivé sans incident et que la période de couverture est terminée.

### Produits d'Assurance (`contracts/products/`)
Le système est modulaire. Chaque produit est un contrat séparé implémentant `IInsuranceProduct`.
*   **Exemple : `Basic.sol`**
    *   **Coût** : 0.003 ETH
    *   **Indemnisation Max** : 0.02 ETH
    *   **Conditions** :
        *   Retard ≥ 180 minutes.
        *   Raison du retard incluse dans la liste couverte (Technique, Opérationnel, Équipage).

---

## 4. Oracle & Backend (Python)

Le backend est situé dans le dossier `API/`. Il est composé de deux services distincts.

### `main.py` (Flight Simulator API)
Une API REST construite avec **FastAPI** qui simule un système de gestion de vols réel.
*   Permet de créer, lire et mettre à jour des vols (retard, annulation, etc.).
*   Sert de "source de vérité" pour l'oracle.

### `watcher.py` (Oracle Watcher)
Un service démon qui fait le pont entre l'API et la Blockchain.
1.  **Découverte** : Écoute les logs `PolicyPurchased` sur la blockchain pour identifier les vols à surveiller.
2.  **Polling** : Interroge régulièrement l'API pour obtenir le dernier statut de ces vols.
3.  **Push** : Si une mise à jour est détectée (basée sur un timestamp `updatedAt`), il signe et envoie une transaction vers le smart contract `InsuranceHub`.

---

## 5. Interface Utilisateur (Web)

Le frontend est une application **Next.js** située dans le dossier `Web/`.
*   **Tech Stack** : React, Tailwind CSS, shadcn/ui, ethers.js.
*   **Fonctionnalités** :
    *   **Recherche de vol** : Interface pour trouver un vol (connectée à l'API de simulation).
    *   **Achat** : Interaction avec MetaMask pour appeler `buyPolicy`.
    *   **Tableau de bord** : Pour voir ses polices actives et leur statut.
    *   **Admin** : Interface pour simuler des retards sur les vols via l'API (pour tester le système).

---

## 6. Installation et Démarrage

### Prérequis
*   Node.js & npm/pnpm
*   Python 3.10+
*   Un nœud Ethereum local (Hardhat)

### Étapes
1.  **Démarrer la Blockchain locale**
    ```bash
    cd dApp
    npx hardhat node
    ```

2.  **Déployer les contrats**
    ```bash
    cd dApp
    npx hardhat run scripts/01_deploy_products.ts --network localhost
    npx hardhat run scripts/02_deploy_hub.ts --network localhost
    ```

3.  **Démarrer l'API de simulation**
    ```bash
    cd API
    pip install -r requirements.txt
    ./run_api.sh
    ```

4.  **Démarrer l'Oracle Watcher**
    ```bash
    cd API
    ./run_watcher.sh
    ```

5.  **Lancer le Frontend**
    ```bash
    cd Web
    npm install
    npm run dev
    ```
