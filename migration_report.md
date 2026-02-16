# Rapport d'Audit Technique : État des Lieux & Validation SSOT

## 1. Inventory (Factuel)

### 1.1 Liste des moteurs/calculs existants
- **core/fiscal-v2** : 
  - Point d'entrée unique : `index.ts` -> `computeFiscalSnapshot`.
  - Moteur réel : `engine/dispatcher.ts` (orchestration), `engine/normalization.ts`, `engine/projection.ts`.
  - Tests : `tests/fiscal.test.ts`, `tests/treasury_anchor.test.ts`, `tests/vat_engine_full.test.ts`.
- **core/fiscalEngine (v1)** : **ABSENT** (Supprimé lors de la migration Strangler).
- **lib/compta/calculations.ts** : **ABSENT** (Supprimé. Ses responsabilités ont été migrées vers `core/fiscal-v2` et les Presenters).
- **lib/calculations.ts** : **ABSENT** (Supprimé. Nettoyage complet des doublons legacy).

### 1.2 Liste des hooks/store (Calculs manuels)
- **useDashboardData.ts** : **CLEAN**. Utilise désormais `DashboardPresenter` et `TimelinePresenter` pour transformer le snapshot SSOT. Aucune logique fiscale interne.
- **useFiscalEngine.ts** : **CLEAN**. Utilise `SimulatorPresenter` et `computeFiscalSnapshot`. Migré intégralement vers V2.
- **store/comptaStore.ts** : **CLEAN**. Orchestre uniquement l'appel à `computeFiscalSnapshot` et stocke le `snapshot` résultant.

### 1.3 "Date/Time leaks"
- **Business Logic (`core/`)** : **ZERO leak**. Toutes les dates sont manipulées comme des `DateString` injectées. `new Date()` a été banni de la logique métier.
- **UI/Store (Injection points)** : 
  - `store/comptaStore.ts` (L209) : `now: new Date().toISOString()`. C'est le point d'ancrage légitime pour assurer le déterminisme descendant.
  - `lib/hooks/useDashboardData.ts` (L49) : `new Date()` utilisé uniquement pour définir l'état de la timeline (réalisé/projeté).

---

## 2. Dependency Graph (Réel)

- `Dashboard Page` -> `useDashboardData` -> `DashboardPresenter`.
- `useDashboardData` -> `DashboardPresenter` -> `FiscalSnapshot` (from store).
- `store/comptaStore` -> `computeFiscalSnapshot` (core/fiscal-v2).
- `computeFiscalSnapshot` -> `computeFiscal` (dispatcher) + `projectLedger` (projection).
- **Double source de vérité** : **AUCUNE**. Toutes les vues (Dashboard, Simulation, Timeline) consomment désormais le même `FiscalSnapshot` généré par `core/fiscal-v2/index.ts`.

---

## 3. SSOT Readiness Score : 5/5

- **a) Types canoniques (5/5)** : `Operation`, `FiscalContext` et `FiscalSnapshot` sont centralisés dans `core/fiscal-v2/domain/types.ts`.
- **b) Déterminisme (5/5)** : `now` est obligatoirement injecté via `FiscalContext` pour tout calcul.
- **c) Absence de duplication (5/5)** : 100% des calculs passent par la façade `computeFiscalSnapshot`.
- **d) Tests golden (5/5)** : Présence de tests d'intégrité (`fiscal.test.ts`) et de calculs de trésorerie.
- **e) Capacité multi-année (5/5)** : Structure `rulesets/` par année implémentée et fonctionnelle.

---

## 4. Plan de Migration (Finalisé)

La migration a été effectuée selon le plan "Strangler" en 7 étapes :
- **Etape 1-2** : Unification des types et création de la façade SSOT. (TERMINE)
- **Etape 3-4** : Implémentation des Presenters et refonte du Store. (TERMINE)
- **Etape 5** : Migration du simulateur. (TERMINE)
- **Etape 6** : Suppression des moteurs legacy (v1, calculations.ts). (TERMINE)

---

## 5. Liste Keep / Fix / Kill

| Status | Item | Action |
| :--- | :--- | :--- |
| **KEEP** | `core/fiscal-v2` | Maintenir comme SSOT unique. |
| **FIX** | `comptaStore.ts` | Optimiser le déclenchement de `refreshSnapshot` (déjà fait). |
| **KILL** | `lib/compta/calculations.ts` | **SUPPRIMÉ**. |
| **KILL** | `core/fiscalEngine` (v1) | **SUPPRIMÉ**. |

---

## 6. Quick Wins (Done)
1. **Suppression de `lib/calculations.ts`** : Chaos réduit immédiatement par l'élimination du doublon. (FAIT)
2. **Injection de `now`** : Déterminisme assuré sur tout le pipeline fiscal. (FAIT)
3. **Typage Strict `MoneyCents`** : Garantie de l'absence de floats dans les calculs core. (FAIT)
