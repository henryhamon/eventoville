#!/usr/bin/env bash
# API smoke tests for the demo flow. Requires the server on $BASE and a freshly
# seeded database (npm run db:reset). Creates test events tagged "SMOKE".
set -u
BASE=${BASE:-http://localhost:3000}
JAR=$(mktemp -d)
H='Content-Type: application/json'
PASS=0; FAIL=0

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

echo "Sessions"
check "session persists (me)" 200 "$(req sol GET /api/auth/me)"
check "logout" 200 "$(req sol POST /api/auth/logout)"
check "session gone after logout" 401 "$(req sol GET /api/auth/me)"

rm -rf "$JAR"
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
