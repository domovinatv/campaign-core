#!/usr/bin/env bash
# Snimka stupaca pinka_finance iz žive baze → contract/pinka-columns.json.
# Samo čita (information_schema). Treba domovina-api s .local-secrets.env
# (SSH na Coolify host, vidi domovina-api/scripts/db-psql.sh).
#
#   DOMOVINA_API=~/git/domovinatv/domovina-api ./scripts/snapshot-pinka.sh
set -eo pipefail
API="${DOMOVINA_API:-$HOME/git/domovinatv/domovina-api}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/contract/pinka-columns.json"
cd "$API"
. scripts/lib/db-env.sh
C=$(detect_db_container)
SQL="select json_build_object('captured_at', to_char(now() at time zone 'utc','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'), 'schema','pinka_finance', 'tables', (select json_object_agg(table_name, cols order by table_name) from (select table_name, json_agg(json_build_object('name',column_name,'type',udt_name,'nullable',is_nullable='YES') order by ordinal_position) cols from information_schema.columns where table_schema='pinka_finance' and table_name in (select table_name from information_schema.tables where table_schema='pinka_finance' and table_type='BASE TABLE') group by table_name) t))"
echo "$SQL" | ssh "${SSH_OPTS[@]}" "$COOLIFY_SSH_HOST" "docker exec -i $C psql -X -At -U $COOLIFY_DB_USER -d $COOLIFY_DB_NAME -v ON_ERROR_STOP=1 -f -" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(s),null,2)+"\n"))' > "$OUT"
echo "→ $OUT"
