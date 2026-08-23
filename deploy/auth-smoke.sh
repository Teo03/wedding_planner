#!/bin/bash
# Thorough auth verification against a running instance.
# NB: every JSON body is assigned to a variable before use. Inlining a literal
# {...} inside "$( ... )" gets brace-expanded by bash into separate words.
B="${1:-http://localhost:8000}"
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then printf "  ✓ %-52s %s\n" "$1" "$3"; pass=$((pass+1));
        else printf "  ✗ %-52s expected %s got %s\n" "$1" "$2" "$3"; fail=$((fail+1)); fi; }
post() { local p="$1" body="$2"; shift 2
  curl -s -o /dev/null -w '%{http_code}' -X POST "$B$p" -H 'Content-Type: application/json' -d "$body" "$@"; }

U="suite$RANDOM"; PW="SuiteTest12345"; C=/tmp/s1.txt; C2=/tmp/s2.txt; rm -f $C $C2
STALE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzAwMDAwMDAwLCJ1c2VyX2lkIjo5OTk5fQ.bad"
REG="{\"username\":\"$U\",\"email\":\"$U@x.com\",\"password\":\"$PW\"}"
DUP="{\"username\":\"$U\",\"email\":\"other$RANDOM@x.com\",\"password\":\"$PW\"}"
WEAK='{"username":"weak1","email":"w1@x.com","password":"123"}'
NOPW='{"username":"nopw1","email":"n1@x.com"}'
GOOD="{\"username\":\"$U\",\"password\":\"$PW\"}"
BADPW="{\"username\":\"$U\",\"password\":\"Nope999999999\"}"
GHOST='{"username":"ghost__x","password":"Whatever12345"}'
SREG="{\"username\":\"stale$RANDOM\",\"email\":\"st$RANDOM@x.com\",\"password\":\"$PW\"}"

echo "--- registration ---"
chk "register new account" 201 "$(post /api/auth/register/ "$REG" -c $C)"
chk "duplicate username rejected" 400 "$(post /api/auth/register/ "$DUP")"
chk "weak password rejected" 400 "$(post /api/auth/register/ "$WEAK")"
chk "missing password rejected" 400 "$(post /api/auth/register/ "$NOPW")"

echo "--- cookie attributes (the 'logged out' bug) ---"
ACX=$(awk '$6=="access_token"{print $5}' $C); RCX=$(awk '$6=="refresh_token"{print $5}' $C)
[ -n "$ACX" ] && [ "$ACX" != "0" ] && chk "access cookie has an expiry (not session)" yes yes || chk "access cookie has an expiry (not session)" yes no
[ -n "$RCX" ] && [ "$RCX" != "0" ] && chk "refresh cookie has an expiry (not session)" yes yes || chk "refresh cookie has an expiry (not session)" yes no
DAYS=$(( (RCX - $(date +%s)) / 86400 ))
if [ "$DAYS" -ge 7 ]; then chk "refresh cookie lasts >= 7 days (${DAYS}d)" yes yes
else chk "refresh cookie lasts >= 7 days" yes "no (${DAYS}d)"; fi
chk "both cookies HttpOnly" 2 "$(awk '/^#HttpOnly/ && ($6=="access_token"||$6=="refresh_token")' $C | wc -l | tr -d ' ')"

echo "--- session ---"
chk "/me with cookies" 200 "$(curl -s -b $C -o /dev/null -w '%{http_code}' "$B/api/auth/me/")"
chk "protected route with cookies" 200 "$(curl -s -b $C -o /dev/null -w '%{http_code}' "$B/api/vendors/")"
chk "refresh endpoint works" 200 "$(curl -s -b $C -o /dev/null -w '%{http_code}' -X POST "$B/api/auth/refresh/")"

echo "--- login ---"
chk "wrong password rejected" 401 "$(post /api/auth/login/ "$BADPW")"
chk "unknown user rejected" 401 "$(post /api/auth/login/ "$GHOST")"
chk "correct password logs in" 200 "$(post /api/auth/login/ "$GOOD" -c $C2)"

echo "--- stale / hostile cookies (the lockout bug) ---"
chk "register with stale cookie" 201 "$(post /api/auth/register/ "$SREG" -H "Cookie: access_token=$STALE")"
chk "login with stale cookie" 200 "$(post /api/auth/login/ "$GOOD" -H "Cookie: access_token=$STALE")"
chk "protected route with stale cookie refused" 401 "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: access_token=$STALE" "$B/api/vendors/")"
chk "garbage cookie doesn't 500" 401 "$(curl -s -o /dev/null -w '%{http_code}' -H 'Cookie: access_token=not-a-jwt' "$B/api/vendors/")"

echo "--- logout ---"
chk "logout succeeds" 200 "$(curl -s -b $C2 -c $C2 -o /dev/null -w '%{http_code}' -X POST "$B/api/auth/logout/")"
chk "protected route after logout" 401 "$(curl -s -b $C2 -o /dev/null -w '%{http_code}' "$B/api/vendors/")"
chk "can log back in after logout" 200 "$(post /api/auth/login/ "$GOOD")"

echo; echo "  RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
