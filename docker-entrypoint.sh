#!/bin/sh
# Applique les migrations Prisma (SQLite dans le volume) puis lance le serveur
# standalone. `migrate deploy` est idempotent → safe à chaque démarrage.
set -e
./node_modules/.bin/prisma migrate deploy
exec node server.js
