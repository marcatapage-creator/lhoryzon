# Fiscal Rules & Conventions

## 1. Unités & Précision
**Règle d'Or : Tout est en centimes d'euros (Integer).**

-   Toutes les entrées (CA, Charges) sont en `number` (centimes).
-   Tous les calculs intermédiaires (`base_imposable` * `taux`) doivent être arrondis immédiatement via `Math.round()` ou `Math.floor()` selon la règle fiscale spécifique.
-   Aucun `float` ne doit persister au delà d'une opération atomique.

## 2. Cash Basis
Le moteur fonctionne exclusivement en **Comptabilité de Trésorerie (Cash Basis)**.
-   **Revenu** = Sommes *encaissées* sur l'année civile.
-   **Dépenses** = Sommes *décaisées* sur l'année civile.
-   **Charges Sociales** = Cotisations *payées* en N (incluant régularisations N-1 et acomptes N).

*Note explicite : Les calculs sont basés sur les flux encaissés/décaissés et non sur la comptabilité d’engagement.*

## 3. Barèmes & Versioning
Les constantes fiscales sont stockées dans `core/fiscalEngine/barèmes.ts`.
-   **IR** : `IR_YYYY` (ex: `IR_2026` pour les revenus 2025).
-   **Micro-Social** : `MICRO_SOCIAL_RATES_YYYY`.
-   **EI Réel** : `EI_BNC_RATES_YYYY`.

⚠️ **Ne jamais modifier les constantes d'une année passée.** Créez une nouvelle constante pour la nouvelle année.

## 4. Modes de Calcul (EI Réel)

### Définitions Strictes (Périmètre V1)
-   **Résultat Professionnel (Cash Basis)** = `CA Encaissé TTC` - `Dépenses Payées TTC/HT` (selon règles TVA) - `Charges Sociales Payées`.
-   **Assiette Sociale (Base)** = `Résultat Professionnel` + `Cotisations Sociales Facultatives` + `CSG/CRDS Non Déductible`. 
    -   *Note V1* : En mode Approx, on applique le taux sur le `Résultat Comptable avant Impôt` (approximation standard).
-   **Cotisations Déductibles** :
    -   Oui, les cotisations sociales sont déductibles du résultat fiscal (sauf CSG Non Déductible).
    -   Cela réduit la base imposable IR et donc le TMI.

Le profil EI Réel supporte deux modes pour l'assiette sociale :
1.  **Approx (Défaut)** : Utilise un taux cible calibré (ex: 42%) sur le résultat. Rapide et stable.
    -   Défini par année dans `EI_BNC_RATES_YYYY.taux_urssaf_cible`.
2.  **Iteratif** : Utilise un solveur pour trouver le montant exact des cotisations `C` tel que `Cotisations(Resultat - C) = C`.
    -   Max itérations : 30.
    -   Tolérance : 100 centimes (1€).
    -   Bornes de sécurité : `[0, 60% du résultat]`. Falls back to Approx if divergent.

## 5. Invariants de Sécurité
Chaque modification du moteur doit valider :
-   `Restant à Vivre <= CA Encaissé`
-   `Ajout Dépense Non Déductible` => Baisse du `Restant à Vivre` d'un montant égal.
