#!/usr/bin/env bash
# API smoke tests for the demo flow.
# By default it boots its own server on a throwaway, freshly seeded database in a
# temp dir, so database.sqlite is never touched. Set BASE to test a running
# server instead (that server's database must be freshly seeded).
set -u
JAR=$(mktemp -d)
H='Content-Type: application/json'
PASS=0; FAIL=0
SERVER_PID=

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  rm -rf "$JAR"
}
trap cleanup EXIT

if [ -z "${BASE:-}" ]; then
  PORT=${SMOKE_PORT:-3999}
  BASE=http://localhost:$PORT
  cd "$(dirname "$0")/.."
  if curl -s -o /dev/null "$BASE"; then
    echo "Port $PORT is already in use; set SMOKE_PORT to another port"; exit 1
  fi
  # Single process (no npx wrapper) so the kill in cleanup really stops it
  DB_PATH="$JAR/test.sqlite" PORT=$PORT node --import tsx server.ts >"$JAR/server.log" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 40); do curl -s -o /dev/null "$BASE/api/public/events" && break; sleep 0.25; done
  echo "Test server on $BASE (temporary database)"
fi

check() { # description expected actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FAIL $1 (expected $2, got $3)"; fi
}
req() { # jar method path [body] -> prints status code, body in $JAR/last
  if [ $# -ge 4 ]; then
    curl -s -o "$JAR/last" -w '%{http_code}' -b "$JAR/$1" -c "$JAR/$1" -X "$2" "$BASE$3" -H "$H" -d "$4"
  else
    curl -s -o "$JAR/last" -w '%{http_code}' -b "$JAR/$1" -c "$JAR/$1" -X "$2" "$BASE$3"
  fi
}
json() { node -e "const b=require('fs').readFileSync('$JAR/last','utf8');const o=JSON.parse(b);console.log($1)"; }

ev() { # title start end [extra json] -> event body
  printf '{"title":"%s","start_time":"%s","end_time":"%s",%s%s}' "$1" "$2" "$3" "$BODY" "${4:-}"
}
login() { req "$1" POST /api/auth/login "$(printf '{"email":"%s","password":"%s"}' "$2" "$3")"; }

echo "Auth and permissions"
check "invalid login rejected" 401 "$(login anon admin@univille.br wrong)"
check "unauthenticated /api/events" 401 "$(req anon GET /api/events)"
check "requester login" 200 "$(login sol solicitante@univille.br sol123)"
check "admin login" 200 "$(login adm admin@univille.br admin123)"
check "requester blocked from admin route" 403 "$(req sol GET /api/events/counts)"
check "requester cannot approve" 403 "$(req sol PUT /api/events/1/approve)"

echo "State machine and conflicts"
# Seeded "Palestra Noturna" is APROVADO in the auditorium 19:00-20:00, seven days from today
DATE=$(node -e "const d=new Date();d.setDate(d.getDate()+7);console.log(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))")
BODY='"theme_id":1,"course_id":1,"location_id":1,"event_date":"'$DATE'","requester_name":"Smoke","target_audience":"Todos","justification":"x","objective":"x","resource_ids":[1]'

check "client status APROVADO ignored" 201 "$(req sol POST /api/events "$(ev 'SMOKE bypass' 08:00 09:00 ',"status":"APROVADO"')")"
check "  stored as RASCUNHO" RASCUNHO "$(json o.status)"
check "overlap blocked on submit" 409 "$(req sol POST /api/events "$(ev 'SMOKE overlap' 19:30 21:00 ',"submit":true')")"
check "  conflict names the event" true "$(json "o.conflict.start_time==='19:00'")"
check "adjacent slot allowed" 201 "$(req sol POST /api/events "$(ev 'SMOKE adjacent' 20:00 21:00 ',"submit":true')")"
ADJ=$(json o.id)
check "missing required fields on submit" 400 "$(req sol POST /api/events '{"title":"SMOKE incomplete","submit":true}')"
check "incomplete draft allowed" 201 "$(req sol POST /api/events '{"title":"SMOKE draft"}')"
DRAFT=$(json o.id)
check "resource outside location rejected" 400 "$(req sol POST /api/events "$(ev 'SMOKE res' 08:00 09:00 ',"resource_ids":[6]')")"
check "reject without reason" 400 "$(req adm PUT /api/events/$ADJ/reject '{"rejection_reason":"  "}')"
check "approve pending" 200 "$(req adm PUT /api/events/$ADJ/approve)"
check "approved shows in public portal" 200 "$(req anon GET /api/public/events)"
check "  contains approved event" true "$(json "o.some(e=>e.id===$ADJ)")"
check "requester cannot edit approved" 403 "$(req sol PUT /api/events/$ADJ "$(ev 'SMOKE hack' 20:00 21:00)")"
check "requester cannot cancel approved" 403 "$(req sol PUT /api/events/$ADJ/cancel)"
check "admin edit approved into overlap blocked" 409 "$(req adm PUT /api/events/$ADJ "$(ev 'SMOKE adjacent' 19:30 21:00)")"
check "admin edits approved" 200 "$(req adm PUT /api/events/$ADJ "$(ev 'SMOKE adjacent' 20:00 21:00 ',"speaker":"Novo"')")"
check "admin cancels approved" 200 "$(req adm PUT /api/events/$ADJ/cancel)"
req anon GET /api/public/events >/dev/null
check "  cancelled leaves public portal" false "$(json "o.some(e=>e.id===$ADJ)")"
req adm GET /api/events/$ADJ >/dev/null
check "audit trail recorded" "CRIADO,ENVIADO,APROVADO,EDITADO,CANCELADO" "$(json "o.audit.map(a=>a.action).join()")"
check "requester deletes own draft" 200 "$(req sol DELETE /api/events/$DRAFT)"

echo "Catalog CRUD"
check "requester blocked from catalog" 403 "$(req sol GET /api/admin/users)"
check "admin lists users" 200 "$(req adm GET /api/admin/users)"
check "  password hash never exposed" false "$(json "o.some(u=>'password_hash' in u)")"
check "new user needs password" 400 "$(req adm POST /api/admin/users '{"name":"Smoke User","email":"smoke@univille.br","role":"SOLICITANTE"}')"
check "admin creates user" 201 "$(req adm POST /api/admin/users '{"name":"Smoke User","email":"Smoke@univille.br","role":"SOLICITANTE","password":"smoke123"}')"
NEWUSER=$(json o.id)
check "duplicate e-mail rejected" 409 "$(req adm POST /api/admin/users '{"name":"Other","email":"smoke@univille.br","role":"ADMIN","password":"smoke123"}')"
check "invalid role rejected" 400 "$(req adm POST /api/admin/users '{"name":"Other","email":"x@univille.br","role":"ROOT","password":"smoke123"}')"
check "created user can log in" 200 "$(login newu smoke@univille.br smoke123)"
check "admin resets user password" 200 "$(req adm PUT /api/admin/users/$NEWUSER '{"name":"Smoke User","email":"smoke@univille.br","role":"SOLICITANTE","password":"nova1234"}')"
check "  new password works" 200 "$(login newu smoke@univille.br nova1234)"
check "admin cannot delete self" 409 "$(req adm DELETE /api/admin/users/1)"
check "unused user removed" 200 "$(req adm DELETE /api/admin/users/$NEWUSER)"

check "admin creates course with cost center" 201 "$(req adm POST /api/admin/courses '{"name":"Smoke Curso","code":"SMK","cost_center":"CC-999 Smoke"}')"
COURSE=$(json o.id)
check "duplicate course code rejected" 409 "$(req adm POST /api/admin/courses '{"name":"Outro","code":"SMK","cost_center":"x"}')"
check "admin creates location with resources" 201 "$(req adm POST /api/admin/locations '{"name":"Smoke Sala","capacity":"25","resource_ids":[1,5]}')"
LOC=$(json o.id)
req sol GET /api/meta/locations >/dev/null
check "  form sees location resources" "1,5" "$(json "o.find(l=>l.id===$LOC).resource_ids.sort().join()")"
check "event takes cost center from course" 201 "$(req sol POST /api/events "$(printf '{"title":"SMOKE cc","course_id":%s,"location_id":%s,"resource_ids":[5]}' $COURSE $LOC)")"
req sol GET /api/events/$(json o.id) >/dev/null
check "  cost center derived" "CC-999 Smoke" "$(json o.cost_center)"
check "referenced course cannot be removed" 409 "$(req adm DELETE /api/admin/courses/$COURSE)"
check "referenced theme cannot be removed" 409 "$(req adm DELETE /api/admin/themes/1)"
check "admin creates theme" 201 "$(req adm POST /api/admin/themes '{"name":"Smoke Tema"}')"
check "unused theme removed" 200 "$(req adm DELETE /api/admin/themes/$(json o.id))"
check "unknown catalog" 404 "$(req adm GET /api/admin/nada)"

echo "Reports and CSV"
csv() { curl -s -b "$JAR/adm" -o "$JAR/report.csv" -w '%{http_code}' "$BASE/api/admin/reports/events.csv${1:-}"; }
csvrows() { node -e "const t=require('fs').readFileSync('$JAR/report.csv','utf8');console.log(t.trimEnd().split('\r\n').length-1)"; }
check "requester blocked from reports" 403 "$(req sol GET /api/admin/reports/events)"
check "report without filters" 200 "$(req adm GET /api/admin/reports/events)"
ALL=$(json o.length)
check "csv without filters" 200 "$(csv)"
check "  csv rows match table" "$ALL" "$(csvrows)"
check "  csv has BOM and pt-BR header" true "$(node -e "const t=require('fs').readFileSync('$JAR/report.csv','utf8');console.log(t.startsWith('﻿Nome do evento;Data;Horário inicial;Horário final;Tema;Curso/Coordenação;Centro de Custo;Local;Solicitante;Estado'))")"
FILTER="?course_id=1&theme_id=2&start_date=$(date +%Y-%m)-01&end_date=2099-12-31"
req adm GET "/api/admin/reports/events$FILTER" >/dev/null
FILTERED=$(json o.length)
check "  combined filters narrow the result" true "$(json "o.length>0 && o.length<$ALL && o.every(r=>r.course_name==='Sistemas de Informação' && r.theme_name==='Workshop')")"
csv "$FILTER" >/dev/null
check "  filtered csv rows match table" "$FILTERED" "$(csvrows)"
req sol POST /api/events '{"title":"Café; \"Ação\" & Inovação","course_id":1,"theme_id":2,"location_id":1}' >/dev/null
csv "?course_id=1&theme_id=2" >/dev/null
check "  special characters escaped" true "$(node -e "const t=require('fs').readFileSync('$JAR/report.csv','utf8');console.log(t.includes('\"Café; \"\"Ação\"\" & Inovação\"'))")"

echo "Sessions"
check "session persists (me)" 200 "$(req sol GET /api/auth/me)"
check "logout" 200 "$(req sol POST /api/auth/logout)"
check "session gone after logout" 401 "$(req sol GET /api/auth/me)"

echo "Password recovery"
MARIA=maria.souza@univille.br
check "maria logs in" 200 "$(login mar $MARIA sol123)"
check "unknown e-mail gets same answer" 200 "$(req anon POST /api/auth/forgot-password '{"email":"ninguem@univille.br"}')"
GENERIC=$(json o.message)
check "known e-mail" 200 "$(req anon POST /api/auth/forgot-password "{\"email\":\"$MARIA\"}")"
check "  same message (no enumeration)" "$GENERIC" "$(json o.message)"
check "  token not returned by API" false "$(json "'token' in o")"
check "requester blocked from outbox" 403 "$(req mar GET /api/admin/outbox)"
check "admin reads outbox" 200 "$(req adm GET /api/admin/outbox)"
check "  e-mail sent to maria with link" true "$(json "o[0].to_email==='$MARIA' && /#\/redefinir\/[0-9a-f]{64}/.test(o[0].body)")"
TOKEN=$(json "o[0].body.match(/redefinir\/([0-9a-f]{64})/)[1]")
check "short new password rejected" 400 "$(req anon POST /api/auth/reset-password "{\"token\":\"$TOKEN\",\"newPassword\":\"123\"}")"
check "invalid token rejected" 400 "$(req anon POST /api/auth/reset-password '{"token":"deadbeef","newPassword":"nova1234"}')"
R=$(req anon POST /api/auth/reset-password "{\"token\":\"$TOKEN\",\"newPassword\":\"nova1234\"}"); check "password reset" 200 "$R"
check "  open sessions ended" 401 "$(req mar GET /api/auth/me)"
check "  old password rejected" 401 "$(login mar $MARIA sol123)"
check "  new password works" 200 "$(login mar $MARIA nova1234)"
check "  link cannot be reused" 400 "$(req anon POST /api/auth/reset-password "{\"token\":\"$TOKEN\",\"newPassword\":\"outra123\"}")"

echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
