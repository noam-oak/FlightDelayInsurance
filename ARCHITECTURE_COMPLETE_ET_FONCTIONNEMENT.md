# Architecture Complète et Fonctionnement Détaillé

Ce document constitue la référence technique exhaustive du projet **Flight Delay Insurance**. Il détaille la stack technologique, l'architecture des smart contracts, le fonctionnement de l'oracle, le cycle de vie des données et les procédures de déploiement et de test.

---

## 1. Stack Technologique

### Blockchain (Layer 1 & Logic)
*   **Langage** : Solidity `^0.8.20`
*   **Framework de Développement** : Hardhat (Compilation, Déploiement, Tests locaux)
*   **Bibliothèques** : OpenZeppelin (AccessControl, ReentrancyGuard)
*   **Réseau** : Hardhat Network (Localhost) pour le développement, compatible EVM.

### Backend (Off-Chain Infrastructure)
*   **Langage** : Python 3.10+
*   **API Framework** : FastAPI (Simulation des données de vol)
*   **Blockchain Interface** : Web3.py (Interaction avec les Smart Contracts)
*   **Processus** : Script Python asynchrone (`watcher.py`) pour le service Oracle.

### Frontend (User Interface)
*   **Framework** : Next.js 14+ (App Router)
*   **Langage** : TypeScript
*   **Styling** : Tailwind CSS + shadcn/ui
*   **Web3 Client** : Ethers.js v6 (Connexion Wallet, Appels RPC)

---

## 2. Architecture des Smart Contracts (`dApp/`)

Le système est conçu autour d'un modèle "Hub & Spoke" où un contrat central gère les fonds et délègue la logique d'assurance à des contrats satellites.

### A. `InsuranceHub.sol` (Le Cœur)
C'est le seul contrat qui détient des fonds (ETH).
*   **Gestion de la Liquidité** :
    *   `reservedWei` : Variable qui suit le montant total *promis* aux assurés actifs.
    *   `balance - reservedWei` : Liquidité *disponible* pour de nouvelles souscriptions.
*   **Sécurité** :
    *   `AccessControl` : Gère les rôles (`DEFAULT_ADMIN_ROLE` pour la config, `ORACLE_ROLE` pour les mises à jour).
    *   `ReentrancyGuard` : Protège contre les attaques de réentrance lors des paiements.
*   **Stockage** :
    *   `_policies` : Mapping de toutes les polices.
    *   `policyIdsByFlightId` : Index inversé permettant de retrouver toutes les polices concernées par un vol spécifique (crucial pour le règlement en masse).

### B. `IInsuranceProduct.sol` (L'Interface)
Définit le standard que tous les produits d'assurance doivent respecter.
*   `premiumWei()` : Le prix de la police.
*   `maxPayoutWei()` : L'indemnisation maximale possible.
*   `evaluatePayout(FlightData)` : Fonction pure qui retourne `(bool eligible, uint256 amount)` en fonction des données du vol.

### C. Les Produits (`contracts/products/`)
*   **`Basic.sol`** : Produit simple. Seuil de retard fixe (ex: 3h), liste de raisons restreinte.
*   **Modulaire** : On peut déployer un `Premium.sol` (seuil 1h, toutes raisons) et l'enregistrer dans le Hub sans modifier le Hub lui-même.

---

## 3. Déploiement et Initialisation

Le dossier `dApp/scripts/` contient la séquence d'initialisation critique.

1.  **`01_deploy_products.ts`** :
    *   Déploie les contrats `Basic`, `Max`, `Plus`.
    *   Récupère leurs adresses.
2.  **`02_deploy_hub.ts`** :
    *   Déploie `InsuranceHub`.
    *   Lui passe l'adresse du compte qui agira comme Oracle (souvent le compte #1 de Hardhat).
3.  **`03_register_products.ts`** :
    *   Appelle `hub.registerProduct(id, address)` pour lier les produits au Hub.
    *   Sans cette étape, le Hub rejette les achats pour ces ID produits.
4.  **`04_seed_pool.ts` (Remplissage de la Pool)** :
    *   **Fonction** : Envoie des ETH (ex: 10 ETH) vers le contrat `InsuranceHub`.
    *   **Pourquoi ?** Le contrat a une sécurité de solvabilité : `if (available < maxPayout) revert InsolventPool()`. Il faut donc de l'argent dans le contrat *avant* de vendre la première police.

---

## 4. Le Backend : Oracle et API (`API/`)

### A. API de Simulation (`main.py`)
Sert de source de vérité (Source of Truth).
*   Stocke l'état des vols dans `flights.json`.
*   Expose des endpoints REST.
*   Le champ clé est `updatedAt` (timestamp). C'est ce champ qui permet à l'Oracle de savoir si une donnée a changé depuis la dernière fois.

### B. Oracle Watcher (`watcher.py`)
C'est un script "daemon" qui tourne en boucle.
1.  **Initialisation** : Charge l'adresse du Hub et la clé privée de l'Oracle (`ORACLE_PRIVATE_KEY`).
2.  **Event Listening** :
    *   Scanne les blocs pour l'événement `PolicyPurchased`.
    *   Extrait `flightNumber` et `arrivalTimestamp`.
    *   Ajoute ce vol à une liste interne `tracked_flights`.
3.  **Polling Loop** :
    *   Pour chaque vol suivi, appelle l'API.
    *   Compare le `updatedAt` de l'API avec le `lastUpdatedAt` stocké sur la Blockchain.
4.  **Transaction** :
    *   Si l'API a une info plus récente, le Watcher construit une transaction appelant `hub.updateFlightStatus()`.
    *   Il signe cette transaction avec la clé privée de l'Oracle (nécessaire car la fonction est protégée par `onlyRole(ORACLE_ROLE)`).

---

## 5. Tests (`dApp/test/`)

Les tests assurent la fiabilité financière du système.
*   **`hub.spec.ts`** :
    *   Teste l'achat (vérifie que `reservedWei` augmente).
    *   Teste la solvabilité (vérifie que l'achat échoue si la pool est vide).
    *   Teste le cycle de vie complet (Achat -> Oracle Update -> Payout).
    *   Vérifie que seul l'Oracle peut mettre à jour les statuts.
*   **`products.spec.ts`** :
    *   Teste la logique métier pure des produits (ex: 179 minutes de retard = 0€, 180 minutes = Payé).

---

## 6. Déroulement détaillé d'une Transaction (Cycle de Vie)

Prenons l'exemple d'Alice qui assure le vol AF123.

### Étape 1 : Achat (On-Chain)
1.  Alice clique "Souscrire" sur le Frontend.
2.  Ethers.js appelle `InsuranceHub.buyPolicy(productId=1, flight="AF123", time=1700000000)`.
3.  Elle envoie 0.003 ETH (la prime).
4.  **Le Hub** :
    *   Encaisse 0.003 ETH.
    *   Vérifie qu'il possède au moins 0.02 ETH (payout max) de libre.
    *   Incrémente `reservedWei` de 0.02 ETH.
    *   Émet l'événement `PolicyPurchased(policyId=101, flight="AF123"...)`.

### Étape 2 : Découverte (Off-Chain)
1.  Le **Watcher** détecte l'événement `PolicyPurchased` dans le bloc N.
2.  Il commence à surveiller "AF123" à "1700000000".

### Étape 3 : Sinistre (Off-Chain -> On-Chain)
1.  Le vol a du retard. Un admin (ou le système réel) met à jour l'API : "Retard 200 min".
2.  Le **Watcher** voit la mise à jour.
3.  Il envoie la transaction `updateFlightStatus(...)` au Hub.
4.  **Le Hub** :
    *   Reçoit les données.
    *   Met à jour le timestamp `lastUpdatedAt` pour ce vol (anti-replay).
    *   Récupère la liste des polices pour ce vol (`policyIdsByFlightId`).
    *   Pour la police d'Alice (#101) :
        *   Appelle `Product.evaluatePayout(...)`.
        *   Le produit répond : "Éligible, payer 0.02 ETH".
        *   Le Hub décrémente `reservedWei` de 0.02 ETH.
        *   Le Hub transfère 0.02 ETH à l'adresse d'Alice.
        *   La police passe en `SETTLED`.

### Étape 4 : Expiration (Si pas de sinistre)
Si le vol était arrivé à l'heure :
1.  L'argent reste bloqué dans `reservedWei` jusqu'à `arrivalTimestamp + 24h`.
2.  Après ce délai, n'importe qui peut appeler `expirePolicy(101)`.
3.  **Le Hub** :
    *   Vérifie le timestamp.
    *   Décrémente `reservedWei` de 0.02 ETH (l'argent redevient "libre" dans la pool globale).
    *   La police passe en `EXPIRED`.
    *   L'assureur conserve la prime de 0.003 ETH.

---

## 7. Commandes Récapitulatives

Pour faire tourner le système complet localement :

**Terminal 1 (Blockchain)**
```bash
cd dApp
npx hardhat node
```

**Terminal 2 (Déploiement & Seed)**
```bash
cd dApp
# Déploie tout et remplit la pool avec 10 ETH
npx hardhat run scripts/01_deploy_products.ts --network localhost
npx hardhat run scripts/02_deploy_hub.ts --network localhost
npx hardhat run scripts/03_register_products.ts --network localhost
npx hardhat run scripts/04_seed_pool.ts --network localhost
```

**Terminal 3 (API)**
```bash
cd API
source .venv/bin/activate
./run_api.sh
```

**Terminal 4 (Oracle)**
```bash
cd API
source .venv/bin/activate
./run_watcher.sh
```

**Terminal 5 (Frontend)**
```bash
cd Web
npm run dev
```
