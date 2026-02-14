# Procédure de Mise à Jour Annuelle des Barèmes

Cette procédure doit être exécutée chaque année dès la publication de la Loi de Finances (PLF).

## ⏳ Temps estimé : 15 minutes

## 1. Création des Constantes (barèmes.ts)
1.  Dupliquer `IR_XXXX` et renommer en `IR_YYYY` (Année N+1).
2.  Mettre à jour les tranches (min/max) avec les nouveaux seuils.
3.  Vérifier les seuils de décote (Célibataire / Couple).
4.  Ajouter `MICRO_SOCIAL_RATES_YYYY` si les taux micro changent.

## 2. Mise à Jour des Profils
1.  Dans `calculIR.ts`, mettre à jour la valeur par défaut de `bareme` vers la nouvelle constante.
2.  Dans `profiles/MicroBNC.ts` et `EIReelBNC.ts`, pointer vers les nouveaux taux sociaux si nécessaire.

## 3. Calibration (EI Réel)
Si les taux de cotisations URSSAF/CIPAV changent significativement :
1.  Mettre à jour `EI_BNC_RATES_YYYY`.
2.  Ajuster `taux_urssaf_cible` (Approx mode) pour qu'il reflète la moyenne observée (généralement ~40-45%).

## 4. Validation
1.  Lancer la suite de tests complète :
    ```bash
    npx vitest run core/fiscalEngine/tests/
    ```
2.  Vérifier que les "Golden Tests" passent toujours (ou ajuster les attentes si la fiscalité a changé drastiquement).
3.  Vérifier la convergence du solveur (si modifié).

## 5. Release
1.  Commiter : `feat(fiscal): update barèmes YYYY`
2.  Mettre à jour ce fichier si de nouvelles étapes sont requises.
