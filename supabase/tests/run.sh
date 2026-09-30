#!/usr/bin/env bash
# Applies migrations to a scratch database and runs the RLS isolation tests.
# Usage: PGURL=postgresql://postgres@localhost/postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=docupro_test
ADMIN=${PGURL:-"postgresql://postgres@localhost:5432/postgres"}
psql "$ADMIN" -q -c "drop database if exists $DB" -c "create database $DB"
URL="${ADMIN%/*}/$DB"
psql "$URL" -q -v ON_ERROR_STOP=1 -f tests/00_supabase_stub.sql
for f in migrations/*.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$URL" -q -v ON_ERROR_STOP=1 -f tests/rls_isolation.sql
echo "migrations + RLS tests passed"
