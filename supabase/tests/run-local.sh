#!/usr/bin/env bash
# Build a throwaway "landed_test" database on a local Postgres (no Docker),
# apply the Supabase stand-in, every migration, thresholds and seed, then run
# the SQL tests. Usage:  PGHOST=localhost PGPORT=5432 PGUSER=postgres supabase/tests/run-local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

DB=${LANDED_TEST_DB:-landed_test}
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
# Roles are cluster-wide; ignore "already exists" from earlier runs.
"${PSQL[@]}" -d "$DB" -v ON_ERROR_STOP=0 -f supabase/tests/supabase_stub.sql 2>&1 | grep -v 'already exists' || true

for f in supabase/migrations/*.sql; do
  echo "migration: $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
"${PSQL[@]}" -d "$DB" -f supabase/thresholds.sql
echo "seed"
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql

if [ "${SKIP_TESTS:-0}" = "1" ]; then echo "database ready (tests skipped)"; exit 0; fi
for t in supabase/tests/test_*.sql; do
  [ -e "$t" ] || continue
  echo "test: $t"
  "${PSQL[@]}" -d "$DB" -f "$t"
done
echo "all good"
