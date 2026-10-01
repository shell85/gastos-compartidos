#!/usr/bin/env bash
set -euo pipefail

trap 'npx supabase stop >/dev/null 2>&1 || true' EXIT

npx supabase start
npx supabase db reset
npx supabase test db
npm test
npm run build
node scripts/test-supabase-concurrency.mjs
npx supabase db lint

echo "PASS: validación local completa."
