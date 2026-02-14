# Logic Calculation Engine (LCE)

Moteur financier audité pour la simulation fiscale et la comptabilité de trésorerie.

## Principes Fondamentaux

### 1. Précision Monétaire (BigInt & Cents)
Tous les calculs monétaires sont effectués en **cents** (entiers) pour éviter les erreurs de virgule flottante IEEE-754.
- Interface : `MoneyCents` (int)
- Taux : `RateBps` (Basis Points, 1% = 100 bps)

### 2. Empreinte Fiscale (Stable Hashing)
Chaque résultat de calcul (`Totals`) inclut un `fiscalHash`.
- **Définition** : Hash déterministe (stableStringify) incluant `year`, `regime`, `engineVersion` et les paramètres fiscaux.
- **Stabilité** : Les clés sont triées récursivement avant le hachage pour garantir la consistance cross-runtime.

### 3. Capability-Based Architecture
L'extensibilité vers de nouveaux régimes (EI, SASU, etc.) repose sur la `Capability Map` (`lib/compta/tax_params/capabilities.ts`).
- Évite les `if/else` dispersés.
- Définit les droits (TVA, Social, IS, IR) par régime.

### 4. Audit & Traçabilité
- **Trace** : Log séquentiel de chaque étape de calcul persisté avec l'opération.
- **Strict Cash Audit** : Mode de calcul (`strictMode: true`) qui ignore le lissage comptable au profit d'une vision 100% flux financiers basée sur les dates d'échéance.
- **Residual Correction** : Utilisation de `distributeCents` pour garantir que `Sum(Monthly) === Annual`.

## Ajout d'un Nouveau Régime (Checklist)
- [ ] Ajouter les paramètres fiscaux dans `lib/compta/tax_params/YYYY.ts`.
- [ ] Déclarer les capacités dans `lib/compta/tax_params/capabilities.ts`.
- [ ] Mettre à jour le dispatcher dans `lib/compta/tax_params/registry.ts`.
- [ ] Ajouter un Golden Test de snapshot dans `lib/compta/tests/fiscal.test.ts`.

## Versioning
- `engineVersion` : Format SemVer. Un changement de logique de calcul DOIT incrémenter la version.
- `fiscalHash` : Change automatiquement si les paramètres d'une année sont modifiés.
