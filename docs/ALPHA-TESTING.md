# Alpha & beta testing — ek solo founder ka playbook

Yeh document **aapke liye** hai: koi team nahi hai, to aap khud alpha aur beta test kaise karein,
kya order mein, aur kaunse numbers dekhein. Har step ke saath exact command diya hai taaki "lagta
hai chal raha hai" ki jagah evidence mile.

Do golden rules:

1. **Numbers yaad rakhein, feelings nahi.** Har phase ke end mein kuch hard numbers likhein
   (latency, error count, pass/fail). Jo measure nahi hua, wo test nahi hua.
2. **Do database alag rakhein.** Alpha/beta test apni local ya staging copy par karein — jo
   database production banega usme `smoke-*` rows na chhodein.

---

## Phase 0 — apna machine, sab kuch (20 minute)

```bash
npm ci
npm run db:generate
npm run typecheck
npm test            # 33 files / 429 tests — sab green hone chahiye
npm run dev         # http://localhost:3000
```

Doosre terminal mein, jab dev server chal raha ho:

```bash
npm run smoke:api   # 122 checks; exit 0 = sab pass
```

Agar koi test fail ho: pehle `npm run db:generate` dobara chalayein, phir `npm test`. Fresh
machine par 90% failures missing Prisma client ya dead database ki wajah se hote hain.

**Pass criteria:** typecheck clean, test suite green, smoke 122/122.

---

## Phase 1 — alpha: aap khud, apne asli data par (1–2 din)

Yeh sabse important phase hai. Aap product ke **first user** hain, isliye pehle apna hi har din
ka kaam isse karein.

### 1.1 Ek asli workspace banayein

- `/register` se apna account aur apni asli organization banayein (demo data optional:
  `ARCH_SEED_DEMO=true`).
- Ek project + 2–3 real services add karein.
- Apne actual stack se alert bhejein: webhook endpoint banayein, HMAC request bhejein
  (`docs/BACKEND-TESTING.md` §3 mein signing recipe hai). Alert → incident banna chahiye.
- Ek incident manually resolve karein, ek ko open chhodein.

### 1.2 "Chat with ARCH" ka alpha round

Ye checklist har command ke saath hai (`/dashboard/chat`):

- [ ] Sidebar → Intelligence → **Chat with ARCH** khulta hai.
- [ ] Panel mein poochein: `what is open right now?` — jawab mein aapka **asli** open incident
      dikhna chahiye, aur neeche citation pill par click karke incident page khule.
- [ ] `what did we learn from <incident title>?` — resolve + root cause aur timeline se aana chahiye.
- [ ] `have we seen this before?` jaisa koi sawal — phir bhi incident + pattern dono cite ho sakte
      hain, aur answer mein saaf likha ho ki kya **aapke** history se aaya hai.
- [ ] Chhoti baat-cheet: `hi`, `kaise ho`, `thanks` — normal insaan jaisa jawab, aur agar
      Hinglish mein poochein to Hinglish mein.
- [ ] `write me a retry function` — ARCH code generate **nahi** karega; wo saaf mana karke Code
      Assist (/dashboard/code) ki taraf bhejta hai. Yeh jaan-boojh kar hai.
- [ ] Naya chat → title apne aap message se bane; rename karke dobara list mein dekhein.
- [ ] Purana chat khol kar follow-up poochein ("usme kya fix hua?") — thread yaad rahe.
- [ ] Ek chat delete karein, phir **Clear all** karein — list khaali ho jani chahiye (aur sirf
      aapki, kisi doosre member ki nahi).

Har jawab ke neeche latency header mein `latencyMs` chhupa hota hai (API response mein bhi aata
hai). Alpha ka target: **warm answer < 300 ms**, pehla answer < 1.5 s.

### 1.3 Model apne data par

```bash
npm run model:train            # /dashboard/model par "Retrain now" bhi chalega
npm run model:eval             # DB ke bina accuracy report
```

- [ ] Train ke baad `/dashboard/model` par version badla, `team incidents` aapka count dikhaye.
- [ ] Chat dobara poochein — ab jawab aapke incident ke root cause/fix se aane chahiye.
- [ ] `/dashboard/model` me **Chat with ARCH** ka button dikhta hai.

### 1.4 Bloat check (aapne bola tha "polish all backend bloat")

- [ ] `SMOKE_RSS=1 npm run smoke:api` chalayein. Smoke ke start aur end ki RSS value compare
      karein; 100+ requests ke baad bhi memory lakhs mein na badhe (few MB normal hai).
- [ ] Dev server ka log dekhein: har page/route ek baar compile hona chahiye, warnings nahi.

**Pass criteria:** upar ke sab boxes tick, chat ka apna data sahi, latency target ke andar.

---

## Phase 2 — beta: 3–7 friendly users (1 week)

Beta ka matlab: **aapke workspace se bahar ke log**. Friend, ex-colleague, koi bhi jo on-call raha
ho. Unhe kaam karne dein, guide na karein — jo atakta hai wahi product ki asli bug report hai.

### 2.1 Beta user ko kaise bulayein

Apne workspace se invite bhejein (Settings → Members → Invite). Har beta user ko yeh 4 lines
likh kar dein:

> 1. Register karke `/dashboard` kholo.
> 2. Ek incident declare karo, ek resolve karo.
> 3. `/dashboard/chat` par ARCH se 3 sawal poocho (open kya hai, ek incident ke baare mein, ek
>    purana pattern).
> 4. Jo bhi confusing lage — screenshot + exact sawal bhejo.

### 2.2 Har beta user ka checklist

- [ ] Invite accept hua, wo apni organization mein aa gaya (aur uski list mein sirf wahi kaam).
- [ ] Uska role kaam kar raha hai: RESPONDER incident bana sake, VIEWER sirf padh sake (write par
      `403`), aur **Member management** wala `403` bhi sahi jagah lage.
- [ ] Incidents: create → comment → status change → resolve, poora state machine.
- [ ] Status page publish karke public URL apne phone par kholein (incognito, bina login).
- [ ] Chat: apne sessions dekh sake, kisi aur ka session na dikhe (`404`).
- [ ] Webhook: apne tool (Grafana/Sentry/curl) se ek signed alert bhejein — incident bane, dobara
      same body bhejein — doosra incident na bane (dedupe).
- [ ] Audit log (OWNER/ADMIN) mein uske actions dikhein.

### 2.3 Beta ke doran kya measure karein

| Signal | Target | Kaise |
|---|---|---|
| Crash ya 500 | 0 | server log; browser network tab |
| Chat answer latency (warm) | < 300 ms | response ka `latencyMs` |
| Chat "main nahi jaanta" honesty | har baar | open-ended sawal pooch kar dekhein |
| Beta user ka pehla incident | < 10 min | screen share ya unka time note |
| Signup → first chat message | < 15 min | apne notes |
| 429s | sirf jaan-boojh kar | rate limit table `docs/BACKEND-TESTING.md` §2 |

Beta ke baad: ek hi file mein top 5 confusing cheezein likhein, chhote fixes karein, dobara
bhejein. Har round ke baad `CHANGELOG.md` mein "beta feedback" wali line add karein.

---

## Phase 3 — high-performance / load testing

Yeh alag phase hai kyunki iske liye koi tool chahiye. Sabse simple se shuru karein.

### 3.1 Har request ki latency (bina kisi tool ke)

```bash
# 30 chat turns, har ek ka time
sid=$(curl -s -c /tmp/jar -b /tmp/jar -X POST http://localhost:3000/api/auth/csrf ... )   # sign-in recipe: docs/BACKEND-TESTING.md §2
for i in $(seq 1 30); do
  curl -s -b /tmp/jar -X POST "http://localhost:3000/api/copilot/chat/sessions/$sid/messages" \
    -H 'content-type: application/json' -d '{"content":"what is open right now?"}' \
    -o /dev/null -w 'turn %{time_total}s\n'
done
```

Target: pehla turn < 1.5 s, uske baad **p50 < 300 ms, p95 < 800 ms**. Agar p95 isse zyada hai to
`SMOKE_RSS=1` se server memory dekhein aur database queries check karein.

### 3.2 Repeatable load (jab tool install kar sakein)

```bash
# hey: https://github.com/rakyll/hey  (ya k6 / ab)
hey -n 200 -c 10 -m POST \
  -H "content-type: application/json" -H "cookie: <session>" \
  -d '{"content":"kya open hai?"}' \
  http://localhost:3000/api/copilot/chat/sessions/<id>/messages
```

Dekhne wali cheezein:

- **p99** — 1 s se kam rakhein single box par.
- **Non-2xx count** — sirf 429 (rate limit) allowed, 5xx nahi.
- **RSS growth** — `SMOKE_RSS=1 npm run smoke:api` se pehle/baad; ya `ps -o rss= -p <pid>`
  har 60 s. 1000 requests ke baad bhi curve flat hona chahiye.
- **Database** — `SELECT count(*), state FROM pg_stat_activity GROUP BY state;` connections
  exhausted na ho (app ka per-process pool max 10 hai).

Yeh sab **local/staging** par hi karein. Public URL par load test bhejna hosting provider ke
ToS ke khilaf ho sakta hai.

### 3.3 Failure injection (real incidents ka rehearsal)

| Kya torein | Kya hona chahiye |
|---|---|
| `npm run db:down` (ya DB band) | `/api/health` → `503`; pages friendly error; crash nahi |
| Chat message send karein | `503` "could not answer just now"; server 500 na de |
| Galat HMAC signature | `401`, incident **na** bane |
| 11th register same IP se | `429` (limit 10 / 10 min) |
| Revoked token | `401` |
| Doosri org ka chat id | `404` (403 nahi — existence leak nahi) |

---

## Aage kya (jab beta pass ho jaye)

1. Hosted staging banao (managed Postgres + hosting) — `docs/V5-YOUR-CHECKLIST.md` §2.
2. Wahi smoke suite staging par chalayein (`SMOKE_BASE_URL=https://staging... npm run smoke:api`).
3. Uptime monitor `/api/health` par lagayein.
4. Beta users ko ek feedback form bhejein; jo 3 sawal sabse zyada poochte hain, unhe chat ke
   suggestion chips mein daal dein.

---

*Owner: Product/Engineering · Last reviewed: 2026-09-28 · Related: `BACKEND-TESTING.md`,
`V5-YOUR-CHECKLIST.md`, `../README.md`*
