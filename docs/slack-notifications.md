# Notifications Slack RPGers

## Principe éditorial

La description appartient au MJ. Elle est publiée intégralement, sans correction,
résumé ni réécriture. L'enrichissement généré est identifié comme un contenu
additionnel : accroche, public susceptible d'apprécier la table et ambiance.

Les informations factuelles viennent exclusivement de l'API RPGers : horaire,
durée, places publiques, public, accessibilité, contenus signalés et salle. Un
LLM ne peut pas les remplacer.

## Répartition des responsabilités

- Le domaine décide des places, avertissements et cas Milo certains.
- Perplexity documente le système de jeu, sauf pour les créations originales.
- Gemini rédige uniquement l'accroche, le profil de joueurs et l'ambiance.
- Le code choisit la source selon un classement déterministe.
- Une recherche de jeu est conservée 30 jours par défaut.
- Toute API externe possède un repli déterministe.

## Évaluation

`npm run eval:slack` prépare sans les envoyer jusqu'à sept notifications
représentatives : adulte, enfant, création originale, débutants, description
longue, dernière place et cas général.

Pour chaque aperçu, vérifier :

1. La description du MJ est complète et inchangée.
2. L'accroche reste fidèle et n'ajoute aucun fait.
3. Le lecteur comprend immédiatement les places et le public.
4. Les contenus sensibles sont visibles avant l'appel à l'action.
5. La recommandation Milo est prudente et cohérente avec les labels.
6. Une création originale n'est pas confondue avec un jeu publié.
7. La notification reste concise et utile sur téléphone.
