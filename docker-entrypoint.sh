#!/bin/sh
# Applique les migrations Prisma (SQLite dans le volume) puis lance le serveur
# standalone. Le runner est idempotent, donc sûr à chaque démarrage.
set -e
node scripts/apply-migrations.js
exec node server.js
