#!/usr/bin/env bash
# Build command for Vercel (see vercel.json). Prepares the database, then builds.
#  - migrations and the idempotent seed run on every deploy (they never touch your progress);
#  - the problem bank is refreshed from its public sources unless BANK_IMPORT_ON_BUILD=false;
#    a failed import does not fail the deploy.
set -euo pipefail

npm run db:migrate
npm run db:seed
if [ "${BANK_IMPORT_ON_BUILD:-true}" = "true" ]; then
  npm run bank:import -- --sources "${TMPDIR:-/tmp}/interviewos-sources" \
    || echo "[build] problem bank import failed; deploying with the existing bank"
fi
npx next build
