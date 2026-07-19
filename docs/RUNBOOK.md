# Runbook Critiquest — convention 14–16 août 2026

Objectif : **déployer ou rollback en < 2 min** pendant l'évènement (hotfix only).

## Infra (serveur « lepaladin », cf. `~/docker/CLAUDE.md` sur le serveur)

- **Domaine** : `rpgers.paladin.ovh` (remplace le clone 2025) — Traefik + Let's Encrypt.
- **Image** : `registry.paladin.ovh/rpgers-2026` (registry privé).
- **Service** : `~/docker/compose/websites/rpgers.paladin.ovh.yml` (modèle : `deploy/rpgers.paladin.ovh.yml` de ce repo).
- **Données** : SQLite dans le volume `rpgers_2026_data` (favoris, presets, annuaire — les tablées vivent chez l'officiel).
- **Mise à jour auto** : watchtower HTTP API (`wt.paladin.ovh`), déclenché par la CI.

## Déployer une nouvelle version (chemin normal)

```bash
git tag v0.2.0 && git push origin v0.2.0
```

La GitHub Action `Deploy` : validate (biome+tsc+vitest) → build & push
`registry.paladin.ovh/rpgers-2026:{version,latest}` → trigger watchtower →
le conteneur est recréé sur `:latest`. Les migrations Prisma s'appliquent au
démarrage (`docker-entrypoint.sh` → `prisma migrate deploy`, idempotent).

## Rollback (< 2 min)

Chaque version est aussi taggée en semver sur le registry :

```bash
ssh lepaladin
cd ~/docker
# pointer temporairement l'image sur la version précédente
sed -i 's|rpgers-2026:latest|rpgers-2026:0.1.0|' compose/websites/rpgers.paladin.ovh.yml
docker compose pull rpgers && docker compose up -d rpgers --force-recreate
```

(Revenir à `:latest` au prochain déploiement sain.)

⚠️ Nos migrations sont additives (nouvelles tables uniquement) → un rollback
de code reste compatible avec la DB. Ne jamais éditer une migration déployée.

## Premier déploiement (une fois)

```bash
# 1. pousser un tag → la CI publie l'image sur le registry
# 2. sur le serveur :
ssh lepaladin
cp <ce repo>/deploy/rpgers.paladin.ovh.yml ~/docker/compose/websites/rpgers.paladin.ovh.yml
# renseigner SESSION_SECRET (openssl rand -hex 32) dans le fichier
cd ~/docker && docker compose pull rpgers && docker compose up -d rpgers --force-recreate
```

## Vérifier que ça tourne

```bash
ssh lepaladin "docker logs rpgers --tail 20"   # « Ready » attendu
curl -sI https://rpgers.paladin.ovh/login | head -1   # HTTP 200 attendu
```

Parcours de sanité (30 s) : login → liste des tablées → une fiche →
« Mes Parties ». Monitoring : `dozzle.paladin.ovh` (logs), `glances.paladin.ovh`.

## Pannes connues et parades

| Symptôme | Cause probable | Parade |
|---|---|---|
| Liste vide + message « grimoire doit être mis à jour » | L'officiel a changé son schéma | `docker logs rpgers` (SchemaError + chemin), corriger le schéma Zod, tag + push |
| 502/timeout sur toutes les pages | API officielle down ou wifi de salle | Rien à faire côté clone : ça revient avec l'officiel |
| Sessions perdues après redéploiement | `SESSION_SECRET` changé | Ne jamais régénérer le secret du compose serveur |
| DB corrompue / repartir de zéro | SQLite dans le volume | `docker volume rm rpgers_2026_data` (perd favoris/presets/annuaire uniquement) |
| CI verte mais site pas à jour | watchtower n'a pas recréé | `ssh lepaladin "cd ~/docker && docker compose pull rpgers && docker compose up -d rpgers --force-recreate"` |

## Sauvegarde express avant l'évènement

```bash
ssh lepaladin "docker run --rm -v rpgers_2026_data:/data -v /tmp:/backup alpine \
  cp /data/prod.db /backup/rpgers-$(date +%Y%m%d).db"
```
