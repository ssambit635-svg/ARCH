/**
 * ARCH's built-in tech knowledge pack.
 *
 * The honest answer to "can it answer any tech question in the world?" is: a pretrained model can,
 * a curated pack cannot — but a curated pack covers the canon (the things engineers actually ask)
 * for ₹0, offline, deterministically, with a citation, and it never invents a fact. That is what
 * this file is.
 *
 * Rules for this data:
 *   - Everything here is *general* knowledge, true independently of any workspace. Workspace facts
 *     (your incidents, services, runbooks) come from the snapshot, never from this file.
 *   - No invented numbers, no version-of-the-week claims, no vendor marketing. If a date or a
 *     detail is uncertain, say less rather than more.
 *   - Answers are short: the responder is usually mid-incident. Two to five lines, bullets when the
 *     answer is a list, and the practical "why you care" sentence at the end where it helps.
 *   - Every entry carries both languages. Hinglish is not a translation of jargon — keep the
 *     technical term in English and explain in Hinglish, the way the team actually talks.
 *
 * Adding a topic is a data change, not a code change: append an entry, add its aliases/keywords,
 * and it is live in chat (and in the tests) immediately. Coverage is bounded by this file on
 * purpose — a wrong answer here would be worse than "I do not know that one".
 */

export type TechCategory =
  | 'languages'
  | 'databases'
  | 'web'
  | 'infra'
  | 'ops'
  | 'security'
  | 'testing'
  | 'ai'
  | 'cloud'
  | 'performance'
  | 'systems'
  | 'engineering';

export type TechFact = {
  id: string;
  title: string;
  category: TechCategory;
  /** Strong evidence (weight 3): phrases that basically name this topic. */
  aliases: string[];
  /** Weak evidence (weight 1 each): single words that point here. */
  keywords: string[];
  /** Context words that usually mean *this* fact is the one being asked about (weight 2). */
  cues?: string[];
  en: string;
  hi: string;
  /** Ids of neighbouring topics, offered as follow-up chips. */
  related?: string[];
};

const L = (id: string, title: string, category: TechCategory, aliases: string[], keywords: string[], en: string, hi: string, related?: string[], cues?: string[]): TechFact =>
  ({ id, title, category, aliases, keywords, en, hi, related, cues });

export const TECH_FACTS: TechFact[] = [
  // ---------------------------------------------------------------- languages
  L(
    'language-history',
    'The oldest programming languages',
    'languages',
    ['oldest programming language', 'first programming language', 'oldest language', 'first high level language', 'programming language history'],
    ['fortran', 'cobol', 'lisp', 'algol', 'language', 'languages', '1957', 'history'],
    '**Fortran (1957)** is the oldest high-level programming language still in serious use — built at IBM for scientific computing, and still alive in HPC. **Lisp (1958)** and **COBOL (1959)** followed within two years, and both are still running parts of the world.\n\nOne step further back: **Plankalkül** (Konrad Zuse, 1948) was the first *designed* programming language, but it was never widely implemented — and assembly/machine code predate all of them.\n\n• 1957 Fortran · 1958 Lisp, ALGOL · 1959 COBOL · 1964 BASIC · 1972 C\n• If someone says "the oldest", Fortran is the usual answer; "the first ever designed" is Plankalkül.',
    '**Fortran (1957)** sabse purani high-level programming language hai jo aaj bhi serious use mein hai — IBM ne scientific computing ke liye banayi thi, aur HPC mein aaj bhi chalti hai. Uske turant baad **Lisp (1958)** aur **COBOL (1959)** aayi, dono aaj bhi kahin na kahin chal rahi hain.\n\nEk step aur peeche: **Plankalkül** (Konrad Zuse, 1948) pehli *designed* programming language thi, par kabhi widely implement nahi hui — aur assembly/machine code in sabse pehle hai.\n\n• 1957 Fortran · 1958 Lisp, ALGOL · 1959 COBOL · 1964 BASIC · 1972 C\n• "Sabse purani" ka jawab: Fortran. "Sabse pehli design ki gayi": Plankalkül.',
    ['language-c', 'language-python', 'language-go-rust'],
    ['oldest', 'earliest', 'first', 'purana', 'purani', 'sabse pehle'],
  ),
  L(
    'language-c',
    'C and C++',
    'languages',
    ['difference between c and c++', 'what is c language', 'what is c++'],
    ['c', 'c++', 'cpp', 'pointer', 'pointers'],
    '**C (1972)** is a small, low-level systems language: manual memory management, pointers, almost no runtime, and it is the substrate under operating systems, databases and most language runtimes.\n\n**C++ (1985, from "C with Classes")** keeps C\'s performance and adds classes, templates, RAII and the STL. Use C when you want the thinnest layer over the machine; use C++ when you need abstraction without giving up control.\n\n• Neither has garbage collection — memory is your responsibility.\n• The classic bug in both: use-after-free / buffer overflow. That is why so much new systems code is written in Rust.',
    '**C (1972)** ek chhoti, low-level systems language hai: manual memory management, pointers, na ke barabar runtime — OS, databases aur zyadatar language runtimes ke neeche yahi hai.\n\n**C++ (1985)** C ki performance rakhti hai aur classes, templates, RAII aur STL add karti hai. Machine ke sabse paas rehna ho to C; abstraction chahiye par control nahi chhodna, to C++.\n\n• Dono mein garbage collection nahi — memory aapki zimmedari.\n• Isi wajah se aaj ka naya systems code aksar Rust mein likha jaata hai.',
    ['language-go-rust', 'language-first-choice'],
  ),
  L(
    'language-python',
    'Python',
    'languages',
    ['what is python', 'why is python popular', 'python kya hai',
      'python for microservices',
      'python vs java',
      'is python good for production'],
    ['python', 'pandas', 'django', 'flask', 'numpy'],
    '**Python (1991)** is a readable, dynamically typed language with a huge ecosystem — the default for data, ML, scripting and automation. It is slow compared to C/Rust/Go, and that rarely matters because the heavy work happens in C libraries (NumPy, PyTorch).\n\n• Great for: glue code, data/ML, internal tools, one-off scripts.\n• Weak for: CPU-bound hot paths, large concurrent services (the GIL), mobile.\n• If it is the language of the team and the workload is not CPU-bound, use it in production confidently.',
    '**Python (1991)** padhne mein aasan, dynamically typed language hai jiska ecosystem bahut bada hai — data, ML, scripting aur automation ka default. C/Rust/Go se slow hai, par yeh aksar matter nahi karta kyunki bhaari kaam C libraries (NumPy, PyTorch) karti hain.\n\n• Best: glue code, data/ML, internal tools, scripts.\n• Weak: CPU-bound hot path, bade concurrent services (GIL), mobile.\n• Team isi mein comfortable hai aur kaam CPU-bound nahi hai, to production mein confidently use karo.',
    ['language-first-choice', 'ai-llm-basics'],
    ['good for', 'suitable for', 'fast enough'],
  ),
  L(
    'language-go-rust',
    'Go vs Rust',
    'languages',
    ['go vs rust', 'difference between go and rust', 'which is better go or rust'],
    ['go', 'golang', 'rust', 'goroutine', 'borrow'],
    '**Go (2009)** is deliberately small and boring: fast builds, easy concurrency (goroutines), a garbage collector, and a standard library built for network services. Teams ship reliably with it.\n\n**Rust (1.0 in 2015)** gives C/C++ performance *without* manual memory bugs — its compiler proves ownership at build time. Steeper learning curve, no GC, superb for systems, CLIs and performance-critical services.\n\n• Networking/API services, fast onboarding → Go.\n• Zero-cost performance, memory safety, systems work → Rust.\n• Both compile to a single static binary, which makes deployment trivial.',
    '**Go (2009)** jaan-boojh kar chhoti aur boring language hai: fast build, aasan concurrency (goroutines), garbage collector, aur network services ke liye banayi standard library. Team jaldi ship kar sakti hai.\n\n**Rust (1.0 in 2015)** C/C++ jaisi performance deti hai *bina* manual memory bugs ke — compiler build time par ownership prove karta hai. Seekhna mushkil, GC nahi, systems/CLI/performance-critical kaam ke liye best.\n\n• Networking/API services, jaldi onboard karna hai → Go.\n• Zero-cost performance + memory safety + systems → Rust.\n• Dono single static binary banate hain — deploy karna aasan.',
    ['language-c', 'language-first-choice'],
  ),
  L(
    'language-javascript',
    'JavaScript vs TypeScript',
    'languages',
    ['difference between javascript and typescript', 'what is typescript', 'why typescript',
      'javascript vs typescript',
      'js vs ts',
      'javascript or typescript'],
    ['javascript', 'typescript', 'js', 'ts', 'node', 'nodejs', 'npm'],
    '**JavaScript** is the language of the browser, and (via Node.js) of a lot of backend too. Dynamically typed — flexible, and where most production bugs come from.\n\n**TypeScript** is JavaScript with static types, checked *before* the code runs. The types disappear at build time, so there is no runtime cost; you get autocomplete, refactors that do not silently break, and errors caught in CI instead of in production.\n\n• New codebase → TypeScript, almost always. ARCH itself is strict TypeScript.\n• Existing JS → migrate file by file; you do not need a big-bang rewrite.',
    '**JavaScript** browser ki language hai, aur Node.js ke through backend ki bhi. Dynamically typed — flexible, aur yahi se production ke zyadatar bugs aate hain.\n\n**TypeScript** JavaScript + static types hai, jo code chalne se *pehle* check hote hain. Types build time par gayab ho jaate hain, isliye runtime cost zero; autocomplete, safe refactor aur CI mein hi error pakad milta hai.\n\n• Nayi codebase → TypeScript (ARCH khud strict TypeScript hai).\n• Purani JS → file by file migrate karo, ek saath rewrite karne ki zaroorat nahi.',
    ['language-first-choice'],
  ),
  L(
    'language-first-choice',
    'Choosing a language for a new service',
    'languages',
    ['which language should i use', 'best programming language', 'which language for microservices', 'fastest programming language',
      'what language should i learn',
      'which language to choose'],
    ['best', 'choose', 'language', 'fastest', 'performance'],
    'There is no "best" language — only the cheapest one for *this* team and workload:\n\n• **Boring and everywhere**: Python (data/ML/scripts), TypeScript (web + Node services), Java (large enterprise estates).\n• **Network services, small teams**: Go — fast builds, easy concurrency, tiny deploy surface.\n• **Performance or memory safety critical**: Rust; C++ only if the team already lives there.\n• **Data/ML**: Python; the heavy maths happens in C/CUDA underneath.\n\nThe real selection criteria are: what can this team debug at 3 a.m., what does the ecosystem already have, and how expensive is hiring — not microbenchmarks.',
    '"Best" language nahi hoti — sirf *is* team aur workload ke liye sabse sasti hoti hai:\n\n• **Boring aur har jagah**: Python (data/ML/scripts), TypeScript (web + Node), Java (bade enterprise).\n• **Network services, chhoti team**: Go — fast build, aasan concurrency, chhota deploy surface.\n• **Performance ya memory safety critical**: Rust; C++ tab hi jab team pehle se usme ho.\n• **Data/ML**: Python; bhaari maths neeche C/CUDA mein hoti hai.\n\nAsli criteria: team 3 baje raat ko kya debug kar sakti hai, ecosystem mein pehle se kya hai, aur hiring kitni mehngi hai — microbenchmark nahi.',
    ['language-go-rust', 'language-python', 'arch-decisions'],
  ),

  // ---------------------------------------------------------------- web
  L(
    'web-http-status',
    'HTTP status codes (and which ones mean what broke)',
    'web',
    ['http status code', 'http 503', 'http 500', 'http 502', 'http 504', 'http 429', 'http 401', 'http 403', 'status code meaning'],
    ['http', 'status', '500', '502', '503', '504', '429', '404', '401', '403', '422', '201', '204'],
    '• **2xx** success: 200 OK, 201 created, 204 no content.\n• **3xx** redirect: 301 permanent, 302/307 temporary, 308 permanent + keep method.\n• **4xx** the caller is wrong: 400 bad request, **401 unauthenticated** vs **403 forbidden** (authenticated but not allowed), 404 missing, 409 conflict, 422 validation, **429 too many requests** (rate limited — retry with backoff).\n• **5xx the server is wrong**: 500 unhandled exception, **502 bad gateway** (upstream sent garbage), **503 service unavailable** (overloaded/maintenance/no healthy backend — this is the "we are down" code), **504 gateway timeout** (upstream too slow).\n\nFor an incident, the 5xx distinction is the fastest triage: 502/504 point at the proxy↔upstream link, 503 at capacity or a dependency, 500 at your own code.',
    '• **2xx** success: 200, 201 (banaya), 204 (kuch nahi bheja).\n• **3xx** redirect: 301 permanent, 302/307 temporary.\n• **4xx** caller ki galti: 400 galat request, **401 login nahi** vs **403 login hai par permission nahi**, 404 nahi mila, 409 conflict, 422 validation, **429 rate limit** (backoff ke saath retry).\n• **5xx server ki galti**: 500 unhandled error, **502 upstream se galat jawab**, **503 service unavailable** (overload/maintenance — "hum down hain" wala code), **504 upstream bahut slow**.\n\nIncident mein 5xx ka farak sabse jaldi triage deta hai: 502/504 → proxy↔upstream link, 503 → capacity ya koi dependency, 500 → apna code.',
    ['web-rest-graphql', 'ops-timeouts-retries'],
  ),
  L(
    'web-rest-graphql',
    'REST vs GraphQL vs gRPC',
    'web',
    ['rest vs graphql', 'difference between rest and graphql', 'what is grpc', 'graphql vs grpc'],
    ['rest', 'graphql', 'grpc', 'protobuf', 'soap', 'endpoint'],
    '**REST**: resources + HTTP verbs, cacheable, universally understood. The default for public APIs.\n**GraphQL**: one endpoint, the client asks for exactly the fields it needs — great for many-shaped UI reads, harder to cache, needs query-cost limits.\n**gRPC**: typed contracts (protobuf) over HTTP/2, streaming, very fast, ideal for internal service-to-service calls. Not browser-friendly without a proxy.\n\n• Public/partners → REST (with versioning and pagination limits).\n• Complex frontends with many screens → GraphQL.\n• Internal high-throughput calls → gRPC.\n• Whatever you pick: paginate, version, and never break clients silently.',
    '**REST**: resource + HTTP verbs, cacheable, sabko samajh aata hai. Public API ka default.\n**GraphQL**: ek endpoint, client ko exact fields milte hain — UI ke liye accha, cache karna mushkil, query cost limit chahiye.\n**gRPC**: typed contract (protobuf) HTTP/2 par, streaming, bahut fast — internal service-to-service ke liye best. Browser ke liye proxy chahiye.\n\n• Public/partners → REST.\n• Bahut screens wala complex frontend → GraphQL.\n• Internal high-throughput → gRPC.\n• Kuch bhi chuno: pagination, versioning, aur client ko chupke se todna kabhi nahi.',
    ['web-http-status', 'arch-api'],
  ),
  L(
    'web-dns',
    'DNS: why "it is always DNS"',
    'web',
    ['how does dns work', 'what is dns', 'dns resolution', 'why dns fails'],
    ['dns', 'resolver', 'cname', 'ttl', 'nameserver', 'propagation'],
    '**DNS** turns a name into an address. A query walks: your **recursive resolver** → **root** → **TLD** (.com) → the domain\'s **authoritative** server, then the answer is cached for its **TTL**.\n\nWhy it breaks incidents: caching means a change is not instant (the old TTL has to expire everywhere), a low TTL on a broken record propagates fast, and a resolver outage looks like *everything* is down while your servers are fine.\n\n• Triage: `dig +short name`, then `dig @1.1.1.1 name` vs `dig @<your resolver> name` — if they disagree, it is caching/propagation.\n• Lower the TTL *before* a migration, not during it.',
    '**DNS** naam ko address mein badalta hai. Query chalti hai: recursive **resolver** → **root** → **TLD** (.com) → domain ka **authoritative** server, aur jawab **TTL** tak cache hota hai.\n\nIncident kyun hota hai: cache ki wajah se change turant lagu nahi hota (purana TTL har jagah expire hona padta hai), aur resolver down ho to lagta hai *sab* down hai jabki aapke servers theek hain.\n\n• Triage: `dig +short name`, phir `dig @1.1.1.1 name` vs `dig @<apna resolver> name` — farak aaye to caching/propagation.\n• Migration se *pehle* TTL kam karo, us dauraan nahi.',
    ['web-http-status', 'web-load-balancer'],
  ),
  L(
    'web-tls',
    'TLS / HTTPS, in one paragraph',
    'web',
    ['how does tls work', 'how does https work', 'what is tls', 'tls handshake', 'ssl vs tls'],
    ['tls', 'ssl', 'https', 'certificate', 'handshake', 'encryption'],
    '**TLS** encrypts and authenticates a connection; "HTTPS" is just HTTP inside it. The handshake agrees a cipher suite, the server proves its identity with a **certificate** signed by a trusted CA, both sides derive a shared session key (so no secret crosses the wire), then traffic flows encrypted.\n\nWhat breaks in production: expired certificates (the classic self-inflicted outage), a missing intermediate certificate (browsers may cope, some clients do not), and hostname mismatch after a rename.\n\n• Monitor certificate expiry like any other SLO — it is the cheapest outage you will ever prevent.\n• TLS 1.3 is faster; rotatable keys (like a local LLM/private service) still matter on internal networks.',
    '**TLS** connection ko encrypt aur authenticate karta hai; "HTTPS" = HTTP uske andar. Handshake mein cipher suite tay hoti hai, server apna **certificate** (CA se signed) dikha kar identity prove karta hai, dono taraf ek shared session key banti hai, phir traffic encrypted chalti hai.\n\nProduction mein kya tootta hai: expire ho gaya certificate (classic self-inflicted outage), intermediate certificate missing, aur rename ke baad hostname mismatch.\n\n• Certificate expiry ko bhi ek SLO ki tarah monitor karo — sabse sasta outage jo aap kabhi rok sakte ho.',
    ['security-authn-authz', 'web-dns'],
  ),
  L(
    'web-caching',
    'Caching: the three things that actually matter',
    'web',
    ['how does caching work', 'what is cache invalidation', 'cache stampede', 'what is a cdn', 'cache aside'],
    ['cache', 'caching', 'cdn', 'redis', 'ttl', 'invalidat', 'stampede', 'hit'],
    'Three rules cover most cache incidents:\n\n1. **TTL and invalidation**: every cached value needs an expiry *and* an explicit invalidation path. "It is fresh because nobody changed it" is not a strategy.\n2. **Stampede**: when a hot key expires, thousands of requests hit the origin at once. Fix with jittered TTLs, a lock (one request refills, others wait), or serving stale-while-revalidate.\n3. **Correctness**: cache the value the *reader* needs, keyed by everything that changes it (user, tenant, version). A missing key component is a data-leak bug, not a performance bug.\n\nA **CDN** is the same idea at the edge — set long TTLs for immutable assets (hashed filenames), short for HTML.',
    'Teen rules se zyadatar cache incidents cover ho jaate hain:\n\n1. **TTL + invalidation**: har cached value ko expiry *aur* explicit invalidation path chahiye. "Kisi ne change nahi kiya to fresh hai" strategy nahi hai.\n2. **Stampede**: hot key expire hote hi hazaaron request origin par. Fix: jittered TTL, lock (ek request refill kare, baaki wait), ya stale-while-revalidate.\n3. **Correctness**: jo value *reader* ko chahiye wahi cache karo, aur key mein har badalne wali cheez daalo (user, tenant, version). Key ka missing hissa data-leak bug hai, performance bug nahi.\n\n**CDN** yahi idea edge par hai — immutable assets (hashed filename) ke liye lamba TTL, HTML ke liye chhota.',
    ['db-redis', 'ops-timeouts-retries'],
  ),
  L(
    'web-realtime',
    'WebSockets, SSE and polling',
    'web',
    ['websocket vs polling', 'what is websocket', 'server sent events', 'real time updates',
      'websocket or polling',
      'polling vs websocket',
      'websockets vs polling'],
    ['websocket', 'sse', 'polling', 'long-polling', 'stream'],
    '• **Polling**: ask every N seconds. Simplest, works everywhere, wasteful and laggy.\n• **Long polling**: server holds the request until there is something to say. A cheap upgrade when you cannot change infrastructure.\n• **SSE (Server-Sent Events)**: one-way server→client stream over plain HTTP. Perfect for status feeds, dashboards, "live incident updates".\n• **WebSockets**: full duplex, low latency, but you own reconnection, heartbeats, backpressure and fan-out servers.\n\nPick the simplest thing that satisfies the requirement: a status page or an incident timeline usually needs SSE, not WebSockets.',
    '• **Polling**: har N second mein poochho. Sabse aasan, sab jagah chalta hai, par wasteful aur laggy.\n• **Long polling**: server request ko rok leta hai jab tak kuch naya na ho. Infrastructure badalni na ho to sasta upgrade.\n• **SSE (Server-Sent Events)**: ek taraf ka server→client stream, plain HTTP par. Status feed, dashboard, live incident updates ke liye perfect.\n• **WebSockets**: full duplex, kam latency, par reconnection, heartbeat, backpressure aur fan-out aapko khud sambhalna hai.\n\nSabse simple option chuno jo requirement pura kare — status page ya timeline ke liye usually SSE kaafi hai.',
    ['web-rest-graphql', 'arch-status-page'],
  ),
  L(
    'web-load-balancer',
    'Load balancers, reverse proxies and CORS',
    'web',
    ['what is a load balancer', 'layer 4 vs layer 7', 'what is a reverse proxy', 'what is cors'],
    ['load', 'balancer', 'balance', 'proxy', 'nginx', 'haproxy', 'cors', 'origin'],
    'A **reverse proxy** sits in front of your servers (TLS termination, routing, caching, rate limits). A **load balancer** distributes traffic across instances.\n\n• **L4 (TCP)**: fast, protocol-agnostic, cannot see paths or headers — you cannot route by URL.\n• **L7 (HTTP)**: routes on path/header/cookie, does retries and canary splits, but costs more CPU and needs health checks that reflect real dependency state.\n\n**CORS** is a *browser* rule, not a server security feature: the browser blocks cross-origin reads unless the API opts in with headers. Server-to-server calls ignore it entirely — so "CORS error" never means "our API is insecure".\n\n• Always surface the upstream status in proxy logs (`502` from *which* backend is the whole point).',
    '**Reverse proxy** aapke servers ke aage baithta hai (TLS termination, routing, caching, rate limit). **Load balancer** traffic ko instances mein baantta hai.\n\n• **L4 (TCP)**: fast, protocol-agnostic, path/header nahi dekh sakta — URL par routing nahi hogi.\n• **L7 (HTTP)**: path/header par routing, retries, canary split; zyada CPU aur asli dependency state wale health check chahiye.\n\n**CORS** browser ka rule hai, server security feature nahi: browser cross-origin read block karta hai jab tak API headers se opt-in na kare. Server-to-server calls par iska koi asar nahi — "CORS error" ka matlab "API insecure hai" kabhi nahi hota.\n\n• Proxy log mein upstream status hamesha dikhao (`502` *kis* backend se aaya, yahi asli sawaal hai).',
    ['web-dns', 'ops-observability'],
  ),

  // ---------------------------------------------------------------- databases
  L(
    'db-sql-vs-nosql',
    'SQL vs NoSQL',
    'databases',
    ['sql vs nosql', 'difference between sql and nosql', 'when to use nosql', 'relational vs document database',
      'sql or nosql',
      'sql vs nosql for a new app',
      'when to use nosql'],
    ['sql', 'nosql', 'relational', 'document', 'mongodb', 'schema', 'table', 'join'],
    '**SQL (relational)**: a schema, joins, ACID transactions, and a query planner that gets smarter as you add indexes. This is the right default for anything with relationships, money, or reporting.\n\n**NoSQL** is not one thing:\n• **Document** (MongoDB): flexible documents, good for fast-changing shapes and per-entity reads.\n• **Key-value** (Redis, DynamoDB): lookups by key at scale, no joins.\n• **Wide-column** (Cassandra, Bigtable): enormous write volume.\n• **Graph** (Neo4j): relationships *are* the query (dependencies, blast radius).\n\nChoose NoSQL when you can name the access pattern and the scale that breaks a relational database. Otherwise the schema is a feature: it is where you encode what the business actually means.',
    '**SQL (relational)**: schema, joins, ACID transactions, aur indexes ke saath behtar hota query planner. Relationships, paise ya reporting wale kaam ke liye default yahi hai.\n\n**NoSQL** ek cheez nahi hai:\n• **Document** (MongoDB): flexible documents, badalti shape aur per-entity reads ke liye.\n• **Key-value** (Redis, DynamoDB): key se lookup, join nahi.\n• **Wide-column** (Cassandra): bahut zyada writes.\n• **Graph** (Neo4j): relationships hi query hain (dependencies, blast radius).\n\nNoSQL tab chuno jab access pattern aur scale naam le sako jo relational ko todta hai. Warna schema ek feature hai — wahin likha jaata hai business ka matlab kya hai.',
    ['db-postgres-mysql', 'db-cap'],
  ),
  L(
    'db-acid',
    'ACID, isolation levels and BASE',
    'databases',
    ['what is acid', 'what are transactions', 'isolation levels', 'what is base consistency'],
    ['acid', 'transaction', 'atomicity', 'isolation', 'consistency', 'mvcc', 'deadlock'],
    '**ACID** describes a transaction: **A**ll-or-nothing, leaves the database **C**onsistent, is **I**solated from concurrent work, and is **D**urable once committed.\n\nIsolation levels trade correctness for concurrency — read committed (default in Postgres), repeatable read, serializable. Weaker isolation allows *non-repeatable reads* and *write skew*; stronger isolation costs throughput and can abort transactions, so retries must be built in.\n\n**BASE** (basically available, soft state, eventual consistency) is the NoSQL counter-position: accept temporary inconsistency for availability and scale.\n\n• Deadlocks are normal: keep transactions short, touch rows in a consistent order, and retry on conflict.\n• If your service mutates several tables (incident + event + audit + notification), that is exactly one transaction.',
    '**ACID** transaction ki definition hai: **A**ll-or-nothing, database **C**onsistent rehta hai, doosre kaam se **I**solated, aur commit ke baad **D**urable.\n\nIsolation levels correctness aur concurrency ka trade-off hain — read committed (Postgres ka default), repeatable read, serializable. Kamzor isolation mein non-repeatable reads aur write skew aata hai; strong isolation throughput khaata hai aur transaction abort kar sakta hai, isliye retry built-in chahiye.\n\n**BASE** (eventual consistency) NoSQL ka ulta rukh hai: availability aur scale ke liye thodi der ka inconsistency accept karo.\n\n• Deadlock normal hai: transaction chhoti rakho, rows ek hi order mein chhuo, conflict par retry karo.',
    ['db-sql-vs-nosql', 'db-cap'],
  ),
  L(
    'db-cap',
    'CAP theorem, and what it really means',
    'databases',
    ['what is cap theorem', 'cap theorem explained', 'consistency availability partition'],
    ['cap', 'theorem', 'partition', 'availability', 'brew'],
    '**CAP** says: during a network **P**artition you must choose between **C**onsistency (everyone sees the same data) and **A**vailability (everyone gets an answer).\n\nThe subtlety everyone gets wrong: partitions are not optional, so the real choice is what to do *while* partitioned — and most systems are **CP for a few keys, AP for others**.\n\n**PACELC** extends it: if there is no Partition, you still trade **L**atency against **C**onsistency — which is the choice you make every day (replica reads are fast and slightly stale; primary reads are fresh and slower).\n\n• Practical version: know which reads may be stale, and say it out loud in the API.',
    '**CAP** kehta hai: network **P**artition ke dauraan **C**onsistency (sabko same data) aur **A**vailability (sabko jawab) mein se ek chunna padega.\n\nJo baat log bhoolte hain: partition optional nahi hai, isliye asli sawaal yeh hai ki partition ke *dauraan* kya karo — aur zyadatar systems kuch keys ke liye CP hain, kuch ke liye AP.\n\n**PACELC** aage le jaata hai: partition na ho to bhi **L**atency vs **C**onsistency ka trade hai — replica read fast par thoda purana, primary read fresh par slow.\n\n• Practical: tay karo kaunse reads stale ho sakte hain, aur API mein wahi likho.',
    ['db-acid', 'db-replication'],
  ),
  L(
    'db-postgres-mysql',
    'PostgreSQL vs MySQL',
    'databases',
    ['postgres vs mysql', 'difference between postgres and mysql', 'which database should i use'],
    ['postgres', 'postgresql', 'mysql', 'mariadb', 'sqlite'],
    'Both are excellent, mature relational databases with ACID transactions and good replication.\n\n**PostgreSQL** leans standards-compliant and extensible: JSONB, rich index types (GIN/GiST), arrays, window functions, extensions (pg_stat_statements, pg_trgm, and pgvector for embeddings), stricter typing. ARCH uses PostgreSQL 16.\n\n**MySQL/MariaDB** is historically the fastest to set up and the most common in shared hosting and many web stacks; it also gives you two storage engines and a slightly looser type system.\n\n• New project with any analytics, JSON, or search-shaped needs → Postgres.\n• Already running MySQL happily → staying is a perfectly good decision.\n• **SQLite** is superb when the app is single-node and small — it is not a toy.',
    'Dono mature relational databases hain — ACID transactions aur acchi replication ke saath.\n\n**PostgreSQL** standards aur extensibility par zor deta hai: JSONB, GIN/GiST indexes, arrays, window functions, extensions (pg_trgm, pgvector). ARCH PostgreSQL 16 use karta hai.\n\n**MySQL/MariaDB** setup ke liye historically fastest aur web stacks mein sabse common; type system thoda loose hai.\n\n• Naya project + JSON/analytics/search-shape → Postgres.\n• MySQL already khush chal raha hai → wahin rehna bilkul theek decision hai.\n• **SQLite** single-node chhote apps ke liye shandaar hai — toy nahi hai.',
    ['db-sql-vs-nosql', 'db-indexes'],
  ),
  L(
    'db-redis',
    'Redis',
    'databases',
    ['what is redis', 'why use redis', 'redis cache'],
    ['redis', 'in-memory', 'memcache', 'key-value', 'eviction'],
    '**Redis** is an in-memory data store: microsecond reads, and data structures beyond strings (hashes, sorted sets, streams, atomic counters, TTLs).\n\nWhat teams actually use it for: caching hot reads, rate limiting (atomic INCR with expiry), distributed locks (with a real algorithm, not `SETNX` and hope), queues/streams, and session storage.\n\n• It is memory-first: persistence is configurable (RDB snapshots, AOF log) but do not treat it as your database of record unless you have decided *and tested* that.\n• The classic incident: a working set that no longer fits memory → evictions → hit rate collapses → the database gets the traffic. Monitor memory *and* eviction rate, not just hit rate.',
    '**Redis** in-memory data store hai: microsecond reads, aur strings ke alawa data structures (hashes, sorted sets, streams, atomic counters, TTL).\n\nAsli use: hot reads ka cache, rate limiting (atomic INCR + expiry), distributed locks (sahi algorithm ke saath, `SETNX` bharose par nahi), queues/streams, aur sessions.\n\n• Yeh memory-first hai: persistence configurable hai (RDB, AOF) par ise apna source of truth tab banao jab *decide* aur *test* kar liya ho.\n• Classic incident: working set memory se bada → evictions → hit rate girta hai → traffic database par. Sirf hit rate nahi, memory aur eviction rate bhi monitor karo.',
    ['web-caching', 'db-indexes'],
  ),
  L(
    'db-indexes',
    'Indexes, query plans, and the N+1 problem',
    'databases',
    ['what is a database index', 'why is my query slow', 'what is n+1', 'how to speed up query'],
    ['index', 'indexes', 'query', 'plan', 'explain', 'slow', 'n+1'],
    'An **index** is a sorted side structure (usually a B-tree) that turns a full table scan into a lookup. The cost: every write also updates the index, and each index takes disk.\n\n**How to actually debug a slow endpoint:**\n1. `EXPLAIN ANALYZE` the query and look for a sequential scan on a big table.\n2. Check the index matches the *filter and sort* order (the leftmost columns matter).\n3. Look for **N+1**: one query to list rows, then one more per row. It looks fast in dev with 10 rows and melts production with 10 000 — fix with a join or a batched `IN` query.\n\n• Add indexes guided by real queries (`pg_stat_statements`), never speculatively.\n• An index on `(organizationId, status)` also serves queries filtering on `organizationId` alone — column order is the whole trick.',
    '**Index** ek sorted side structure (usually B-tree) hai jo full table scan ko lookup bana deta hai. Cost: har write par index bhi update hota hai, aur disk lagta hai.\n\n**Slow endpoint debug karne ka tarika:**\n1. `EXPLAIN ANALYZE` chalao aur badi table par sequential scan dhundo.\n2. Dekho index *filter aur sort* dono se match karta hai (leftmost column sabse zyada matter karta hai).\n3. **N+1** dhundo: ek query list ke liye, phir har row ke liye ek. Dev mein 10 rows par fast, production mein 10 000 par tabaahi — join ya batched `IN` se fix.\n\n• Index asli queries par banao (`pg_stat_statements`), andaaze par nahi.\n• `(organizationId, status)` ka index sirf `organizationId` filter par bhi kaam karta hai — column order hi trick hai.',
    ['db-acid', 'perf-latency'],
  ),
  L(
    'db-replication',
    'Replication, sharding and migrations',
    'databases',
    ['what is replication', 'what is sharding', 'how to do zero downtime migration', 'read replica lag'],
    ['replication', 'replica', 'shard', 'sharding', 'failover', 'migration', 'lag'],
    '**Replication** copies writes to other nodes: read scaling, failover, and (usually) a small **replica lag** — reads from a replica can be milliseconds to seconds old. If a user must see their own write, read from the primary.\n\n**Sharding** splits data across independent databases (by tenant, user, or region). It solves write scale and isolation, and costs you cross-shard queries, rebalancing, and much more operational surface. Most systems never need it; a single well-indexed Postgres goes surprisingly far.\n\n**Zero-downtime migrations** follow expand → migrate → contract: add the new column/table, write to both, backfill in batches, switch reads, then remove the old one. Never rename a column in one step on a live system.',
    '**Replication** writes ko doosre nodes par copy karta hai: read scaling, failover, aur (usually) thodi **replica lag** — replica se padha data milliseconds se seconds purana ho sakta hai. User ko apna write turant dikhana ho to primary se padho.\n\n**Sharding** data ko alag databases mein todta hai (tenant/user/region se). Write scale aur isolation milti hai, cost hai cross-shard queries, rebalancing aur bahut zyada operations. Zyadatar systems ko iski zaroorat nahi padti — ek acchi indexed Postgres bahut door tak chalti hai.\n\n**Zero-downtime migration**: expand → migrate → contract. Naya column/table add karo, dono mein likho, batch mein backfill karo, reads switch karo, phir purana hatao. Live system par column ek step mein rename kabhi nahi.',
    ['db-cap', 'ops-deploy-strategies'],
  ),

  // ---------------------------------------------------------------- infra
  L(
    'infra-docker-k8s',
    'Docker vs Kubernetes vs virtual machines',
    'infra',
    ['difference between docker and kubernetes', 'docker vs kubernetes', 'what is docker', 'what is kubernetes', 'container vs vm'],
    ['docker', 'kubernetes', 'k8s', 'container', 'image', 'pod', 'vm', 'hypervisor'],
    'They solve different layers, which is why "Docker vs Kubernetes" is not really a competition:\n\n• **Virtual machine**: a full guest operating system on a hypervisor. Strong isolation, slow to boot, memory-hungry.\n• **Container (Docker)**: your app plus its dependencies, sharing the host kernel. Small, fast, reproducible builds; the same image runs on your laptop and in production.\n• **Kubernetes**: a *scheduler and supervisor* for many containers — rolling deploys, health checks (`liveness`/`readiness`), autoscaling, service discovery, restarts. It does not build images and it is not a database.\n\n• One service on one box → Docker + systemd is genuinely enough; Kubernetes adds real operational cost.\n• Many services, many teams, elastic load → Kubernetes earns its keep.',
    'Ye alag layers hain, isliye "Docker vs Kubernetes" asli competition nahi hai:\n\n• **VM**: hypervisor par pura guest OS. Strong isolation, slow boot, zyada memory.\n• **Container (Docker)**: app + dependencies, host kernel share karte hue. Chhota, fast, reproducible; wahi image laptop aur production dono mein chalti hai.\n• **Kubernetes**: bahut containers ka *scheduler aur supervisor* — rolling deploy, health check (`liveness`/`readiness`), autoscaling, service discovery, restart. Ye images build nahi karta aur database nahi hai.\n\n• Ek service ek machine par → Docker + systemd kaafi hai; Kubernetes ka apna operational cost hai.\n• Bahut services, bahut teams, elastic load → Kubernetes faayda deta hai.',
    ['ops-deploy-strategies', 'cloud-iaas-paas'],
  ),
  L(
    'infra-cicd',
    'CI vs CD (delivery vs deployment) and IaC',
    'infra',
    ['what is ci cd', 'difference between continuous delivery and deployment', 'what is infrastructure as code', 'what is terraform',
      'ci vs cd',
      'difference between ci and cd',
      'what is ansible',
      'ansible'],
    ['ci', 'cd', 'pipeline', 'jenkins', 'github actions', 'terraform', 'ansible', 'iac', 'deploy'],
    '**CI (continuous integration)**: every push is built and tested automatically, on a clean machine. The point is not the tool — it is that "it works on my machine" stops being an argument.\n\n**Continuous delivery**: every green build *can* be deployed, at the push of a button. **Continuous deployment**: it goes out automatically. The difference is a human decision, not a technical one.\n\n**IaC (infrastructure as code)**: your servers, networks and permissions live in a versioned file (Terraform, Pulumi) rather than in someone\'s console history. Ansible-style tools configure machines; Terraform-style tools create them.\n\n• A deploy that nobody can reproduce is an incident waiting for a bad night.\n• Every release should be able to say: what changed, how to roll back, and how you would know it broke.',
    '**CI (continuous integration)**: har push automatically clean machine par build aur test hota hai. Asli point tool nahi — yeh hai ki "mere machine par chalta hai" argument khatam ho jaata hai.\n\n**Continuous delivery**: har green build button dabane par deploy *ho sakta* hai. **Continuous deployment**: apne aap chala jaata hai. Farak insaan ke decision ka hai, technology ka nahi.\n\n**IaC**: servers, network aur permissions versioned file mein (Terraform, Pulumi), kisi ke console history mein nahi. Ansible jaise tools machine configure karte hain; Terraform jaise banate hain.\n\n• Jo deploy koi reproduce na kar sake, wo ek buri raat ka intezaar kar raha incident hai.\n• Har release bata sake: kya badla, rollback kaise, aur toota kaise pata chalega.',
    ['infra-docker-k8s', 'ops-deploy-strategies', 'arch-testing'],
  ),
  L(
    'infra-monolith-microservices',
    'Monolith vs microservices',
    'infra',
    ['monolith vs microservices', 'should i use microservices', 'what are microservices', 'modular monolith'],
    ['monolith', 'microservice', 'microservices', 'services', 'modular'],
    '**Monolith**: one deployable. Simple to build, test, debug and reason about; a schema change is one migration instead of a contract negotiation.\n\n**Microservices**: independent deployables. You buy independent scaling and team autonomy; you pay with network failures, distributed transactions, versioned contracts, tracing, on-call surface, and a much harder local development story.\n\n**Modular monolith** is the honest middle: strict internal module boundaries (no cross-module queries, one owner per table) in a single deployment. It gives you most of the design discipline and none of the network — and if you ever split, the boundaries are already drawn. ARCH is exactly this.\n\nRule of thumb: split a service out when a *specific* constraint demands it (different scaling profile, different compliance boundary, a team that cannot coordinate), not because it sounds modern.',
    '**Monolith**: ek deployable. Banana, test karna, debug karna aasan; schema change ek migration hai, contract negotiation nahi.\n\n**Microservices**: alag-alag deployables. Independent scaling aur team autonomy milti hai; cost hai network failure, distributed transaction, versioned contract, tracing, on-call surface, aur local development ka sar dard.\n\n**Modular monolith** imaandaar middle hai: sakht internal module boundaries (cross-module query nahi, har table ka ek owner) ek hi deployment mein. Discipline milti hai, network ka dard nahi — aur kabhi split karna ho to boundaries pehle se drawn hain. ARCH yahi hai.\n\nRule: service tab alag karo jab *koi specific* constraint majboor kare (alag scaling, alag compliance boundary, team coordinate na kar paaye) — sirf modern lagne ke liye nahi.',
    ['infra-docker-k8s', 'arch-decisions'],
  ),
  L(
    'infra-queues',
    'Queues, Kafka and async work',
    'infra',
    ['what is a message queue', 'kafka vs rabbitmq', 'difference between queue and pub sub', 'what is a dead letter queue',
      'kafka',
      'rabbitmq vs kafka',
      'kafka vs rabbitmq'],
    ['queue', 'kafka', 'rabbitmq', 'sqs', 'pub', 'sub', 'dlq', 'consumer', 'broker'],
    'A **queue** decouples "accept the work" from "do the work": the API returns fast, a worker processes at its own pace, and a spike becomes a backlog instead of an outage.\n\n• **Task queue** (SQS, RabbitMQ, Sidekiq, BullMQ, Postgres outbox): each message is delivered to *one* worker and removed when acknowledged. ARCH uses a Postgres outbox — no extra infrastructure to run.\n• **Log / stream** (Kafka, Kinesis): messages are retained and replayed, many consumers read independently, ordering is per partition. For event pipelines and analytics.\n\nDelivery semantics you must decide: **at-least-once** (may duplicate — so make handlers idempotent), **at-most-once** (may lose), **exactly-once** (expensive, and still requires idempotency end to end).\n\n• Always add a **DLQ** and an alert on its depth: messages that fail forever are silent data loss.\n• Monitor *age* of the oldest message, not just queue length — that is what users feel.',
    '**Queue** "kaam accept karo" aur "kaam karo" ko alag karti hai: API fast return karta hai, worker apni speed se process karta hai, aur spike backlog ban jaata hai, outage nahi.\n\n• **Task queue** (SQS, RabbitMQ, Postgres outbox): har message *ek* worker ko, acknowledge hone par hat jaata hai. ARCH Postgres outbox use karta hai — koi extra infrastructure nahi.\n• **Log/stream** (Kafka, Kinesis): messages retain hote hain aur replay ho sakte hain, multiple consumers independent padhte hain, ordering per partition. Event pipeline aur analytics ke liye.\n\nDelivery semantics tay karo: **at-least-once** (duplicate ho sakta hai — handler idempotent banao), **at-most-once** (loss ho sakta hai), **exactly-once** (mehnga, aur end-to-end idempotency phir bhi chahiye).\n\n• **DLQ** aur uski depth par alert zaroor — hamesha fail hone wale messages chup-chaap data loss hain.\n• Sirf length nahi, sabse purane message ki *age* monitor karo — wahi user ko feel hota hai.',
    ['ops-idempotency', 'ops-timeouts-retries'],
  ),
  L(
    'infra-serverless',
    'Serverless and containers',
    'infra',
    ['what is serverless', 'serverless vs containers', 'lambda vs ecs', 'what is a cold start'],
    ['serverless', 'lambda', 'faas', 'cold', 'start', 'functions'],
    '**Serverless (FaaS)** runs your function on demand: no servers to patch, scale-to-zero, pay per invocation. The trade: **cold starts** (first call after idle is slow), execution time limits, and local testing that never quite matches production.\n\n**Containers on a scheduler** (ECS, Cloud Run, Kubernetes, Fly.io) keep a long-lived process: predictable latency, background workers, WebSockets, connection pools — at the cost of always-on capacity.\n\nPick by traffic shape:\n• Spiky/low traffic, short jobs, webhooks, cron → serverless is cheap and simple.\n• Steady traffic, long-lived connections, heavy startup (big models, JVM warm-up) → containers.\n\nNeither is "more modern". The one you can observe and roll back is the better one.',
    '**Serverless (FaaS)** function on-demand chalata hai: server patch nahi karne, scale-to-zero, per-invocation payment. Trade: **cold start** (idle ke baad pehla call slow), execution time limit, aur local testing jo production se exactly match nahi karta.\n\n**Scheduler par containers** (ECS, Cloud Run, Kubernetes) long-lived process rakhte hain: predictable latency, background worker, WebSocket, connection pool — par capacity hamesha on rehni padti hai.\n\nTraffic shape se chuno:\n• Spiky/kam traffic, chhote jobs, webhook, cron → serverless sasta aur simple.\n• Steady traffic, long-lived connection, heavy startup (bade models, JVM warm-up) → containers.\n\nKoi bhi "zyada modern" nahi hai. Jo observe aur rollback kar sakte ho, wahi better hai.',
    ['infra-docker-k8s', 'cloud-iaas-paas'],
  ),
  L(
    'cloud-iaas-paas',
    'IaaS vs PaaS vs SaaS, regions and autoscaling',
    'cloud',
    ['what is iaas paas saas', 'difference between iaas and paas', 'what is a region and availability zone', 'how does autoscaling work',
      'availability zone',
      'what is an availability zone',
      'region vs availability zone'],
    ['iaas', 'paas', 'saas', 'region', 'zone', 'availability', 'autoscal', 'vpc', 'subnet'],
    '• **IaaS**: raw virtual machines and networks (EC2, GCE). Maximum control, maximum maintenance.\n• **PaaS**: you push code, the platform runs it (App Engine, Heroku, Railway, Fly). Least operational work, least control.\n• **SaaS**: someone else\'s finished product (Slack, Datadog). You are a customer, not an operator.\n\n**Regions** are geographic clusters; each contains **availability zones** — independent power/network inside one region. One AZ can fail without taking the region down, which is why "multi-AZ" is the real first step (multi-region is a much bigger jump: data residency, latency, and a genuinely distributed database problem).\n\n**Autoscaling** adds/removes instances on a signal (CPU, queue depth, requests). It reacts *after* the signal moves, so pair it with a queue or a load shedder — otherwise every spike looks like an outage for 30–90 seconds.',
    '• **IaaS**: raw VM aur network (EC2, GCE). Sab control, sab maintenance.\n• **PaaS**: code push karo, platform chalata hai (Heroku, Railway, Fly). Sabse kam operational kaam, kam control.\n• **SaaS**: kisi ka banaya product (Slack, Datadog). Aap customer ho, operator nahi.\n\n**Region** geographic cluster hai; har region mein **availability zones** hote hain — alag power/network. Ek AZ fail ho sakta hai bina region girne ke, isliye "multi-AZ" pehla asli step hai (multi-region bahut bada jump hai: data residency, latency, aur distributed database ka problem).\n\n**Autoscaling** signal (CPU, queue depth, requests) par instance add/remove karta hai. Ye *baad* mein react karta hai, isliye queue ya load shedder ke saath rakho — warna har spike 30–90 second ka outage lagta hai.',
    ['infra-serverless', 'ops-deploy-strategies'],
  ),

  // ---------------------------------------------------------------- ops / sre
  L(
    'ops-mttr-metrics',
    'MTTR, MTTD, MTBF and error budgets',
    'ops',
    ['what is mttr', 'what is mttd', 'mttr vs mttbf', 'what is an error budget'],
    ['mttr', 'mttd', 'mtbf', 'error', 'budget', 'metric', 'downtime'],
    '• **MTTD** (time to detect): alert fires to human notices. Fix with better signals, not more alerts.\n• **MTTR** (time to resolve): incident start to service restored. The healthiest thing to shrink — usually by better runbooks and faster rollback, not by heroics.\n• **MTBF** (time between failures): how often it breaks. Improves only by fixing causes.\n\nAn **error budget** turns an SLO into a budget: at 99.9% over 30 days you may fail ~43 minutes. Spend it on releases; if it is exhausted, the team freezes features and pays down reliability. The point is that reliability becomes a number the whole team can argue about, instead of an argument between "ship faster" and "stop shipping".',
    '• **MTTD** (detect hone ka time): alert aane se insaan ke notice karne tak. Fix: behtar signal, zyada alert nahi.\n• **MTTR** (resolve hone ka time): incident shuru se service restore tak. Sabse healthy metric ise ghatana — behtar runbook aur fast rollback se, heroics se nahi.\n• **MTBF** (failures ke beech ka time): kitni baar tootta hai. Sirf cause fix karne se sudharta hai.\n\n**Error budget** SLO ko budget bana deta hai: 99.9% par 30 din mein ~43 minute fail kar sakte ho. Ise release par kharch karo; budget khatam ho to feature freeze karke reliability pay down karo. Point yeh hai ki reliability ek number ban jaati hai jispar poori team baat kar sakti hai.',
    ['ops-slo-sli', 'ops-postmortem'],
  ),
  L(
    'ops-slo-sli',
    'SLI vs SLO vs SLA',
    'ops',
    ['difference between sli slo sla', 'what is an slo', 'what is an sla',
      'sli slo sla difference',
      'slo vs sli vs sla',
      "slo burn rate"],
    ['sli', 'slo', 'sla', 'objective', 'agreement', 'uptime', 'target'],
    '• **SLI** — the measurement: "the fraction of requests that succeeded in under 300 ms".\n• **SLO** — your internal target for that measurement: "99.9% over 30 days".\n• **SLA** — the *contract* with customers, with money or credits attached. SLAs are negotiated by lawyers and should always be looser than your SLO, so you notice a problem long before a customer does.\n\nGood SLOs are user-centric, few (three or four per service), and tied to a decision: what do we do when the budget burns?\n\n• Teams that alert on every symptom get alert fatigue. Alert on **burn rate** of the SLO instead — that is what actually means "users are hurting, right now".',
    '• **SLI** — measurement: "kitni % requests 300 ms se kam mein succeed hui".\n• **SLO** — us measurement ka internal target: "30 din mein 99.9%".\n• **SLA** — customer ke saath *contract*, jisme paisa ya credit juda hai. SLA hamesha SLO se loose rakho, taaki problem customer se pehle aap notice karo.\n\nAccha SLO user-centric hota hai, kam (per service 3–4), aur ek decision se juda: budget jalne par hum kya karenge?\n\n• Har symptom par alert karne se alert fatigue aata hai. SLO ke **burn rate** par alert karo — wahi asli matlab rakhta hai "users ko abhi takleef ho rahi hai".',
    ['ops-mttr-metrics', 'ops-alerting'],
  ),
  L(
    'ops-alerting',
    'Alert fatigue and actionable alerting',
    'ops',
    ['what is alert fatigue', 'how to reduce alerts', 'what is a good alert', 'why so many alerts',
      'reduce alert fatigue',
      'too many alerts'],
    ['alert', 'alerts', 'fatigue', 'noise', 'page', 'pager', 'on-call'],
    'An alert is a promise: *this is worth waking a human up for*. Every alert that is not actionable breaks that promise and makes the next real one easier to ignore.\n\nWhat good looks like:\n• **Symptom-based**, not cause-based: alert on "error budget burning / users failing", not on "CPU is 80%". CPU high with users happy is not an incident.\n• **Page vs ticket**: paging is for things that need a human *now*; everything else is a ticket or a dashboard.\n• **Owned and documented**: each alert has a runbook link and a known action.\n• **Delete alerts**: if an alert has fired 50 times and nobody acted, either fix it or remove it. Both are improvements.\n\n• Track alerts-per-shift. A rising number is a leading indicator of the next burnout, not of reliability.',
    'Alert ek promise hai: *ye cheez insaan ko uthane layak hai*. Jo alert actionable nahi, wo promise todta hai aur agla asli alert ignore hone ke liye tayyar kar deta hai.\n\nAccha kaisa dikhta hai:\n• **Symptom par**, cause par nahi: "error budget jal raha hai / users fail ho rahe hain", na ki "CPU 80% hai". CPU high ho par users khush, to incident nahi hai.\n• **Page vs ticket**: page sirf un cheezon ke liye jinke liye insaan *abhi* chahiye; baaki ticket ya dashboard.\n• **Owner aur runbook**: har alert ka runbook link aur known action.\n• **Alerts delete karo**: 50 baar fire hua aur kisi ne kuch nahi kiya → ya theek karo ya hata do. Dono improvement hai.\n\n• Alerts-per-shift track karo — badhta number agla burnout batata hai, reliability nahi.',
    ['ops-oncall', 'ops-slo-sli'],
  ),
  L(
    'ops-oncall',
    'On-call, escalation and handovers',
    'ops',
    ['how to run on-call', 'what is an escalation policy', 'on call best practices', 'incident handover',
      'what is an escalation path',
      'escalation path'],
    ['oncall', 'on-call', 'escalation', 'rotation', 'handover', 'responder'],
    'On-call is a system, not a person\'s willingness to lose sleep:\n\n• **Rotation with a schedule** (primary + secondary) so nobody is accidentally always on.\n• **Escalation policy**: unacknowledged page → next responder → lead, with time bounds. Silence is the failure mode you are engineering against.\n• **Everything needed is one click**: runbooks, dashboards, deploy/rollback commands, who owns which service.\n• **Handover in writing**: open incidents, what is suspected, what was tried, what to watch. A verbal handover at 2 a.m. loses information.\n• **Recovery after the night**: late starts or a comp day after a genuine bad night. An on-call rota that burns people quietly is a reliability risk with a delay.',
    'On-call ek system hai, kisi ki "raat ko uth jaaunga" willingness nahi:\n\n• **Schedule wali rotation** (primary + secondary), taaki koi galti se hamesha on-call na ho.\n• **Escalation policy**: unacknowledged page → next responder → lead, time limits ke saath. Chuppi wahi failure mode hai jiske against engineering karni hai.\n• **Sab kuch ek click door**: runbook, dashboard, deploy/rollback command, kaunsi service kiska.\n• **Handover likh kar**: kaunse incidents open, kya shak hai, kya try hua, kya watch karna hai. 2 baje muh se handover karne mein information gum ho jaati hai.\n• **Raat ke baad recovery**: late start ya comp day. Jo rota logon ko chup-chaap jalaata hai, wo delay ke saath aane wala reliability risk hai.',
    ['ops-alerting', 'ops-postmortem'],
  ),
  L(
    'ops-postmortem',
    'Blameless postmortems and severity levels',
    'ops',
    ['what is a postmortem', 'blameless postmortem', 'incident severity levels', 'how to write postmortem',
      'write a postmortem',
      'postmortem template',
      'how to write a postmortem'],
    ['postmortem', 'retrospective', 'blameless', 'severity', 'sev', 'rca', 'root'],
    'A **postmortem** is written after an incident to answer: what happened (timeline), what the impact was, why it happened, why it was not caught earlier, and what changes. **Blameless** does not mean "nobody was responsible" — it means the analysis targets systems and decisions, because a team that fears the write-up hides evidence, and hidden evidence repeats the outage.\n\nUseful **severity** levels are about impact, not effort:\n• **SEV1** — customers cannot use a core function; all hands, exec informed.\n• **SEV2** — major degradation or a single important customer blocked.\n• **SEV3** — minor impact, workaround exists; normal hours.\n• **SEV4** — internal/no customer impact.\n\nEvery postmortem ends with owners and dates on the action items. Otherwise it is a story, not a fix.',
    '**Postmortem** incident ke baad likha jaata hai: kya hua (timeline), impact kya tha, kyun hua, pehle kyun nahi pakda gaya, aur kya badlega. **Blameless** ka matlab "koi zimmedar nahi" nahi — matlab analysis system aur decisions par hoti hai, kyunki jo team likhne se darti hai wo evidence chhupaati hai, aur chhupa evidence wahi outage dobara laata hai.\n\n**Severity** impact se tay hoti hai, mehnat se nahi:\n• **SEV1** — customer core function use nahi kar sakte; sab log, exec ko inform.\n• **SEV2** — bada degradation ya ek important customer blocked.\n• **SEV3** — chhota impact, workaround hai; normal hours.\n• **SEV4** — internal/no customer impact.\n\nHar postmortem ke action items par owner aur date. Warna wo kahani hai, fix nahi.',
    ['ops-mttr-metrics', 'ops-runbook'],
  ),
  L(
    'ops-runbook',
    'Runbooks that are actually used',
    'ops',
    ['what is a runbook', 'how to write a runbook', 'runbook vs playbook'],
    ['runbook', 'playbook', 'procedure', 'checklist', 'documentation'],
    'A **runbook** is a step-by-step procedure for one specific failure, written for the person you were six months ago: tired, on-call, and under pressure.\n\nWhat makes one usable:\n• **Trigger** — what alert/symptom brings you here.\n• **Verify** — one command that confirms this is really the problem.\n• **Act** — exact commands/dashboards, with expected output, not "investigate the cache".\n• **Escalate** — when to stop and call someone, and who.\n• **Roll back** — the safest exit, listed early, not as step 19.\n\nA **playbook** covers a broader class of situations ("regional failover"); a runbook is the specific script.\n\n• Write the runbook *during* the incident (paste the commands you actually ran), then clean it up afterwards. Writing it from memory a week later loses everything useful.\n• If it is not linked from the alert, it does not exist.',
    '**Runbook** ek specific failure ka step-by-step procedure hai, us insaan ke liye likha gaya jo aap chhe mahine pehle the: thake hue, on-call, pressure mein.\n\nUsable kaise banta hai:\n• **Trigger** — kaunsa alert/symptom aapko yahan laaya.\n• **Verify** — ek command jo confirm kare ki problem yahi hai.\n• **Act** — exact commands/dashboards, expected output ke saath, "cache investigate karo" nahi.\n• **Escalate** — kab rukna hai, kisko call karna hai.\n• **Roll back** — sabse safe exit, step 19 ke bajaye shuru mein.\n\n**Playbook** wider class cover karta hai ("regional failover"); runbook specific script hai.\n\n• Runbook incident ke *dauraan* likho (jo commands chale, paste karo), baad mein saaf karo. Ek hafte baad memory se likhne par sab kaam ki baat gum ho jaati hai.\n• Jo alert se linked nahi, wo exist hi nahi karta.',
    ['ops-postmortem', 'arch-knowledge'],
  ),
  L(
    'ops-idempotency',
    'Idempotency',
    'ops',
    ['what is idempotency', 'what is an idempotency key', 'why idempotent requests'],
    ['idempotency', 'idempotent', 'retry', 'duplicate', 'key'],
    '**Idempotent** means doing something twice has the same effect as doing it once. `PUT /incidents/42 {status: RESOLVED}` is idempotent; `POST /incidents` is not — it creates a second incident.\n\nWhy it matters in distributed systems: networks fail *after* the server did the work. The client retries, and without idempotency you get duplicate incidents, double charges, duplicate emails.\n\nThe standard fix is a client-supplied **idempotency key**: the server stores it with the result and, on a repeat, returns the stored response instead of doing the work again. This is exactly how ARCH\'s webhook ingestion refuses duplicate deliveries.\n\n• Make every retryable operation idempotent.\n• On the consumer side of a queue: assume **at-least-once** delivery and design for it — do not hope for exactly-once.',
    '**Idempotent** ka matlab: do baar karne ka asar ek baar jitna hi. `PUT /incidents/42 {status: RESOLVED}` idempotent hai; `POST /incidents` nahi — doosra incident ban jaayega.\n\nDistributed systems mein kyun matter karta hai: network *server ke kaam ke baad* fail hota hai. Client retry karta hai, aur idempotency ke bina duplicate incident, double charge, duplicate email.\n\nStandard fix client-supplied **idempotency key**: server key ko result ke saath store karta hai aur repeat par wahi response wapas deta hai. ARCH ka webhook ingestion bilkul yahi karta hai (duplicate delivery refuse).\n\n• Har retryable operation idempotent banao.\n• Queue ke consumer mein **at-least-once** delivery maano — exactly-once ki ummeed mat karo.',
    ['ops-timeouts-retries', 'infra-queues'],
  ),
  L(
    'ops-timeouts-retries',
    'Timeouts, retries and circuit breakers',
    'ops',
    ['what is a circuit breaker', 'retry with backoff', 'why timeout is important', 'what is backpressure',
      'exponential backoff',
      'retry with backoff'],
    ['timeout', 'retry', 'backoff', 'jitter', 'circuit', 'breaker', 'backpressure', 'bulkhead'],
    'Most "slow and flaky" services are missing four patterns:\n\n• **Timeout** on every network call. A call without a deadline can hang for the OS default (minutes) while holding a request slot — that is how one slow dependency becomes a full outage.\n• **Retry with exponential backoff and jitter** — and only for *idempotent*, retryable failures (5xx/timeout, not 400). Retrying without backoff turns a blip into a self-inflicted DDoS. Add a retry budget so retries cannot exceed a fraction of traffic.\n• **Circuit breaker**: after N consecutive failures, stop calling the dependency and fail fast for a while. Callers get a clear error instead of a queue full of hangs, and the dependency gets room to recover.\n• **Backpressure / load shedding**: when you are full, say so (429 with `Retry-After`) instead of accepting work you cannot finish. Queue everything and you fail slowly, for everyone, including the healthy traffic.',
    'Zyadatar "slow aur flaky" services mein chaar patterns missing hote hain:\n\n• **Timeout** har network call par. Deadline ke bina call OS default (minutes) tak atak sakta hai aur request slot pakde rehta hai — ek slow dependency isi tarah pura outage ban jaati hai.\n• **Retry exponential backoff + jitter** ke saath — aur sirf *idempotent*, retryable failures par (5xx/timeout, 400 par nahi). Bina backoff retry ek blip ko khud ka DDoS bana deta hai. Retry budget rakho taaki retries traffic ka chhota hissa rahein.\n• **Circuit breaker**: N consecutive failures ke baad dependency ko call karna band karke fail fast karo. Caller ko saaf error milta hai, dependency ko recover karne ki jagah milti hai.\n• **Backpressure / load shedding**: full ho to bol do (429 + `Retry-After`), na ki wo kaam accept karo jo pura nahi kar sakte. Sab kuch queue karna sabke liye dheeme failure ki taraf jaana hai.',
    ['ops-idempotency', 'perf-latency'],
  ),
  L(
    'ops-deploy-strategies',
    'Deploy strategies and rollbacks',
    'ops',
    ['blue green deployment', 'canary deployment', 'rolling deployment', 'how to rollback a deploy',
      'what is a canary release',
      'canary release',
      'what is a canary deploy'],
    ['blue', 'green', 'canary', 'rolling', 'rollback', 'deploy', 'deployment', 'feature', 'flag'],
    '• **Rolling**: replace instances in batches. Default, cheap, but during the window both versions serve traffic — so old and new must be compatible with the same database.\n• **Blue-green**: two full environments, switch traffic, roll back by switching back. Instant, twice the cost.\n• **Canary**: send 1–5% of traffic to the new version, watch real metrics, then widen. Best early-warning system, needs good metrics.\n• **Feature flags**: ship code dark, enable per tenant. Deploy ≠ release, and that separation is what lets you turn a bad feature off in seconds.\n\nRules that matter more than the strategy:\n• **Rollback must be one command**, tested regularly — a rollback plan nobody has executed is a guess.\n• Watch the **error budget / burn rate** for 15–30 minutes after widening.\n• Database changes deploy separately: expand first, contract later, so both versions work.',
    '• **Rolling**: instances batches mein replace. Default, sasta, par window mein dono version traffic serve karte hain — matlab database ke saath dono compatible hone chahiye.\n• **Blue-green**: do pura environment, traffic switch, rollback bhi switch se instant. Cost double.\n• **Canary**: 1–5% traffic naye version ko, real metrics dekho, phir widen. Sabse accha early warning, par acche metrics chahiye.\n• **Feature flag**: code dark ship karo, per tenant enable. Deploy ≠ release, aur yahi separation kharab feature ko seconds mein off karne deti hai.\n\nStrategy se zyada zaroori:\n• **Rollback ek command** ka ho, aur regularly test ho — jise kisi ne chalaya nahi wo andaaza hai.\n• Widen karne ke baad 15–30 minute **burn rate** dekho.\n• Database change alag deploy hota hai: pehle expand, baad mein contract.',
    ['infra-cicd', 'ops-observability'],
  ),
  L(
    'ops-observability',
    'Metrics, logs, traces and cardinality',
    'ops',
    ['what is observability', 'metrics vs logs vs traces', 'what is cardinality', 'how to debug production',
      "what is a trace id",
      "trace id"],
    ['observability', 'metric', 'metrics', 'logs', 'log', 'trace', 'tracing', 'instrumentation', 'cardinality', 'prometheus'],
    'Three signals, three jobs:\n\n• **Metrics** (numbers over time): cheap, aggregatable, perfect for alerting — request rate, error rate, latency percentiles, saturation. Never cardinality-free: every extra label multiplies cost.\n• **Logs** (events): the detail you need *after* the metric told you something is wrong. Structured JSON logs with a request id beat prose.\n• **Traces** (one request across services): the only honest way to answer "which hop is slow?" in a distributed system.\n\nCorrelate them with a **request id** in every log line and span — that single habit cuts incident debugging time more than any dashboard.\n\n• **High-cardinality labels** (user id, incident id) on metrics are how observability bills explode: keep them in logs/traces, not metric labels.\n• Alert on **symptoms** (error rate, latency, saturation), diagnose with the other two.',
    'Teen signal, teen kaam:\n\n• **Metrics** (time ke saath numbers): sasta, aggregate hone layak, alerting ke liye best — request rate, error rate, latency percentile, saturation. Cardinality free nahi hoti: har extra label cost badhaata hai.\n• **Logs** (events): wo detail jo metric ke "kuch galat hai" ke *baad* chahiye. Structured JSON + request id, prose se behtar.\n• **Traces** (ek request across services): distributed system mein "kaunsi hop slow hai" ka imaandaar jawab.\n\nTeenon ko **request id** se jodo — ye ek aadat incident debug time kisi bhi dashboard se zyada kam karti hai.\n\n• Metrics par **high-cardinality label** (user id, incident id) = observability bill ka dhamaka. Wo logs/traces mein rakho.\n• Alert **symptom** par karo, baaki do se diagnose.',
    ['ops-alerting', 'ops-deploy-strategies'],
  ),
  L(
    'ops-chaos',
    'Chaos engineering, load and failure testing',
    'ops',
    ['what is chaos engineering', 'load testing', 'failure injection', 'game day'],
    ['chaos', 'chaos-engineering', 'game', 'load', 'testing', 'injection', 'drill', 'resilience'],
    'You do not know how a system behaves under failure until you fail something on purpose, in daylight, with people watching.\n\n• **Load testing**: does it hold at 2× expected traffic? Find the knee of the curve *before* a customer does — and remember to test the dependencies too.\n• **Failure injection**: kill an instance, block a dependency, add 500 ms latency, expire a certificate in staging. Most "high availability" claims die at the first step.\n• **Game day**: scheduled, announced, one hypothesis ("losing the cache should degrade, not fail"), a rollback plan, and a written outcome.\n\n• Start in staging, then a controlled canary in production. Never run a first drill on your only environment.\n• Every drill should end with either a fixed weakness or a written runbook — otherwise it was theatre.',
    'System failure mein kaisa behave karta hai, ye tab tak pata nahi chalta jab tak kuch jaan-boojh kar tod na do — din ki roshni mein, logon ke saamne.\n\n• **Load testing**: 2× expected traffic par sambhalta hai? Curve ka knee customer se pehle dhundho — aur dependencies bhi test karo.\n• **Failure injection**: instance kill karo, dependency block karo, 500 ms latency daalo, certificate staging mein expire karo. Zyadatar "high availability" daave pehle step par mar jaate hain.\n• **Game day**: scheduled, announced, ek hypothesis ("cache jaane par degrade ho, fail na ho"), rollback plan, aur likha hua outcome.\n\n• Staging se shuru, phir production mein controlled canary. Pehla drill sirf apne ek environment par kabhi nahi.\n• Har drill ka end: ya weakness fix hui, ya runbook likha — warna wo theatre tha.',
    ['ops-deploy-strategies', 'ops-runbook'],
  ),
  L(
    'ops-12factor',
    '12-factor apps and configuration',
    'ops',
    ['what is 12 factor app', 'where should i put config', 'environment variables vs config file'],
    ['12-factor', '12factor', 'config', 'environment', 'variables', 'secrets', 'env'],
    'The 12-factor idea, in the parts that actually cause incidents:\n\n• **Config in the environment**, not baked into the image — the same artifact runs in staging and production with different values.\n• **Secrets are not config files in git.** Use a secret manager or injected environment variables, rotate them, and keep them out of logs.\n• **Stateless processes**: any instance can serve any request, so you can restart, scale and deploy freely. State lives in a database, cache or object store.\n• **Logs are event streams**: write to stdout, let the platform ship them. Never write logs to a file inside a container.\n• **Dev/prod parity**: same database engine, same dependency versions, same container. Differences here are where "works in staging" comes from.\n• **Graceful shutdown**: handle `SIGTERM`, finish in-flight work, then exit — otherwise every deploy drops requests.\n\nARCH follows this shape: one modular monolith, config from `.env`, no state in the process (jobs are a Postgres outbox).',
    '12-factor ka asli hissa jo incidents banata hai:\n\n• **Config environment se**, image mein baked nahi — wahi artifact staging aur production mein alag values ke saath chalta hai.\n• **Secrets git mein config file nahi hain.** Secret manager ya injected env vars, rotate karo, logs se door rakho.\n• **Stateless process**: koi bhi instance koi bhi request serve kare, taaki aap freely restart/scale/deploy kar sako. State database, cache ya object store mein.\n• **Logs event stream hain**: stdout par likho, platform ship karega. Container ke andar file mein log kabhi nahi.\n• **Dev/prod parity**: same DB engine, same dependency versions, same container. Yahi farak "staging mein chalta hai" banata hai.\n• **Graceful shutdown**: `SIGTERM` handle karo, in-flight kaam poora karo, phir exit — warna har deploy request drop karta hai.\n\nARCH isi shape mein hai: ek modular monolith, config `.env` se, process mein state nahi (jobs Postgres outbox hain).',
    ['infra-cicd', 'security-secrets'],
  ),

  // ---------------------------------------------------------------- security
  L(
    'security-authn-authz',
    'Authentication vs authorization, sessions vs JWT',
    'security',
    ['difference between authentication and authorization', 'session vs jwt', 'what is jwt', 'how does login work', '401 vs 403'],
    ['auth', 'authentication', 'authorization', 'jwt', 'token', 'session', 'cookie', 'oauth', 'oidc', 'sso', 'rbac', 'permission', 'login'],
    '**Authentication** = who you are. **Authorization** = what you may do. They fail differently: 401 means "not signed in", 403 means "signed in, not allowed" — and confusing them sends the wrong signal to the client.\n\n**Sessions (server-side)** store state on the server and hand the browser an opaque cookie: revocable immediately, easy to reason about.\n**JWT (stateless)** carries signed claims: no lookup per request, but *revocation is the hard part* — you either keep a denylist (and lose the benefit) or accept tokens that outlive a logout. Keep them short-lived with a refresh token.\n\nAuthorization models: **RBAC** (roles → permissions; ARCH uses OWNER/ADMIN/RESPONDER/VIEWER), **ABAC** (attributes/policies), **ReBAC** (relationships). Whichever you use, **enforce on the server for every request**, never in the UI only — and return 404 rather than 403 for another tenant\'s id, so existence does not leak.\n\n• OAuth2 = *delegated authorization*; OIDC = an identity layer on top of it (login). SSO/SAML is the enterprise version of the same idea.',
    '**Authentication** = aap kaun ho. **Authorization** = aap kya kar sakte ho. Dono ka failure alag hai: 401 matlab "login nahi", 403 matlab "login hai, permission nahi" — inhe mix karne se client ko galat signal jaata hai.\n\n**Sessions (server-side)** state server par rakhte hain aur browser ko opaque cookie dete hain: turant revoke ho jaate hain, samajhna aasan.\n**JWT (stateless)** signed claims le jaata hai: per-request lookup nahi, par *revoke karna mushkil* hai — ya denylist rakho (aur benefit khatam) ya logout ke baad bhi valid token accept karo. Isliye short-lived rakho + refresh token.\n\nAuthorization models: **RBAC** (roles → permissions; ARCH mein OWNER/ADMIN/RESPONDER/VIEWER), **ABAC** (attributes), **ReBAC** (relationships). Jo bhi use karo, **server par har request enforce karo**, sirf UI mein nahi — aur doosre tenant ka id ho to 403 ke bajaye 404 do, taaki existence leak na ho.\n\n• OAuth2 = delegated authorization; OIDC = uske upar identity layer (login). SSO/SAML isi idea ka enterprise version.',
    ['security-secrets', 'security-owasp'],
  ),
  L(
    'security-secrets',
    'Hashing vs encryption, HMAC and secrets management',
    'security',
    ['hashing vs encryption', 'how to store passwords', 'what is hmac', 'how to manage secrets', 'what is bcrypt',
      'secrets management',
      'secrets in git',
      'where should secrets live'],
    ['hash', 'hashing', 'bcrypt', 'argon2', 'encryption', 'hmac', 'signature', 'signing', 'secret', 'rotate'],
    '• **Hashing** is one-way: you verify a password by re-hashing the guess, never by decrypting. Use a deliberately slow algorithm (**bcrypt, scrypt, Argon2**) with a per-user salt — SHA-256 alone is fast, and fast is the wrong property here.\n• **Encryption** is two-way, for data you must read back (tokens, personal data). It needs key management, which is the hard part.\n• **HMAC** is a keyed hash: it proves a message came from someone holding the secret *and* that it was not modified. That is how webhook signatures work — sign `"{timestamp}.{rawBody}"` (not the parsed JSON, and include a timestamp so an old delivery cannot be replayed).\n\nSecrets handling:\n• Never in git, never in logs, never in an error message. Rotate on a schedule and immediately after any exposure.\n• Store only what you must: ARCH keeps a *hash* of webhook secrets and API tokens, and encrypts what it has to keep.\n• Separate keys per purpose (session signing ≠ webhook signing) so one leak is not every leak.',
    '• **Hashing** one-way hai: password guess ko dobara hash karke verify karte ho, decrypt nahi. Jaan-boojh kar slow algorithm (**bcrypt, scrypt, Argon2**) per-user salt ke saath — akela SHA-256 fast hai, aur yahan fast galat property hai.\n• **Encryption** two-way hai, un data ke liye jo wapas padhna hai (tokens, personal data). Iski asli mushkil key management hai.\n• **HMAC** keyed hash hai: proof ki message secret wale se aaya *aur* badla nahi gaya. Webhook signature isi tarah banta hai — `"{timestamp}.{rawBody}"` sign karo (parsed JSON nahi, aur timestamp daalo taaki purani delivery replay na ho).\n\nSecrets:\n• Git mein kabhi nahi, logs mein kabhi nahi, error message mein kabhi nahi. Schedule par rotate, aur exposure ke turant baad.\n• Sirf wahi store karo jo zaroori hai: ARCH webhook secret aur API token ka *hash* rakhta hai, aur jo rakhna padta hai use encrypt karta hai.\n• Har kaam ke liye alag key (session signing ≠ webhook signing), taaki ek leak sab leak na ho.',
    ['security-authn-authz', 'arch-webhooks'],
  ),
  L(
    'security-owasp',
    'The attacks that actually show up',
    'security',
    ['what is sql injection', 'what is xss', 'what is csrf', 'what is ssrf', 'how to secure an api',
      "what is a data breach",
      "data breach"],
    ['injection', 'xss', 'csrf', 'ssrf', 'owasp', 'vulnerability', 'exploit', 'sanitize', 'escape'],
    '• **SQL injection**: user input concatenated into a query. Fix: parameterised queries / an ORM. Never "escape it yourself".\n• **XSS**: attacker-controlled text rendered as HTML. Fix: escape on output, use a framework that escapes by default, avoid `dangerouslySetInnerHTML` on user content, and use a Content-Security-Policy as the backstop.\n• **CSRF**: another site makes the browser send an authenticated request. Fix: SameSite cookies plus a token, and remember that state-changing operations should not be GET.\n• **SSRF**: your server fetches a URL the user supplied — and reaches the cloud metadata endpoint (`169.254.169.254`) or an internal service. Fix: allow-list protocols, resolve DNS and refuse private/loopback/link-local addresses, cap redirects, timeout and size-limit. ARCH\'s knowledge fetcher does exactly this.\n• **Broken access control** remains the #1 real-world problem: check permissions on every object, not just in the UI.\n\nRule of thumb: validate input, escape output, never trust a client-supplied id or role, and keep the dependency list patched.',
    '• **SQL injection**: user input query mein joda gaya. Fix: parameterised query / ORM. "Khud escape kar lunga" kabhi nahi.\n• **XSS**: attacker ka text HTML ban kar render ho gaya. Fix: output par escape, default se escape karne wala framework, user content par `dangerouslySetInnerHTML` nahi, aur backstop ke liye CSP.\n• **CSRF**: doosri site browser se authenticated request karwa deti hai. Fix: SameSite cookie + token, aur state badalne wali cheez GET na ho.\n• **SSRF**: aapka server user ke diye URL ko fetch karta hai — aur cloud metadata (`169.254.169.254`) ya internal service tak pahunch jaata hai. Fix: protocol allow-list, DNS resolve karke private/loopback/link-local refuse, redirect cap, timeout, size limit. ARCH ka knowledge fetcher bilkul yahi karta hai.\n• **Broken access control** asli duniya ki #1 problem hai: har object par permission check, sirf UI mein nahi.\n\nRule: input validate, output escape, client ke diye id/role par bharosa nahi, aur dependency list patched.',
    ['security-authn-authz', 'security-secrets'],
  ),

  // ---------------------------------------------------------------- testing & code
  L(
    'testing-pyramid',
    'The test pyramid, and what to test where',
    'testing',
    ['what is the test pyramid', 'unit vs integration test', 'how many tests', 'what is end to end testing'],
    ['unit', 'integration', 'e2e', 'pyramid', 'test', 'tests', 'coverage', 'flaky', 'mock'],
    '• **Unit tests** — one function/class, no I/O, milliseconds. Fast feedback while you design. Most of your tests live here.\n• **Integration tests** — your code against a *real* dependency (a database, the HTTP layer). This is where the interesting bugs are: transactions, tenancy, migrations, auth. ARCH runs these against a real PostgreSQL.\n• **End-to-end tests** — the product through the front door. Slow and flaky, so keep them few and aimed at the journeys that must never break (sign up, declare an incident, publish a status page).\n\n• **Flaky tests are worse than missing tests**: they teach the team to ignore red. Quarantine, fix, or delete — never re-run until green.\n• **Coverage is a smoke detector, not a goal.** 40% with tenancy and permission tests beats 90% of getters.\n• Test the *contract* (statuses, error shapes, invariants), not the implementation, or every refactor becomes a test rewrite.',
    '• **Unit tests** — ek function/class, koi I/O nahi, milliseconds. Design karte waqt fast feedback. Zyadatar tests yahin.\n• **Integration tests** — aapka code *asli* dependency ke saath (database, HTTP layer). Asli bugs yahin milte hain: transactions, tenancy, migrations, auth. ARCH yeh asli PostgreSQL par chalata hai.\n• **End-to-end tests** — product front door se. Slow aur flaky, isliye kam rakho aur un journeys par jinka kabhi tootna allowed nahi (sign up, incident declare, status page publish).\n\n• **Flaky test missing test se bura hai**: team red ignore karna seekh leti hai. Quarantine, fix ya delete — green hone tak re-run kabhi nahi.\n• **Coverage smoke detector hai, goal nahi.** Tenancy aur permission tests wala 40%, 90% getters se better hai.\n• *Contract* test karo (status, error shape, invariant), implementation nahi — warna har refactor test rewrite ban jaata hai.',
    ['arch-testing', 'infra-cicd'],
  ),
  L(
    'arch-testing',
    'Regression tests for incidents (the test you write after an outage)',
    'testing',
    ['test after incident', 'how to prevent repeat incidents', 'regression test incident'],
    ['regression', 'incident', 'prevent', 'repeat', 'postmortem'],
    'The most valuable test in an incident-driven product is the one written *from* the outage: it encodes "this must never happen again" in a place CI enforces.\n\nHow to do it well:\n1. Reproduce the failure in a test that fails today (if you cannot reproduce it, you do not yet understand it).\n2. Assert the **invariant**, not the exact symptom — "a stale webhook signature leaves zero rows", not "this log line is missing".\n3. Put it where it runs on every PR, and name it after the incident or the rule it protects.\n\n• ARCH\'s suite is built this way: cross-tenant probing returns 404, an unsigned webhook leaves nothing behind, an illegal status transition is rejected, and a chat turn cannot invent an incident.\n• An action item without a test is a wish.',
    'Incident-driven product mein sabse keemti test wahi hai jo outage se likha jaae: woh "aisa dobara nahi hoga" ko CI mein enforce kar deta hai.\n\nSahi tarika:\n1. Failure ko aise test mein reproduce karo jo aaj fail hota hai (reproduce na kar sako to abhi samjha nahi).\n2. **Invariant** assert karo, exact symptom nahi — "purani webhook signature par zero row banti hai", na ki "yeh log line missing hai".\n3. Aisi jagah rakho jo har PR par chale, aur naam incident ya us rule se rakho jise protect karta hai.\n\n• ARCH ka suite isi tarah bana hai: cross-tenant probe 404, unsigned webhook se kuch nahi banta, illegal status transition reject, aur chat turn incident invent nahi kar sakta.\n• Bina test wala action item ek wish hai.',
    ['testing-pyramid', 'ops-postmortem'],
  ),
  L(
    'code-git',
    'Git: branches, rebase and code review',
    'testing',
    ['what is the difference between merge and rebase', 'git best practices', 'trunk based development', 'how to review code',
      'merge or rebase',
      'merge vs rebase',
      'git rebase vs merge',
      "what is a code review",
      "code review"],
    ['git', 'merge', 'rebase', 'branch', 'commit', 'squash', 'review', 'trunk', 'monorepo', 'semver'],
    '• **Merge** keeps history as it happened and creates a merge commit. **Rebase** replays your commits on top of the target for a linear history — never rebase a branch other people are working on.\n• **Small, focused commits/PRs** review faster and revert cleaner. One vertical slice per PR is the rule ARCH uses.\n• **Trunk-based development**: short-lived branches, merge to main often, feature flags for incomplete work. It removes the multi-week merge-conflict tax of long branches.\n• **Code review** should check: correctness against the requirement, security/tenancy boundaries, error handling and observability, tests that would catch a regression, and readability for the next person. Style is a linter\'s job, not a reviewer\'s.\n• **Semantic versioning** (MAJOR.MINOR.PATCH) tells consumers what a change costs them; a changelog written for a human tells them why they care.\n\n• Convention beats preference: `feat(incidents): ...`, `fix(auth): ...` — the log becomes searchable history.',
    '• **Merge** history jaisi thi waisi rakhta hai (merge commit banta hai). **Rebase** aapke commits ko target par replay karke linear history banata hai — jis branch par doosre log kaam kar rahe hain use kabhi rebase nahi.\n• **Chhote focused commits/PRs** jaldi review hote hain aur saaf revert hote hain. ARCH ka rule: ek PR mein ek vertical slice.\n• **Trunk-based development**: chhoti branches, often main par merge, adhura kaam feature flag ke peeche. Lambi branches ka multi-week merge tax khatam.\n• **Code review** mein dekho: requirement ke against correctness, security/tenancy boundaries, error handling aur observability, aur wo tests jo regression pakdenge. Style linter ka kaam hai.\n• **Semantic versioning** (MAJOR.MINOR.PATCH) consumer ko batata hai change kitna mehnga hai; insaan ke liye likha changelog batata hai kyun matter karta hai.\n\n• Convention preference se jeetta hai: `feat(incidents): ...`, `fix(auth): ...`.',
    ['testing-pyramid', 'infra-cicd'],
  ),
  L(
    'perf-latency',
    'Latency, percentiles and where time goes',
    'performance',
    ['what is p99 latency', 'why is my app slow', 'latency vs throughput', 'how to profile'],
    ['latency', 'p50', 'p95', 'p99', 'percentile', 'throughput', 'slow', 'profile', 'profiling', 'gc'],
    '• **Latency** = how long one request takes. **Throughput** = how many per second. They trade off: batching raises throughput and latency.\n• **Never trust the average.** Averages hide the users who are suffering. Report **p50/p95/p99** — and remember p99 means 1 in 100 requests, which on a busy API is thousands of people per hour.\n• A slow endpoint is almost always one of: a missing index or N+1 query, a synchronous call to something slow, no timeout (so one slow dependency stalls everything), lock contention, or GC/CPU pressure.\n• **Find it before you fix it**: add timing per stage (DB, cache, dependencies), then look at a trace for a slow request. Optimising the part you *think* is slow is how teams spend a week for 2%.\n\n• If latency matters, cache the expensive read, make the slow call asynchronous, and give every call a deadline.',
    '• **Latency** = ek request kitna time leti hai. **Throughput** = per second kitni. Trade-off hai: batching throughput badhata hai, latency bhi.\n• **Average par kabhi bharosa nahi.** Average un users ko chhupa deta hai jo takleef mein hain. **p50/p95/p99** report karo — aur yaad rakho p99 matlab 100 mein 1 request, busy API par yeh ghante bhar mein hazaaron log hote hain.\n• Slow endpoint almost always inme se ek hai: missing index ya N+1 query, kisi slow cheez ka synchronous call, timeout nahi (ek slow dependency sab kuch rok deta hai), lock contention, ya GC/CPU pressure.\n• **Fix se pehle dhundho**: har stage ka timing add karo (DB, cache, dependency), phir slow request ka trace dekho. "Lagta hai yahi slow hai" par optimise karna ek hafta aur 2% faayda deta hai.\n\n• Latency matter karti hai to mehnga read cache karo, slow call async karo, aur har call ko deadline do.',
    ['db-indexes', 'ops-timeouts-retries'],
  ),

  // ---------------------------------------------------------------- ai
  L(
    'ai-llm-basics',
    'How LLMs work (tokens, parameters, context)',
    'ai',
    ['how do llms work', 'what is a large language model', 'what is a token', 'what is context window', 'what is a transformer',
      'context window',
      'what is a context window',
      'token limit'],
    ['llm', 'transformer', 'token', 'tokens', 'parameter', 'parameters', 'context', 'window', 'attention', 'gpt', 'training'],
    'A **large language model** is a neural network (usually a **transformer**) trained to predict the next **token** — a chunk of text, roughly ¾ of a word. Do that at enormous scale over internet-scale text and the model learns grammar, facts, code and reasoning patterns.\n\nVocabulary you will meet:\n• **Parameters**: the learned weights (billions). Bigger ≈ more capable, more expensive, slower.\n• **Context window**: how many tokens the model can see at once (the prompt + the answer). Everything it "knows" about your question must fit here.\n• **Temperature**: randomness. Low = deterministic and repetitive, high = creative and more likely to drift.\n• **Training vs inference**: training is the months-long, GPU-heavy phase; inference is the per-request forward pass (still GPU-bound for real models).\n• **Quantization**: shrinking weights (e.g. 4-bit) so a model runs on cheaper hardware — a small quality cost for a large cost win.\n\n• The model has no memory between calls by itself: any "memory" is something the application stores and replays into the context — exactly what ARCH does with its memory panel.',
    '**Large language model** ek neural network (usually **transformer**) hai jo agla **token** predict karna seekhta hai — token text ka tukda, lagbhag ¾ word. Internet-scale text par yeh bahut bade scale par karo, to grammar, facts, code aur reasoning patterns seekh jaata hai.\n\nZaroori vocabulary:\n• **Parameters**: learned weights (billions). Bada ≈ zyada capable, zyada mehnga, slow.\n• **Context window**: ek baar mein kitne token dekh sakta hai (prompt + answer). Aapke sawaal ka pura context isme fit hona chahiye.\n• **Temperature**: randomness. Kam = deterministic, zyada = creative par drift ka risk.\n• **Training vs inference**: training mahine bhar ka GPU kaam; inference per-request forward pass (asli models par still GPU-bound).\n• **Quantization**: weights chhota karna (jaise 4-bit) taaki sasta hardware kaafi ho — thoda quality loss, bahut cost bachat.\n\n• Model ko calls ke beech apni memory nahi hoti: jo "memory" dikhti hai wo application store karke context mein dobara bhejti hai — ARCH ka memory panel bilkul yahi karta hai.',
    ['ai-rag', 'ai-hallucination', 'arch-model'],
  ),
  L(
    'ai-rag',
    'RAG, embeddings and vector search',
    'ai',
    ['what is rag', 'what is an embedding', 'what is a vector database', 'how to give llm my data'],
    ['rag', 'embedding', 'embeddings', 'vector', 'retrieval', 'chunk', 'chunking', 'pgvector', 'database'],
    '**RAG (retrieval-augmented generation)** = look things up first, then let the model answer using what you found. It is how you make a model useful about *your* data without training it.\n\nThe pipeline:\n1. **Chunk** your documents into passages (a few hundred tokens, split on headings).\n2. **Embed** each chunk — a **vector** (a list of numbers) that represents its meaning.\n3. At question time, embed the question and fetch the nearest chunks (cosine similarity).\n4. Put those passages in the prompt and require the answer to cite them.\n\n• **Hybrid retrieval** (keyword scoring + vector similarity) beats either alone: acronyms and error codes match by keyword, paraphrases match by meaning.\n• **You do not need a vector database to start.** 5 000 chunks in Postgres, scored in memory, is fast and exact — add an ANN index (pgvector) when scale demands it.\n• RAG reduces hallucination but does not remove it: require citations, and answer "I do not have that" when retrieval is weak. ARCH does both.',
    '**RAG (retrieval-augmented generation)** = pehle lookup karo, phir model ko usi ke aadhaar par jawab dene do. Apne data par model kaam layak banane ka tarika yahi hai, bina training ke.\n\nPipeline:\n1. Documents ko **chunk** karo (kuch sau token, headings par todo).\n2. Har chunk ka **embedding** banao — **vector** (numbers ki list) jo uske matlab ko represent karta hai.\n3. Sawaal ke waqt sawaal embed karke sabse nazdeeki chunks lao (cosine similarity).\n4. Wo passages prompt mein daalo aur jawab ko unhe cite karna zaroori banao.\n\n• **Hybrid retrieval** (keyword + vector) dono se behtar hai: acronym aur error code keyword se match hote hain, paraphrase meaning se.\n• **Shuru karne ke liye vector database zaroori nahi.** Postgres mein 5 000 chunks, memory mein scored, fast aur exact hai — ANN index (pgvector) tab jab scale majboor kare.\n• RAG hallucination kam karta hai, khatam nahi: citations lazmi karo, aur retrieval kamzor ho to "mere paas yeh nahi hai" bolo. ARCH dono karta hai.',
    ['ai-llm-basics', 'ai-hallucination', 'arch-knowledge'],
  ),
  L(
    'ai-hallucination',
    'Hallucination, and how to actually reduce it',
    'ai',
    ['what is hallucination in ai', 'why do llms make things up', 'how to stop ai hallucinating'],
    ['hallucination', 'hallucinate', 'confabulation', 'grounding', 'citation', 'accurate'],
    'A model that predicts plausible text will sometimes predict plausible *and false* text — an invented API, a version that never shipped, an incident that never happened. This is not lying; it is the objective function doing its job without a source of truth.\n\nWhat genuinely helps (in order of effect):\n1. **Ground the answer**: retrieve real sources and answer only from them.\n2. **Require citations** the reader can click. If a claim cannot be cited, drop the claim.\n3. **Say "I do not know"** as a first-class answer, and make the interface reward it.\n4. **Keep a human in the loop** for anything that changes state: draft → review → apply.\n5. **Evaluate** with a golden set on every change — measure, do not vibe-check.\n\nWhat does not help much: telling the model "do not hallucinate", or raising the temperature down to zero and hoping.\n\n• ARCH\'s design is the extreme version of 1–4: answers are selected from rows the engine was handed, each fact carries a citation, and nothing on the incident changes without human approval. A templated answer is less fluent than a generated one — and it cannot invent an outage you never had.',
    'Jo model plausible text predict karta hai, wo kabhi plausible *aur galat* text bhi predict karega — aisi API jo exist nahi karti, wo version jo kabhi ship nahi hua, wo incident jo hua hi nahi. Yeh jhoot nahi hai; yeh objective function ka kaam hai, bina kisi source-of-truth ke.\n\nJo asli mein madad karta hai (effect ke order mein):\n1. **Answer ko ground karo**: asli sources retrieve karo aur sirf unse jawab do.\n2. **Citations lazmi** karo jo reader click kar sake. Jo claim cite na ho, wo claim hata do.\n3. **"Mujhe nahi pata"** ko first-class answer banao, aur UI usko reward kare.\n4. State badalne wale kaam mein **insaan ko loop mein** rakho: draft → review → apply.\n5. Har change par **golden set** se eval karo — vibe-check nahi, measure.\n\nZyada kaam nahi karta: model ko "hallucinate mat karo" bolna, ya temperature 0 karke ummeed karna.\n\n• ARCH ka design 1–4 ka extreme version hai: jawab un rows se chunte hain jo engine ko di gayi thi, har fact ke saath citation, aur approval ke bina incident par kuch nahi badalta. Templated answer generated se kam fluent hai — par wo aisa outage invent nahi kar sakta jo kabhi hua hi nahi.',
    ['ai-rag', 'ai-llm-basics', 'arch-model'],
  ),
  L(
    'ai-local-vs-api',
    'Running models locally vs calling an API',
    'ai',
    ['can i run an llm locally', 'local llm vs api', 'gpu vs cpu inference', 'ollama vs openai'],
    ['local', 'ollama', 'llama.cpp', 'gpu', 'cpu', 'api', 'vendor', 'offline', 'cost', 'quantized'],
    '• **API (hosted model)**: frontier quality, no hardware, pay per token, and your data leaves your network. Usually the fastest way to ship — and usually blocked in regulated environments.\n• **Local model** (Ollama, llama.cpp, vLLM): open weights on your own hardware, no vendor, no per-token cost, works offline. On **CPU** a 3–7B quantized model is usable for short answers but not interactive-speed writing; on a GPU it becomes genuinely fast.\n• **Hybrid** is often the honest answer: a small local model writes the prose, a deterministic engine supplies the facts and does the deciding. If the model is slow or down, the engine still answers.\n\nPractical sizing for CPU-only: 3B ≈ chat/short summaries, 7B ≈ decent drafting, 13B+ ≈ painful without a GPU. Quantization to 4-bit roughly halves memory for a small quality cost.\n\n• Whatever you pick, keep the *interface* the same (ARCH hides providers behind one adapter) so switching is a config change, not a rewrite.\n• Benchmark on your own workload, not a leaderboard: time-to-first-token on your box with your prompt is the only number that matters.',
    '• **API (hosted model)**: frontier quality, hardware nahi chahiye, per-token paisa, aur data aapka network chhodta hai. Ship karne ka fastest tarika — aur regulated environment mein usually blocked.\n• **Local model** (Ollama, llama.cpp, vLLM): open weights apne hardware par, koi vendor nahi, per-token cost nahi, offline chalta hai. **CPU** par 3–7B quantized model chhote jawab ke liye usable hai, interactive-speed writing ke liye nahi; GPU par genuinely fast.\n• **Hybrid** aksar imaandaar jawab hai: chhota local model prose likhta hai, deterministic engine facts deta hai aur decisions karta hai. Model slow ya down ho to engine phir bhi answer deta hai.\n\nCPU-only practical sizing: 3B ≈ chat/chhote summary, 7B ≈ theek drafting, 13B+ ≈ GPU ke bina mushkil. 4-bit quantization memory lagbhag aadhi karta hai, thoda quality loss.\n\n• Jo bhi chuno, *interface* ek rakho (ARCH providers ko ek adapter ke peeche chhupata hai) taaki switching config change ho, rewrite nahi.\n• Apne workload par benchmark karo, leaderboard par nahi: aapke box par aapke prompt ke saath time-to-first-token hi asli number hai.',
    ['ai-llm-basics', 'arch-model', 'arch-decisions'],
  ),
  L(
    'ai-classic-ml',
    'Classic ML (and why it is often enough)',
    'ai',
    ['what is machine learning', 'what is naive bayes', 'what is tf-idf', 'do i need a neural network'],
    ['ml', 'bayes', 'classifier', 'classification', 'tf-idf', 'similarity', 'cosine', 'training', 'precision', 'recall'],
    'Not every problem needs a neural network. The classic toolkit is small, fast, explainable and runs on a CPU:\n\n• **Naive Bayes**: text classification (severity, category) from labelled examples. Trains in milliseconds, gives probabilities, easy to audit — ARCH uses exactly this for "what kind of failure is this?" and "how bad is it?".\n• **TF-IDF + cosine similarity**: find previous incidents that look like this one, by word overlap. Honest, debuggable, and excellent on short technical text.\n• **Dense embeddings**: same idea but by *meaning*, so paraphrases match. Best used blended with TF-IDF (hybrid), not instead of it.\n• **Metrics that matter**: precision (of the ones we flagged, how many were real), recall (of the real ones, how many we caught) and a **calibration** check (when it says 80%, is it right 80% of the time?). Accuracy alone is a trap on imbalanced data.\n\nRule of thumb: reach for a neural network when the classic model plateaus *and* you have the data, the evaluation and the compute — not before.',
    'Har problem ke liye neural network nahi chahiye. Classic toolkit chhota, fast, explainable aur CPU par chalta hai:\n\n• **Naive Bayes**: labelled examples se text classification (severity, category). Milliseconds mein train, probability deta hai, audit karna aasan — ARCH bilkul yahi use karta hai ("ye kis type ka failure hai?" aur "kitna bura hai?").\n• **TF-IDF + cosine similarity**: jo incidents pehle iske jaisa hua, word overlap se dhundhna. Imaandaar, debuggable, aur chhote technical text par behtareen.\n• **Dense embeddings**: wahi idea par *matlab* se, isliye paraphrase bhi match hota hai. TF-IDF ke saath blend karo (hybrid), uski jagah nahi.\n• **Asli metrics**: precision (jo flag kiya unme kitne sach the), recall (asli wale kitne pakde) aur **calibration** (jab 80% bole to 80% sahi ho). Sirf accuracy imbalanced data par dhoka hai.\n\nRule: neural network tab jab classic model plateau kar jaae *aur* data, evaluation, compute teenon ho — pehle nahi.',
    ['ai-llm-basics', 'arch-model'],
  ),

  // ---------------------------------------------------------------- arch itself
  L(
    'arch-model',
    'ARCH\'s own model (this workspace\'s AI)',
    'ai',
    ['how does arch ai work', 'what model does arch use', 'are you chatgpt', 'which llm do you use', 'how were you trained'],
    ['arch', 'model', 'trained', 'training', 'native', 'vendor', 'offline', 'workspace'],
    'ARCH runs **its own model on this server** — no vendor, no API key, and with `ARCH_OFFLINE_ONLY=true` (the default) nothing leaves the deployment.\n\nWhat it actually is: intent classification + a Naive Bayes classifier for failure category and severity, TF-IDF/embedding retrieval over *your* resolved incidents (plus a built-in library of failure patterns), and templates that fill in the retrieved facts. It trains on your history, and every answer cites what it used.\n\nThe honest trade: this cannot write fluent essays or reason about the wider world the way a frontier model can. What it can do is answer about *your* incidents in milliseconds, for free, deterministically, and without ever inventing an outage you never had.\n\n• If you want fluent prose on a familiar topic, ARCH supports an opt-in local LLM (`AI_PROVIDER="arch-hybrid"`) that runs on the same machine; if it is slow or down, the native engine answers.',
    'ARCH **apna model isi server par** chalata hai — koi vendor nahi, koi API key nahi, aur `ARCH_OFFLINE_ONLY=true` (default) ke saath kuch bhi deployment se bahar nahi jaata.\n\nAsal mein kya hai: intent classification + failure category/severity ke liye Naive Bayes, *aapke* resolved incidents par TF-IDF/embedding retrieval (aur ek built-in failure patterns library), aur templates jo retrieved facts bharte hain. Aapki history par train hota hai, aur har answer cite karta hai ki kya use hua.\n\nImaandaar trade: yeh frontier model jaisa fluent essay ya duniya bhar ka reasoning nahi kar sakta. Par *aapke* incidents ke baare mein milliseconds mein, free, deterministic jawab de sakta hai — aur aisa outage kabhi invent nahi karega jo hua hi nahi.\n\n• Fluent prose chahiye to ARCH ek opt-in local LLM support karta hai (`AI_PROVIDER="arch-hybrid"`) jo usi machine par chalta hai; slow ya down ho to native engine jawab deta hai.',
    ['ai-hallucination', 'ai-local-vs-api', 'arch-decisions'],
  ),
  L(
    'arch-decisions',
    'Why ARCH is built the way it is',
    'ai',
    ['why did arch choose this', 'arch architecture decisions', 'why no redis', 'why no kubernetes'],
    ['decision', 'decisions', 'trade-off', 'tradeoff', 'why', 'modular', 'outbox', 'postgres'],
    'The short version of ARCH\'s engineering choices:\n\n• **Modular monolith**, one web process + one worker: the fastest thing to build, test and debug at this scale. Microservices would add network failure modes without adding customers.\n• **PostgreSQL for everything**, including the job queue (an outbox table) — no Redis, because the product does not yet need it and every extra service is another thing to run at 3 a.m.\n• **Own model instead of a vendor API**: incident data is sensitive, per-token costs punish the "everyone can be in the tool" pricing model, and a grounded engine cannot invent an incident.\n• **Every mutation is audited**, every tenant query is scoped by `organizationId`, and cross-tenant ids answer 404 so existence cannot leak.\n• **Draft → human approval → apply** for anything the AI produces: the AI advises, a responder decides.\n\n• The rule behind all of them: pick the boring option until a specific, named constraint forces the interesting one — and write down which constraint it was.',
    'ARCH ki engineering choices, chhote mein:\n\n• **Modular monolith**, ek web process + ek worker: is scale par build/test/debug karne ka fastest tarika. Microservices network failure modes add karte, customers nahi.\n• **Sab kuch PostgreSQL**, job queue bhi (outbox table) — Redis nahi, kyunki product ko abhi zaroorat nahi aur har extra service 3 baje raat ka ek aur sar dard hai.\n• **Vendor API ki jagah apna model**: incident data sensitive hai, per-token cost "sab log tool mein aa sakte hain" pricing ko todti hai, aur grounded engine incident invent nahi kar sakta.\n• **Har mutation audited**, har tenant query `organizationId` se scoped, aur cross-tenant id par 404 taaki existence leak na ho.\n• AI jo banaye uske liye **draft → insaan ka approval → apply**: AI advise karta hai, responder decide karta hai.\n\n• Sabke peeche rule: boring option chuno jab tak koi specific, naam-wala constraint interesting option force na kare — aur likho wo constraint kaunsa tha.',
    ['arch-model', 'infra-monolith-microservices', 'ops-12factor'],
  ),
  L(
    'arch-api',
    'Designing an API people can trust',
    'web',
    ['how to design a rest api', 'api best practices', 'api versioning'],
    ['api', 'versioning', 'pagination', 'idempotent', 'response', 'contract', 'openapi'],
    'An API is a contract. The parts that decide whether people like yours:\n\n• **Consistent shapes**: same envelope for success and failure, errors with a stable code plus a human message, and a request id you can quote in a support ticket.\n• **Correct status codes**: 201 for created, 202 for accepted, 204 for no content, 409 conflict, 422 validation — and never 200 with an error inside.\n• **Pagination** on every list, with a hard maximum page size. Unbounded lists are how a client takes your database down.\n• **Versioning** from day one (a path prefix is enough) and a deprecation policy with dates.\n• **Idempotency** for anything a client will retry (accept an idempotency key).\n• **Rate limits** with `429` + `Retry-After`, so a retry storm is impossible.\n• **Auth on every endpoint**, scoped tokens, and least privilege per scope.\n\n• Best documentation is the one that cannot drift: generate it from the schema, and test the contract in CI.',
    'API ek contract hai. Jo cheezein tay karti hain ki log aapka API pasand karenge:\n\n• **Same shapes**: success aur failure ka ek envelope, error mein stable code + insaan ke liye message, aur ek request id jo support ticket mein quote ho sake.\n• **Sahi status code**: 201 created, 202 accepted, 204 no content, 409 conflict, 422 validation — aur "200 with error inside" kabhi nahi.\n• **Har list par pagination**, hard max page size. Unbounded list se client aapka database gira deta hai.\n• **Versioning** pehle din se (path prefix kaafi hai) aur deprecation policy dates ke saath.\n• **Idempotency** un sab cheezon ke liye jine retry hongi (idempotency key accept karo).\n• **Rate limit** `429` + `Retry-After` ke saath, taaki retry storm namumkin ho.\n• **Har endpoint par auth**, scoped token, aur per-scope least privilege.\n\n• Sabse acchi documentation wahi hai jo drift na kare: schema se generate karo, aur CI mein contract test karo.',
    ['web-rest-graphql', 'security-authn-authz', 'arch-webhooks'],
  ),
  L(
    'arch-webhooks',
    'Webhooks that do not lie',
    'web',
    ['how to secure a webhook', 'webhook best practices', 'webhook signature verification'],
    ['webhook', 'webhooks', 'signature', 'hmac', 'delivery', 'retry', 'payload'],
    'A webhook is an untrusted HTTP request that must be treated like a public API endpoint:\n\n1. **Verify the signature** over the **raw body** with a shared secret, and include a **timestamp** so an old delivery cannot be replayed.\n2. **Deduplicate** by the provider\'s delivery id — senders retry, and "retry" means "the same event twice".\n3. **Validate** the payload with a schema; reject unknown shapes loudly instead of writing half a row.\n4. **Respond fast** — 2xx quickly, then do the work asynchronously. A slow handler gets retried and multiplies the load.\n5. **Log every attempt** (accepted, duplicate, rejected, failed) so support can answer "did you get our alert?".\n\n• Never parse-then-verify: re-serialising JSON can change bytes and break a valid signature. Verify the bytes you received.\n• A bad signature should leave **zero** rows behind — that invariant deserves a test, and ARCH has one.',
    'Webhook ek untrusted HTTP request hai, ise public API endpoint ki tarah treat karo:\n\n1. Raw body par **signature verify** karo shared secret se, aur **timestamp** rakho taaki purani delivery replay na ho.\n2. Provider ke delivery id se **deduplicate** karo — sender retry karta hai, aur retry matlab "wahi event dobara".\n3. Payload ko schema se **validate** karo; unknown shape par loudly reject karo, aadha row likhne ke bajaye.\n4. **Fast respond** karo — jaldi 2xx, kaam async mein. Slow handler retry hone lagta hai aur load multiply hota hai.\n5. Har attempt **log** karo (accepted, duplicate, rejected, failed) taaki support "aapko hamara alert mila?" ka jawab de sake.\n\n• Parse-then-verify kabhi nahi: JSON dobara serialise karne se bytes badalte hain aur valid signature toot jaata hai. Jo bytes mile, unhi par verify karo.\n• Galat signature par **zero** row banni chahiye — is invariant ka test hona chahiye, aur ARCH ke paas hai.',
    ['security-secrets', 'arch-api', 'ops-idempotency'],
  ),
  L(
    'arch-status-page',
    'Status pages people actually trust',
    'ops',
    ['how to write a status update', 'status page best practices', 'incident communication'],
    ['status', 'page', 'communication', 'update', 'customer', 'subscriber', 'transparency'],
    'A status page is a promise to your customers. What makes one trusted:\n\n• **Update on a cadence**, not when you feel like it. Even "we are still investigating, next update in 30 minutes" beats silence — silence reads as chaos.\n• **Say what customers feel, not what your dashboard shows**: "checkout requests are failing for some users in India" beats "elevated 5xx rate on pod-3".\n• **Internal notes stay internal.** Drafts are drafts; a human approves before anything is published (ARCH enforces exactly this).\n• **Publish the resolved message with a cause**, briefly and factually. "A bad deploy was rolled back at 14:10; no data loss" is enough.\n• **Do not delete history.** Post-incident, the timeline of updates is the evidence that you told the truth at the time.\n\n• During an incident, the status update is usually the highest-value thing a non-debugging engineer can do: it stops fifty people from asking about it.',
    'Status page customer se ek promise hai. Jo ise trustworthy banata hai:\n\n• **Cadence par update**, mood par nahi. "Abhi investigate kar rahe hain, 30 minute mein next update" bhi chuppi se behtar hai — chuppi chaos lagti hai.\n• **Customer jo feel karta hai wo likho**, dashboard ka number nahi: "India ke kuch users ke liye checkout fail ho raha hai" > "pod-3 par elevated 5xx rate".\n• **Internal note internal rahe.** Draft draft hai; publish se pehle insaan approve kare (ARCH ise enforce karta hai).\n• **Resolved message cause ke saath** publish karo, chhota aur factual. "Bad deploy 14:10 par roll back hua; data loss nahi" kaafi hai.\n• **History delete na karo.** Incident ke baad updates ki timeline hi proof hai ki aapne sach bola.\n\n• Incident ke dauraan status update aksar non-debugging engineer ka sabse valuable kaam hota hai: pachaas log poochhna band kar dete hain.',
    ['arch-decisions', 'ops-postmortem'],
  ),
  L(
    'arch-knowledge',
    'Making a knowledge base that gets used',
    'ops',
    ['how to build a knowledge base', 'runbook knowledge base', 'internal documentation',
      'documentation',
      'internal docs',
      'how to write documentation'],
    ['knowledge', 'base', 'documentation', 'docs', 'wiki', 'index', 'search'],
    'Most "knowledge bases" fail because writing them competes with firefighting. What works:\n\n• **Capture during the incident**: the commands that actually fixed it, pasted into a note. Clean it up later; write it *then*.\n• **One page per topic**, titled after the thing the responder will search for ("Redis cache misses", not "Caching strategy discussion").\n• **Short, numbered steps with expected output.** A 40-page document nobody finishes is worse than 10 lines that work.\n• **Index it where the work happens** — linked from the alert, from the service, from the chat. If retrieval is a separate tool people must remember, they will not use it.\n• **Make it searchable the way people ask**: ARCH embeds your knowledge sources and cites the exact passage it used, so "what does our runbook say about redis?" is answerable in chat.\n\n• Date and own every page. Stale runbooks are actively dangerous: they waste the one minute you can least afford.',
    'Zyadatar "knowledge base" isliye fail hote hain kyunki likhna aag bujhane se compete karta hai. Jo chalta hai:\n\n• **Incident ke dauraan capture karo**: jo commands sach mein fix kiye, note mein paste karo. Baad mein saaf karo; likho *tabhi*.\n• **Ek topic ek page**, naam wahi jo responder search karega ("Redis cache misses", na ki "Caching strategy discussion").\n• **Chhote numbered steps, expected output ke saath.** 40 page wala document jo koi pura nahi padhta, 10 line se bura hai jo kaam karti hai.\n• **Wahin index karo jahan kaam hota hai** — alert se, service se, chat se linked. Alag tool yaad rakhna pade to koi use nahi karega.\n• **Jaisa log poochte hain waisa searchable banao**: ARCH aapke knowledge sources embed karta hai aur exactly wahi passage cite karta hai, isliye "hamara runbook redis par kya kehta hai?" chat mein answerable hai.\n\n• Har page par date aur owner. Purane runbook actively khatarnak hain: wo wahi ek minute barbaad karte hain jo aap sabse kam afford kar sakte ho.',
    ['ops-runbook', 'ai-rag'],
  ),
  // ---------------------------------------------------------------- operating systems / runtime
  L(
    "sys-process-thread",
    "Processes, threads and thread pools",
    "systems",
    ["process vs thread", "difference between process and thread", "what is a thread", "what is a thread pool"],
    ["process", "thread", "threadpool", "concurrency", "parallelism", "context"],
    "**A process** is a running program with its own memory; **threads** are execution paths *inside* one process that share that memory. Sharing is what makes threads cheap (no copying) and what makes them dangerous (one thread's bad write is everyone's bug).\n\nSwitching between processes costs more than switching between threads, which is why servers use a **thread pool**: a fixed set of workers pulling from a queue, so each request does not pay a thread-creation cost.\n\n• CPU-bound → workers ≈ cores (more only adds contention).\n• I/O-bound → more workers than cores, because they spend most of their time waiting.\n• Memo for sizing a pool: `cores × (1 + wait time / service time)`.",
    "**Process** ek chalta hua program hai jiski apni memory hoti hai; **threads** usi process ke andar chalne wale raste hain jo memory share karte hain. Sharing se threads saste hain (copy nahi karni padti) aur sharing se hi khatarnaak bhi (ek thread ki galti sabki bug).\n\nProcess switch karna thread switch se mehnga hai, isliye servers **thread pool** use karte hain: fixed workers ek queue se kaam uthate hain, har request par thread banane ka kharcha nahi.\n\n• CPU-bound → workers ≈ cores.\n• I/O-bound → cores se zyada workers, kyunki wo zyadatar wait karte hain.",
    ["sys-gc-memory", "sys-deadlock-race", "perf-latency"],
  ),
  L(
    "sys-gc-memory",
    "Garbage collection and memory leaks",
    "systems",
    ["what is garbage collection", "what is a memory leak", "why is my memory growing", "out of memory"],
    ["gc", "garbage", "collection", "memory", "leak", "heap", "oom"],
    "**Garbage collection** reclaims memory that is no longer reachable, so you do not free it by hand (C, C++ and Rust make you manage it another way). Every GC trades latency for safety: a collector that stops the world for 200 ms shows up as a p99 spike in your metrics.\n\nA **memory leak** in a GC language means objects are still *reachable* but never used again — growing caches, listeners never removed, unbounded queues. The process grows until it is OOM-killed or the machine starts swapping.\n\n• Watch heap over time *after* forcing a GC (`--expose-gc`, heap snapshots, `pprof`); that separates a real leak from ordinary churn.\n• The usual fix is a bound: max cache size, unsubscribe on teardown, TTL on the queue.",
    "**Garbage collection** un memory ko wapas leta hai jo ab reachable nahi hai, isliye manually free nahi karna padta (C, C++ aur Rust mein zimmedari aapki). Har GC latency se safety kharidta hai: 200 ms ka stop-the-world aapke p99 spike mein dikh jaata hai.\n\nGC language mein **memory leak** ka matlab: objects abhi bhi *reachable* hain par kabhi use nahi honge — badhti hui cache, hataye na gaye listeners, unbounded queues. Process tab tak badhta hai jab tak OOM-kill na ho.\n\n• Force-GC ke *baad* heap ko time ke saath dekho (`--expose-gc`, heap snapshot, `pprof`) — tab pata chalta hai leak asli hai ya normal churn.\n• Fix aksar ek bound hota hai: max cache size, teardown par unsubscribe, queue par TTL.",
    ["perf-latency", "sys-deadlock-race"],
  ),
  L(
    "sys-deadlock-race",
    "Deadlocks and race conditions",
    "systems",
    ["what is a deadlock", "what is a race condition", "lost update", "why is my update lost"],
    ["deadlock", "race", "condition", "lock", "mutex", "transaction", "atomic"],
    "**A race condition** is two flows touching the same state without an order: both read 5, both write 6, one update is lost. It shows up only under load, which is why it survives testing.\n\n**A deadlock** is two locks taken in opposite orders — A waits for B's lock while B waits for A's. It is permanent, not slow.\n\n• Fix races with an atomic operation or a single owner of the state — never with more `sleep`.\n• Fix deadlocks by always taking locks in one documented order, or by using timeouts so waiting fails instead of freezing.\n• In databases: keep transactions short, and make the write itself the check (`UPDATE ... WHERE status = 'OPEN'`) so two workers cannot both succeed.",
    "**Race condition** tab hota hai jab do flows bina order ke same state ko chhoote hain: dono ne 5 padha, dono ne 6 likha, ek update gayab. Yeh sirf load par dikhta hai, isliye testing mein bach jaata hai.\n\n**Deadlock** tab hota hai jab do locks ulta order mein liye jaate hain — A, B ka lock maang raha hai aur B, A ka. Yeh slow nahi, permanent rukawat hai.\n\n• Race ka fix: atomic operation ya state ka ek hi owner — `sleep` badhaana fix nahi hai.\n• Deadlock ka fix: locks hamesha ek hi documented order mein lo, ya timeout rakho taaki wait fail ho, freeze na ho.\n• Database mein: transaction chhota rakho aur write ko hi check banao (`UPDATE ... WHERE status = 'OPEN'`).",
    ["db-acid", "db-event-sourcing", "sys-process-thread"],
  ),
  // ---------------------------------------------------------------- web, continued
  L(
    "web-tcp",
    "TCP, and why connection setup costs",
    "web",
    ["how does tcp work", "what is a tcp handshake", "three way handshake", "what is connection pooling"],
    ["tcp", "handshake", "syn", "packet", "retransmit", "pool"],
    "**TCP** gives an ordered, reliable byte stream on top of an unreliable network: a three-way handshake (SYN, SYN-ACK, ACK) to open, sequence numbers and retransmits to keep order, and a four-way close. A lost packet becomes latency, not corruption.\n\nThat is why **connection setup matters**: TLS adds one or two more round trips, so a fresh connection is far more expensive than a reused one. **Connection pooling** and keep-alive exist to pay that cost once.\n\n• Debug with timings split per phase (`curl -w`, browser waterfall): DNS, TCP, TLS, then server.\n• Always set a timeout. A request that hangs forever is worse than one that fails fast and retries.",
    "**TCP** unreliable network ke upar ordered, reliable byte stream deta hai: kholne ke liye three-way handshake (SYN, SYN-ACK, ACK), order banaye rakhne ke liye sequence numbers aur retransmits, aur band karne ke liye four-way close. Lost packet corruption nahi, latency banta hai.\n\nIsliye **connection setup mehnga** hai: TLS ek-do round trip aur jodta hai, to naya connection reuse se kaafi mehnga padta hai. **Connection pooling** aur keep-alive yahi cost ek hi baar bharte hain.\n\n• Debug karo phase-wise timings se (`curl -w`): DNS, TCP, TLS, phir server.\n• Timeout hamesha rakho — hamesha latka request, jaldi fail hone se bura hai.",
    ["web-http-versions", "web-rate-limit", "infra-service-mesh"],
  ),
  L(
    "web-http-versions",
    "HTTP/1.1 vs HTTP/2 vs HTTP/3",
    "web",
    ["http 2 vs http 3", "what is http 2", "what is http 3", "what is quic"],
    ["http2", "http3", "h2", "h3", "quic", "multiplexing", "head"],
    "**HTTP/1.1** sends one request at a time per connection (pipelining never really worked), so browsers open about six connections per host — head-of-line blocking is normal.\n\n**HTTP/2** multiplexes many streams over one connection and compresses headers. Still TCP underneath: one lost packet stalls every stream on that connection.\n\n**HTTP/3** runs on **QUIC over UDP**, so a lost packet only stalls its own stream, and TLS is folded into the setup (0-RTT on repeat visits). It wins exactly where TCP suffers: lossy wifi and mobile.\n\n• For most apps: enable HTTP/2 at the edge/CDN and let clients negotiate HTTP/3. No app code changes, and the old protocol still works.",
    "**HTTP/1.1** ek connection par ek waqt mein ek request bhejta hai (pipelining kabhi theek se chala hi nahi), isliye browser per host ~6 connections kholte hain — head-of-line blocking normal hai.\n\n**HTTP/2** ek connection par bahut streams multiplex karta hai aur headers compress karta hai. Neeche TCP hi hai: ek packet lost hua to us connection ke saare streams ruk jaate hain.\n\n**HTTP/3** **QUIC (UDP)** par chalta hai — lost packet sirf apna stream rokta hai, aur TLS setup mein hi fold ho jaata hai (repeat visit par 0-RTT). Jahan TCP dukhta hai (lossy wifi, mobile), wahan yeh jeetta hai.\n\n• Aam app ke liye: edge/CDN par HTTP/2 on karo, HTTP/3 clients negotiate kar lenge. App code badalna nahi padta.",
    ["web-tcp", "web-tls", "web-load-balancer"],
  ),
  L(
    "web-rate-limit",
    "Rate limiting, throttling and quotas",
    "web",
    ["what is rate limiting", "what is throttling", "too many requests", "what is a quota",
      "what is a rate limiter",
      "rate limiter",
      "api rate limit"],
    ["rate", "limit", "limiting", "throttle", "throttling", "quota", "429", "token bucket"],
    "**Rate limiting** caps how many requests a caller may make in a window (say 100/minute per API key) and answers **429 Too Many Requests** with `Retry-After`. It protects capacity and stops one noisy caller starving everyone else.\n\n**Throttling** is the softer cousin — slow the caller instead of refusing. A **quota** is the same idea over a longer period (10k/day): a plan boundary as much as a safety one.\n\n• Implement with a token bucket (bursts allowed) or a sliding window; keep the counter in Redis once there is more than one server.\n• Always send `Retry-After`, and exempt health checks — otherwise your own monitoring gets limited.\n• Clients should treat 429 as a signal to back off, not an error to hammer through.",
    "**Rate limiting** tay karta hai ki ek caller window mein kitni requests kar sakta hai (jaise 100/minute per API key) aur **429 Too Many Requests** + `Retry-After` return karta hai. Isse capacity bachti hai aur ek noisy caller sabko starve nahi karta.\n\n**Throttling** thoda narm roop hai — reject karne ke bajaye caller ko dheema karo. **Quota** wahi cheez lambi period par (10k/day) hai: plan ki hadd bhi, safety bhi.\n\n• Token bucket (burst allowed) ya sliding window lagao; ek se zyada server ho to counter Redis mein rakho.\n• `Retry-After` hamesha bhejo, aur health checks ko exempt rakho warna apna hi monitoring limit ho jayega.\n• Client 429 ko back-off ka signal maane, usse ladne ka nahi.",
    ["web-backpressure", "arch-api", "perf-latency"],
  ),
  L(
    "web-backpressure",
    "Backpressure and load shedding",
    "web",
    ["what is backpressure", "what is load shedding", "how to handle overload", "queue is growing",
      "what is load shedding",
      "load shed",
      "load shedding"],
    ["backpressure", "shedding", "overload", "admission", "queue", "saturation"],
    "**Backpressure** is the system pushing back: when consumers cannot keep up, the producer is slowed or told to wait — instead of a queue growing until memory dies.\n\n**Load shedding** is the deliberate version: over capacity, reject the least important traffic fast (a short 503) so the requests you do accept still succeed. Serving 100% of requests badly is worse than serving 80% well.\n\n• Shed on saturation signals: queue depth, latency above target, exhausted connection pools.\n• Shed by priority — health checks and paying traffic first, crawlers and blind retries last.\n• Bound every queue. An unbounded queue is a memory leak wearing a friendly name.",
    "**Backpressure** matlab system peeche se dhakka deta hai: consumer keep up nahi kar pa rahe to producer ko slow karo ya wait karwao — queue ko memory khatam hone tak badhne na do.\n\n**Load shedding** jaan-boojh kar kiya jaata hai: capacity se upar ho to sabse kam zaroori traffic ko turant reject karo (chhota 503), taaki jo accept kiya wo sahi chale. 100% requests kharab tarike se serve karne se 80% acchi tarah serve karna behtar hai.\n\n• Shed karne ke signal: queue depth, target se upar latency, saturate connection pool.\n• Priority se shed karo — health checks aur paying traffic pehle, crawlers aur blind retries aakhir mein.\n• Har queue par bound lagao. Unbounded queue ek memory leak hai.",
    ["web-rate-limit", "ops-alerting", "web-load-balancer"],
  ),

  // ---------------------------------------------------------------- databases, continued
  L(
    "db-oltp-olap",
    "OLTP vs OLAP, warehouses and lakes",
    "databases",
    ["what is oltp", "what is olap", "difference between oltp and olap", "what is a data warehouse", "what is a data lake", "what is etl"],
    ["oltp", "olap", "warehouse", "lake", "etl", "elt", "analytics", "columnar", "dashboard"],
    "**OLTP** is the app database: many small, fast, concurrent transactions (create incident, update status). Row store, indexes, strong consistency.\n\n**OLAP** is analysis: few huge scans over millions of rows (how did MTTR move per service this quarter?). Columnar stores, compression and pre-aggregation win there.\n\n• A **data warehouse** (BigQuery, Snowflake, Redshift) is the OLAP home; a **data lake** keeps raw files cheaply; **ETL/ELT** is the pipeline — the ELT order (load first, transform in the warehouse) is the modern default because storage is cheaper than compute.\n• Never run analytics against your production OLTP database: one careless dashboard query can take the app down.\n• Copy the data out — CDC or a nightly export — and let the analytics store absorb the cost.",
    "**OLTP** app ka database hai: bahut chhote, tez, concurrent transactions (incident banao, status badlo). Row store, indexes, strong consistency.\n\n**OLAP** analysis hai: kam queries par bahut badi scans (is quarter MTTR per service kaisa raha?). Columnar store, compression aur pre-aggregation wahan jeette hain.\n\n• **Data warehouse** (BigQuery, Snowflake, Redshift) OLAP ka ghar hai; **data lake** raw files sasti rakhta hai; **ETL/ELT** pipeline hai — aaj kal load pehle, transform warehouse ke andar (storage compute se sasta hai).\n• Production OLTP database par analytics kabhi mat chalao: ek laparvah dashboard query app gira sakti hai.\n• Data bahar copy karo (CDC ya nightly export) aur cost analytics store ko uthane do.",
    ["db-indexes", "db-replication", "perf-latency"],
  ),
  L(
    "db-event-sourcing",
    "Event sourcing, CQRS and sagas",
    "databases",
    ["what is event sourcing", "what is cqrs", "what is a saga", "what is the outbox pattern"],
    ["event", "sourcing", "cqrs", "saga", "outbox", "commands", "projection", "replay"],
    "**Event sourcing** stores the *events* (what happened) and derives state by replaying them, instead of only keeping the current row. You get a full audit trail and can rebuild any past view — at the cost of versioning every event forever.\n\n**CQRS** splits writes (commands, normalised) from reads (queries, shaped for the screen), so each side scales and evolves separately. Cost: two models to keep honest.\n\n**A saga** replaces the distributed transaction: a sequence of local steps where each has a compensating action if a later step fails (refund, cancel, release).\n\n• Start small: an append-only **outbox** table in the same database as the write gives most of the reliability for none of the infrastructure — write the row and the event in one transaction, then publish from the outbox.\n• Projections are disposable and must be rebuildable from events; if a projection cannot be rebuilt, it is the source of truth by accident.",
    "**Event sourcing** mein *events* (kya hua) store hote hain aur state unhe replay kar ke banti hai, sirf current row nahi. Pura audit trail milta hai aur koi bhi purana view rebuild ho sakta hai — cost yeh hai ki har event schema hamesha ke liye version karna padta hai.\n\n**CQRS** writes (commands, normalised) aur reads (screen ke hisaab se shaped queries) ko alag karta hai, taaki dono apne hisaab se scale ho. Cost: do models sambhalne padte hain.\n\n**Saga** distributed transaction ki jagah aata hai: local steps ka sequence, jismein aage fail hone par har step ka compensating action hota hai (refund, cancel, release).\n\n• Chhote se shuru karo: write wale hi database mein append-only **outbox** table — reliability ka zyadatar hissa bina naye infrastructure ke. Row aur event ek hi transaction mein likho, phir outbox se publish karo.\n• Projections disposable hote hain aur events se rebuild hone chahiye; jo rebuild na ho sake, wo galti se source of truth ban jaata hai.",
    ["db-consistency-models", "infra-queues", "db-acid"],
  ),
  L(
    "db-consistency-models",
    "Strong vs eventual consistency",
    "databases",
    ["eventual consistency", "what is eventual consistency", "strong vs eventual consistency", "read your writes", "stale read"],
    ["consistency", "eventual", "stale", "quorum", "replica", "read", "write"],
    "**Strong consistency**: every read sees the latest write (single-node Postgres, or a quorum write plus quorum read). Slower, and unavailable during a partition.\n\n**Eventual consistency**: reads may be stale for a while, then converge. Fast and partition-tolerant — the CAP trade most distributed stores make by default.\n\n**Read-your-writes** is the practical middle ground: after *you* write, *you* see it. Fix it in the app — route that session's reads to the primary for a few seconds, or carry the version you expect.\n\n• The bug you will actually hit: 'I saved it and it is not there' — a replica read straight after a write. Reproduce it with two browser tabs and a fast click.\n• Never build a uniqueness check (email, slug, dedupe) on an eventually consistent read; do it with a unique index and let the write fail.",
    "**Strong consistency**: har read ko latest write dikhti hai (single-node Postgres, ya quorum write + quorum read). Dheema, aur partition ke dauraan unavailable.\n\n**Eventual consistency**: reads kuch der purani ho sakti hain, phir converge kar jaati hain. Tez aur partition-tolerant — zyadatar distributed stores ka default CAP trade.\n\n**Read-your-writes** beech ka practical raasta hai: *aap* likho to *aap* ko turant dikhe. App mein fix karo — us session ke reads kuch second primary par bhejo, ya expected version carry karo.\n\n• Asli bug jo milega: \"save kiya par dikh nahi raha\" — write ke turant baad replica read. Do tabs aur tez click se reproduce hota hai.\n• Uniqueness check (email, slug) eventual read par kabhi mat banao; unique index lagao aur write ko fail hone do.",
    ["db-cap", "db-replication", "db-acid"],
  ),
  L(
    "db-migrations",
    "Safe schema migrations",
    "databases",
    ["what is a schema migration", "how to migrate a database", "add a column without downtime", "expand contract migration",
      "what is a database migration",
      "database migration"],
    ["migration", "migrations", "schema", "backfill", "column", "expand", "contract", "lock"],
    "A **migration** is a code change that must be backwards compatible, because during a deploy old and new code run side by side.\n\n**Expand → migrate → contract**: add the new column (nullable, with a default), backfill in batches, write both, switch reads, then drop the old column in a later release.\n\n• Adding a column *with* a default rewrote the whole table on older engines; on modern Postgres it is metadata-only — know your version.\n• Adding an index or validating a constraint takes a lock: use `CREATE INDEX CONCURRENTLY` and add constraints `NOT VALID` first, then validate.\n• Long backfills belong in a background job with a batch size and a sleep, never in a startup hook — a migration that runs at boot is an outage with a timer.\n\n• Never edit a migration that has already run in production. Add a new one; the files are history, not a scratchpad.",
    "**Migration** aisa code change hai jo backwards compatible hona chahiye, kyunki deploy ke dauraan purana aur naya code saath chalte hain.\n\n**Expand → migrate → contract**: naya column add karo (nullable, default ke saath), batches mein backfill karo, dono jagah likho, reads switch karo, phir purana column agle release mein drop karo.\n\n• Purane engines par default ke saath column add karne se poori table rewrite hoti thi; modern Postgres mein yeh metadata-only hai — apna version jaano.\n• Index ya constraint validate karna lock leta hai: `CREATE INDEX CONCURRENTLY` use karo aur constraint pehle `NOT VALID` add karo, phir validate.\n• Lamba backfill background job mein ho (batch size + sleep), startup hook mein nahi — boot par chalne wali migration ek timer ke saath outage hai.\n\n• Production mein chal chuki migration ko kabhi edit mat karo. Nayi add karo; files itihaas hain, scratchpad nahi.",
    ["db-indexes", "db-replication", "ops-deploy-strategies"],
  ),
  L(
    "db-connection-pool",
    "Connection pools",
    "databases",
    ["what is a connection pool", "too many database connections", "database connection limit", "pool exhausted"],
    ["connection", "pool", "pooling", "pgbouncer", "checkout", "max_connections"],
    "A **connection pool** keeps a set of open database connections and lends them to request handlers. Opening one costs a TCP+TLS+auth handshake and a server-side process, so reuse is the difference between a fast API and a melting database.\n\n• Size from the database's side, not the app's: engines handle a surprisingly small number of *active* connections well. Start around `cores × 2 + spindles` and measure from there.\n• A pool that is too big is worse than one that is too small — the database spends its time switching and latency rises everywhere.\n• Watch **pool saturation and wait time**. All-busy with rising latency means queueing, not slow queries; that is a pool or capacity problem, not a query problem.\n• Many app instances: put a pooler (PgBouncer, RDS Proxy) in front instead of giving each instance a large pool.\n\n• Classic incident: a deploy doubles the replica count, nobody resizes the pool, the database hits `max_connections` and every request times out at once.",
    "**Connection pool** kuchh khuli database connections rakhta hai aur request handlers ko udhaar deta hai. Nayi connection kholne par TCP+TLS+auth handshake aur server-side process lagta hai, isliye reuse se hi API tez rehti hai warna database melt karta hai.\n\n• Size database ki taraf se decide karo, app ki taraf se nahi: engines thode *active* connections achhe se handle karte hain. `cores × 2 + spindles` se shuru karo aur measure karo.\n• Bada pool chhote se bura hai — database switching mein time lagata hai aur latency har jagah badhti hai.\n• **Pool saturation aur wait time** dekho. Sab busy + badhti latency matlab queueing, slow query nahi — yeh pool ya capacity ka problem hai.\n• Bahut app instances ho to aage pooler (PgBouncer, RDS Proxy) rakho, har instance ko bada pool na do.\n\n• Classic incident: deploy ne replicas double kar diye, kisi ne pool resize nahi kiya, database `max_connections` par pahuncha aur sab requests ek saath timeout ho gayi.",
    ["db-indexes", "perf-latency", "infra-docker-k8s"],
  ),
  // ---------------------------------------------------------------- security, continued
  L(
    "security-oauth-oidc",
    "OAuth, OIDC, JWT and SAML",
    "security",
    ["what is oauth", "what is oidc", "what is jwt", "what is saml", "how does single sign on work"],
    ["oauth", "oidc", "jwt", "saml", "token", "claims", "sso", "refresh"],
    "Sign-in protocols, from the app's point of view:\n\n• **OAuth 2.0** is *authorization*: a user grants an app limited access to their data without handing over a password. It is not a login protocol by itself.\n• **OIDC** is the login layer on top of OAuth: an ID token (a **JWT**) that says who the user is. This is what 'Sign in with Google/Okta' means.\n• **SAML** is the older enterprise equivalent — XML assertions, heavier, still everywhere in B2B.\n• **JWT** is only a signed token format: header, payload, signature. The payload is readable by anyone, so put no secrets in it, and verify signature and expiry server-side on every request.\n\n• Normal web app: OIDC for login, short-lived access tokens, refresh tokens rotated and revocable server-side.\n• Never trust a JWT's `alg` header blindly — pin the algorithms you accept (`alg: none` is a known attack).",
    "App ke nazariye se sign-in protocols:\n\n• **OAuth 2.0** *authorization* hai: user bina password diye app ko apne data ka limited access deta hai. Yeh akela login protocol nahi hai.\n• **OIDC** OAuth ke upar login layer hai: ek ID token (**JWT**) jo batata hai user kaun hai. \"Sign in with Google/Okta\" isi ko kehte hain.\n• **SAML** purana enterprise equivalent hai — XML assertions, bhaari, par B2B mein aaj bhi har jagah.\n• **JWT** sirf ek signed token format hai: header, payload, signature. Payload sab padh sakte hain, isliye usme secret kabhi nahi, aur har request par signature + expiry server-side verify karo.\n\n• Aam web app: login ke liye OIDC, chhote access tokens, refresh tokens rotate + server-side revoke.\n• JWT ka `alg` header aankh band karke trust mat karo — accepted algorithms pin karo (`alg: none` ek known attack hai).",
    ["security-authn-authz", "security-mfa", "arch-api"],
  ),
  L(
    "security-mfa",
    "MFA, passwords and zero trust",
    "security",
    ["what is mfa", "what is two factor", "what is zero trust", "how to secure login", "password breach"],
    ["mfa", "2fa", "factor", "passkey", "webauthn", "zero", "trust", "credential"],
    "• **MFA** is a second proof of identity: something you know (password) plus something you have (TOTP app, hardware key) or are (biometric). It kills the vast majority of credential-stuffing attacks, because a leaked password alone is no longer enough.\n• **Passkeys / WebAuthn** are the strongest common option — phishing-resistant by design, because the secret never leaves the device. Ship them where you can.\n• **SMS codes** are the weakest second factor: SIM-swap and interception are real. Better than nothing, not a target.\n• **Zero trust** means stop treating 'inside the network' as trusted: authenticate and authorise every request, use short-lived identity tokens, and prefer per-service mTLS over a flat private network.\n• Practical hardening order: MFA on admin accounts → password manager + unique passwords → rate limit and lockout on login → alert on impossible-travel and new-device logins.",
    "• **MFA** identity ka doosra proof hai: jo aap jaante ho (password) plus jo aapke paas hai (TOTP app, hardware key) ya jo aap ho (biometric). Isse credential-stuffing attacks ke zyadatar cases mar jaate hain, kyunki sirf leaked password kaafi nahi rehta.\n• **Passkeys / WebAuthn** sabse strong common option hain — phishing-resistant by design, kyunki secret device se bahar jaata hi nahi. Jahan possible ho, ship karo.\n• **SMS codes** sabse kamzor second factor hain: SIM-swap aur interception asli hain. Kuch nahi se behtar, par target nahi.\n• **Zero trust** matlab \"network ke andar hai to trusted hai\" band karo: har request authenticate + authorise karo, chhote identity tokens use karo, aur flat private network ki jagah per-service mTLS rakho.\n• Practical order: admin accounts par MFA → password manager + unique passwords → login par rate limit aur lockout → impossible-travel aur new-device logins par alert.",
    ["security-authn-authz", "security-oauth-oidc", "security-network"],
  ),
  L(
    "security-encryption",
    "Encryption, hashing and keys",
    "security",
    ["difference between hashing and encryption", "how to store passwords", "encryption at rest", "what is a salt", "key rotation",
      "what is a public key",
      "what is a private key",
      "public key cryptography"],
    ["encryption", "hashing", "hash", "salt", "bcrypt", "argon2", "key", "rotate", "at rest"],
    "The words get mixed up, so:\n\n• **Encryption** is reversible with a key — used for data in transit (TLS) and at rest (disk, bucket, column).\n• **Hashing** is one-way — used for passwords and integrity, never to 'encrypt' something you need back.\n• **Signing** proves who wrote a message; it does not hide it.\n\n• **At rest** encryption protects stolen disks and backups. It does not protect against SQL injection — the app still decrypts.\n• **Passwords**: a slow, salted algorithm (**bcrypt / argon2id / scrypt**), never a bare hash, never SHA-256/MD5. The salt is per user and defeats precomputed tables; the slowness makes brute force expensive.\n• **Keys** live in a KMS or secret manager, rotate on a schedule, and never in git or an image. Rotate with a window where old and new both verify, then retire the old one.\n\n• A backup you have never restored is a belief, not a backup — test the restore.",
    "Shabd mix ho jaate hain, to:\n\n• **Encryption** key ke saath reversible hai — transit (TLS) aur rest (disk, bucket, column) ke liye.\n• **Hashing** one-way hai — passwords aur integrity ke liye, us cheez ke liye nahi jo wapas chahiye.\n• **Signing** batata hai message kisne likha; chhupata nahi.\n\n• **At rest** encryption chori hui disk aur backups se bachata hai. SQL injection se nahi — app phir bhi decrypt karti hai.\n• **Passwords**: slow, salted algorithm (**bcrypt / argon2id / scrypt**), kabhi plain hash nahi, kabhi SHA-256/MD5 nahi. Salt per user hota hai aur precomputed tables fail karta hai; slowness brute force mehnga banati hai.\n• **Keys** KMS ya secret manager mein, schedule par rotate, kabhi git ya image mein nahi. Rotation ke waqt purani aur nayi dono kuch time verify karein, phir purani retire.\n\n• Kabhi restore na ki baat backup ek aankda hai, backup nahi — restore test karo.",
    ["security-secrets", "web-tls", "security-owasp"],
  ),
  L(
    "security-network",
    "Firewalls, VPN, WAF and DDoS",
    "security",
    ["what is a firewall", "what is a vpn", "what is nat", "what is a waf", "what is ddos", "what is a security group"],
    ["firewall", "vpn", "nat", "waf", "ddos", "denial", "scrubbing", "zone"],
    "• **Firewall / security group**: an allow-list of ports and sources. Default deny is the only safe default; 'any from anywhere' is a decision you must be able to defend.\n• **VPN**: a private tunnel into the network — useful for admin access, not a replacement for app-level authorisation.\n• **NAT**: many private addresses share one public one. It hides internal topology; it is not a security control by itself.\n• **WAF**: pattern-based filtering for known attacks and bot floods. It reduces noise; it does not fix the bug underneath, and it will miss anything novel or encoded oddly.\n• **DDoS**: the goal is that the flood never reaches your origin — CDN/anycast in front, caching and rate limits behind, and a written plan for 'we are under attack' (who decides, what gets turned off) rather than improvising at 3 a.m.\n\n• Reality check: most breaches still start with credentials, unpatched dependencies and exposed admin panels. Perimeter work does not cover those.",
    "• **Firewall / security group**: ports aur sources ki allow-list. Default deny hi safe default hai; \"any from anywhere\" ek decision hai jise defend kar pana chahiye.\n• **VPN**: network mein private tunnel — admin access ke liye accha, app-level authorization ka replacement nahi.\n• **NAT**: kai private addresses ek public share karte hain. Internal topology chhupata hai; apne aap mein security control nahi hai.\n• **WAF**: known attacks aur bot floods ke liye pattern filtering. Noise kam karta hai; neeche wala bug fix nahi karta, aur naya ya weirdly encoded attack miss kar jaata hai.\n• **DDoS**: maksad yeh hai ki flood origin tak na pahunche — aage CDN/anycast, peeche caching aur rate limits, aur \"attack ho raha hai\" ka likha plan (kaun decide karega, kya band hoga) — 3 baje improvise nahi.\n\n• Reality check: zyadatar breaches aaj bhi credentials, unpatched dependencies aur khule admin panels se shuru hote hain. Perimeter unhe cover nahi karta.",
    ["security-owasp", "security-mfa", "web-rate-limit"],
  ),
  L(
    "security-supply-chain",
    "Dependency and supply-chain risk",
    "security",
    ["what is supply chain security", "npm audit", "what is an sbom", "malicious dependency", "how to secure dependencies"],
    ["supply", "chain", "dependency", "dependencies", "sbom", "typosquat", "postinstall", "lockfile"],
    "Your dependency tree is code you did not write, running with your permissions.\n\n• **Lockfile** (`package-lock.json`) pins exact versions and integrity hashes; commit it, and install with `npm ci` (exact, reproducible) instead of `npm install` in CI.\n• **Audit in CI** — `npm audit --audit-level=high` plus Dependabot/Renovate — so a known CVE is a red build, not a surprise in a security review.\n• **Typosquatting and postinstall scripts** are real attack routes: a package can execute code on your laptop, in CI, and in your build image. Review a new dependency like new code, and think twice before adding one for ten lines of utility.\n• **SBOM** — a machine-readable inventory of what you ship. Enterprise procurement increasingly requires it, and it is what lets you answer 'are we affected?' in minutes when the next log4shell lands.\n• **Provenance**: build from a locked tree in CI and publish from that CI only, so the artifact and the repo cannot drift apart.\n\n• Also true on the other side: if you publish packages, sign them and use trusted publishing — your users are doing this analysis on you.",
    "Aapka dependency tree aisa code hai jo aapne likha nahi, par aapke permissions ke saath chalta hai.\n\n• **Lockfile** (`package-lock.json`) exact versions aur integrity hashes pin karti hai; commit karo, aur CI mein `npm ci` (exact, reproducible) use karo, `npm install` nahi.\n• **CI mein audit** — `npm audit --audit-level=high` aur Dependabot/Renovate — taaki known CVE red build ho, security review mein surprise nahi.\n• **Typosquatting aur postinstall scripts** asli attack routes hain: package aapke laptop, CI aur build image par code chala sakta hai. Nayi dependency ko naye code jaisa review karo; das line ke utility ke liye soch kar add karo.\n• **SBOM** — aap kya ship karte ho uska machine-readable inventory. Enterprise procurement ise maangta hai, aur \"kya hum affected hain?\" ka jawab minutes mein deta hai.\n• **Provenance**: CI mein locked tree se build karo aur sirf usi CI se publish karo, taaki artifact aur repo alag na ho.\n\n• Doosri taraf bhi sach hai: aap packages publish karte ho to unhe sign karo aur trusted publishing use karo — aapke users bhi yahi analysis kar rahe hain.",
    ["infra-cicd", "security-owasp", "arch-decisions"],
  ),
  // ---------------------------------------------------------------- infra & cloud, continued
  L(
    "infra-service-mesh",
    "Service mesh and sidecars",
    "infra",
    ["what is a service mesh", "what is a sidecar", "what is mtls", "service mesh vs api gateway"],
    ["mesh", "sidecar", "envoy", "istio", "linkerd", "mtls", "mutual", "proxy"],
    "A **service mesh** moves networking concerns out of your application code and into a proxy beside every pod — the **sidecar** (Envoy, linkerd-proxy). Those proxies handle mutual TLS between services, retries, timeouts, traffic splitting, and uniform metrics and traces.\n\nWhat you gain: mTLS and observability *without touching app code*. What you pay: a proxy per pod (CPU and memory), another control plane to operate, and one more place requests can vanish while you debug.\n\n• Do not adopt a mesh *just* for mTLS — a simpler proxy or library may cover it. The mesh earns its keep when many teams need the same retry / canary / mTLS behaviour and consistency matters more than overhead.\n• The mesh is not an **API gateway**: the gateway faces the outside world (auth, routing, rate limits at the edge); the mesh handles service-to-service traffic inside.",
    "**Service mesh** networking ke concerns app code se nikaal kar har pod ke paas wale proxy (**sidecar** — Envoy, linkerd-proxy) mein daal deta hai. Wo proxies services ke beech mutual TLS, retries, timeouts, traffic splitting aur uniform metrics/traces handle karte hain.\n\nFaayda: mTLS aur observability *bina app code chhue*. Kharcha: per pod ek proxy (CPU, memory), ek aur control plane, aur debug karte waqt ek aur jagah jahan requests gayab ho sakti hain.\n\n• Sirf mTLS ke liye mesh na lao — simpler proxy ya library kaafi ho sakti hai. Mesh tab worth hai jab bahut teams ko same retry / canary / mTLS behaviour chahiye aur consistency overhead se zyada matter kare.\n• Mesh **API gateway** nahi hai: gateway bahar ki duniya se milta hai (edge par auth, routing, rate limits); mesh andar ka service-to-service traffic sambhalta hai.",
    ["infra-docker-k8s", "ops-observability", "security-network"],
  ),
  L(
    "infra-k8s-objects",
    "Kubernetes objects you actually use",
    "infra",
    ["what is a kubernetes pod", "what is a deployment", "what is a readiness probe", "what is helm", "what is a kubernetes operator",
      "what is a health check",
      "health check",
      "what is a liveness probe"],
    ["pod", "deployment", "replicaset", "service", "probe", "liveness", "readiness", "hpa", "helm", "operator", "crd"],
    "The objects you meet first:\n\n• **Pod** — one or more containers sharing a network namespace; the unit Kubernetes schedules. Disposable by design, not a pet.\n• **Deployment** — declares the image and replica count; its controller rolls pods out and replaces the ones that die. **ReplicaSet** is the layer underneath that keeps the count honest.\n• **Service** — a stable virtual IP and DNS name in front of a changing set of pods.\n• **Probes** — `readinessProbe` decides whether a pod gets traffic; `livenessProbe` decides whether it gets restarted. Confusing them is the classic cause of a bad deploy restarting healthy pods under load.\n• **HPA** — scales replicas on CPU or custom metrics.\n\n**Helm** packages manifests into versioned, templated charts; an **operator** is a controller that encodes operational knowledge for one system (a database, a queue) as custom resources, reconciling reality towards your declared spec.\n\n• Debug order that works: `kubectl get pods` (status) → `kubectl describe pod` (events, probe failures) → `kubectl logs` (app) → `kubectl get events` (cluster-level).",
    "Pehle jo objects milte hain:\n\n• **Pod** — ek ya zyada containers jo network namespace share karte hain; Kubernetes yahi schedule karta hai. Design se disposable, pet nahi.\n• **Deployment** — image aur replica count declare karta hai; controller pods rollout karta hai aur marte hue replace karta hai. **ReplicaSet** neeche ki layer hai jo count sahi rakhti hai.\n• **Service** — badalte pods ke aage stable virtual IP aur DNS naam.\n• **Probes** — `readinessProbe` tay karta hai pod ko traffic milega ya nahi; `livenessProbe` tay karta hai restart hoga ya nahi. Inhe confuse karna classic wajah hai jisse bad deploy load mein healthy pods restart karta hai.\n• **HPA** — CPU ya custom metrics par replicas scale karta hai.\n\n**Helm** manifests ko versioned templated charts mein package karta hai; **operator** ek controller hai jo kisi ek system (database, queue) ka operational knowledge custom resources ke roop mein encode karta hai.\n\n• Debug order jo chalta hai: `kubectl get pods` → `kubectl describe pod` (events, probe fail) → `kubectl logs` (app) → `kubectl get events`.",
    ["infra-docker-k8s", "infra-service-mesh", "ops-deploy-strategies"],
  ),
  L(
    "cloud-cost",
    "Why the cloud bill is big",
    "cloud",
    ["how to reduce cloud cost", "cloud bill", "why is cloud expensive", "rightsizing"],
    ["cost", "bill", "billing", "egress", "rightsize", "reserved", "savings", "spend", "finops"],
    "Cloud bills are dominated by a few things, and every one of them is an engineering decision:\n\n• **Idle capacity** — instances sized for a peak that never came, or dev environments running 24/7. Rightsize, autoscale, switch off.\n• **Egress** — data leaving the region or provider is charged, and chatty cross-AZ traffic adds up silently. Keep chatty services together and cache at the edge.\n• **Storage and logs** — every log line, metric sample and snapshot is billed. Retention is a cost decision, not a default.\n• **Commitments** — reserved instances or savings plans for the steady baseline, on-demand for the spikes.\n\n• Practical habit: tag everything by team/service, then review the top five line items monthly — they are usually ~80% of the bill.\n• Cheapest fix first: find the biggest line item and ask which decision created it. Cost surprises come from architecture, not from the invoice.",
    "Cloud bill ko kuch cheezein dominate karti hain, aur har ek engineering decision hai:\n\n• **Idle capacity** — us peak ke hisaab se instances jo kabhi aaya hi nahi, ya 24/7 chalte dev environments. Rightsize karo, autoscale karo, band karo.\n• **Egress** — region ya provider se bahar jaata data charge hota hai, aur cross-AZ chatter chupke se badhta hai. Chatty services saath rakho aur edge par cache karo.\n• **Storage aur logs** — har log line, metric sample aur snapshot billed hai. Retention cost ka decision hai, default nahi.\n• **Commitments** — steady baseline par reserved instances/savings plan, spikes par on-demand.\n\n• Practical habit: sab kuch team/service ke hisaab se tag karo, phir har mahine top 5 line items dekho — aam taur par wahi ~80% bill hote hain.\n• Sabse sasta fix pehle: sabse badi line item uthao aur poochho kaunse decision ne use banaya. Cost surprises architecture se aate hain, invoice se nahi.",
    ["cloud-iaas-paas", "ops-observability", "infra-serverless"],
  ),

  // ---------------------------------------------------------------- engineering practice
  L(
    "eng-code-review",
    "Code review that works",
    "engineering",
    ["how to do code review", "what is a good pull request", "what is trunk based development", "merge or rebase", "small pull requests"],
    ["review", "pull", "request", "pr", "branch", "merge", "rebase", "commit", "diff"],
    "• **Small PRs** review better: one logical change, roughly under 400 changed lines. Bigger than that, split it — reviewers approve what they can hold in their head, and past a point that is not much.\n• **The reviewer** owns correctness, clarity, tests and operability. Style belongs to the formatter; do not spend review attention there.\n• **The author** owns context: what changed, why, how it was tested, and what to look at first. A PR description is not optional paperwork — it is the review's table of contents.\n• **Trunk-based**: short-lived branches merged into main behind a feature flag. Long-lived branches rot, and merging them turns review into archaeology.\n• **Merge vs rebase**: rebase your own branch to keep history readable; merge into shared branches so the record of the integration survives.\n\n• The rule that actually prevents incidents: no change should be understood by only one person. Five minutes of review is cheaper than an hour of outage.",
    "• **Chhote PRs** better review hote hain: ek logical change, lagbhag 400 line ke andar. Isse bada ho to todo — reviewer wahi approve karta hai jo uske dimaag mein fit ho, aur ek point ke baad wo bahut kam hota hai.\n• **Reviewer** correctness, clarity, tests aur operability ka owner hai. Style formatter ka kaam hai; wahan review time mat lagao.\n• **Author** context ka owner hai: kya badla, kyun, kaise test hua, pehle kya dekhna hai. PR description optional paperwork nahi — review ka table of contents hai.\n• **Trunk-based**: chhoti branches, feature flag ke peeche main mein merge. Lambi branches sad jaati hain aur merge karna archaeology ban jaata hai.\n• **Merge vs rebase**: apni branch rebase karo taaki history padhne layak rahe; shared branch mein merge karo taaki integration ka record bacha rahe.\n\n• Asli rule jo incident rokta hai: koi change sirf ek banda samajhta ho, yeh theek nahi. 5 minute ka review ek ghante ke outage se sasta hai.",
    ["code-git", "arch-testing", "eng-design-doc"],
  ),
  L(
    "eng-design-doc",
    "Design docs, RFCs and ADRs",
    "engineering",
    ["what is a design doc", "what is an rfc", "what is an adr", "how to write a technical spec",
      "what is an rfc process",
      "design review"],
    ["design", "doc", "docs", "rfc", "adr", "spec", "proposal", "diagram"],
    "Write it before the code, when changing your mind is still cheap. One page is often enough:\n\n1. **Problem** — what hurts, for whom, and what happens if we do nothing.\n2. **Options** — at least two, each with its cost in operations, money and complexity.\n3. **Proposal** — the choice, and explicitly what it does *not* do.\n4. **Risks and rollback** — how this fails, and how we get back.\n5. **Open questions** — the honest list; a doc with no open questions is usually hiding one.\n\nNaming: an **RFC** is a proposal open for review; an **ADR** is the short record of a decision already taken ('we chose Postgres over MongoDB because…'). ADRs are the highest-value docs per line written — they stop a team relitigating settled ground every six months.\n\n• A diagram of boxes and arrows beats three paragraphs of prose for anything with more than three parts.",
    "Code se pehle likho, jab mann badalna sasta hai. Ek page aksar kaafi hai:\n\n1. **Problem** — kya dikkat hai, kiske liye, aur kuch na karein to kya hoga.\n2. **Options** — kam se kam do, har ek ki operations, paisa aur complexity cost ke saath.\n3. **Proposal** — choice, aur saaf-saaf kya ye *nahi* karta.\n4. **Risks aur rollback** — yeh kaise fail hoga, aur wapas kaise aayenge.\n5. **Open questions** — imaandar list; jis doc mein ek bhi open question na ho, wo aksar ek chhupa raha hota hai.\n\nNaam: **RFC** review ke liye khula proposal hai; **ADR** liye ja chuke decision ka chhota record (\"Postgres chuna, MongoDB nahi, kyunki…\"). ADR per line sabse valuable docs hote hain — team ko har 6 mahine settled baat dobara ladne se rokte hain.\n\n• Teen se zyada parts ho to boxes-arrows diagram prose se behtar hai.",
    ["arch-decisions", "eng-code-review", "arch-knowledge"],
  ),
  L(
    "eng-tech-debt",
    "Tech debt",
    "engineering",
    ["what is tech debt", "what is technical debt", "how to pay down tech debt", "refactoring",
      "what is technical debt in software",
      "what is a tech debt"],
    ["debt", "technical", "refactor", "refactoring", "rewrite", "legacy", "shortcut"],
    "**Tech debt** is the gap between what the code does and what it should — deadlines, unknowns, or shortcuts someone took on purpose. It is not a synonym for 'code I dislike'.\n\n• **Make it visible**: a file, a label, or an entry in the backlog next to the incident it caused. Debt nobody can see cannot be paid.\n• **Pay it where it hurts**: the module that causes the most incidents, or the one every feature has to touch. Debt in a service nobody changes costs nothing.\n• **Tie it to work in flight**: 'we are in the notification service anyway, so the retry loop gets fixed now' (boy-scout rule) beats a quarterly 'debt sprint' that gets cancelled the first busy week.\n• **Some debt is correct**: a script you will delete next week does not need tests and abstractions.\n\n• Do not confuse debt with a rewrite. A rewrite is a year of not shipping plus all the old bugs rediscovered — pay down in slices, on the path you are already walking.",
    "**Tech debt** code ke jo karta hai aur jo karna chahiye us beech ka gap hai — deadlines, unknowns, ya jaan-boojh kar liye shortcuts. Yeh \"aise code jo mujhe pasand nahi\" ka synonym nahi hai.\n\n• **Dikhao**: file, label, ya backlog entry us incident ke saath jiski wajah wo bana. Jo debt dikhta nahi, wo chukaya nahi ja sakta.\n• **Wahan chukao jahan dard hota hai**: wo module jisse sabse zyada incidents aate hain, ya jise har feature chhoota hai. Jo service koi badalta hi nahi, uska debt muft hai.\n• **Chal rahe kaam ke saath jodo**: \"waise bhi notification service mein hain, to retry loop abhi theek kar dete hain\" (boy-scout rule) us quarterly \"debt sprint\" se behtar hai jo pehle busy hafte mein cancel ho jaata hai.\n• **Kuch debt sahi hota hai**: agle hafte delete hone wali script ko tests aur abstraction nahi chahiye.\n\n• Debt aur rewrite ko mix mat karo. Rewrite ka matlab ek saal ship na karna aur purane bugs dobara dhoondhna — slices mein chukao, usi raaste par jo chal rahe ho.",
    ["eng-design-doc", "arch-decisions", "ops-toil"],
  ),
  L(
    "eng-ways-of-working",
    "Agile, estimates and retros",
    "engineering",
    ["agile vs waterfall", "how to estimate a project", "how to run a retrospective", "what is a standup", "sprint planning",
      "how to run a retro"],
    ["agile", "waterfall", "estimate", "estimation", "sprint", "standup", "retro", "retrospective", "velocity", "scrum"],
    "• **Agile vs waterfall**: waterfall fixes the scope and lets the date slip; agile fixes the date and re-negotiates the scope. Most 'agile' teams do neither — they pin scope *and* date, and quietly drop quality. Pick which one is fixed, and say it out loud.\n• **Estimates** are for deciding, not for promising. Order of magnitude (S/M/L with a range) beats false precision in hours; small tasks skew long, large tasks skew longer.\n• **Retros**: what went well, what hurt, and *one* change with an owner and a date. Ten action items produce zero work; one produces one.\n• **Standups** exist to surface blockers and decide what to cut today — reading a status report aloud wastes everyone's time.\n• **Async by default**: a written issue, doc or PR scales across timezones. A meeting does not.\n\n• The measure that matters is how quickly a small, safe improvement reaches production — not how full the board looks.",
    "• **Agile vs waterfall**: waterfall scope fix karta hai aur date slip hone deta hai; agile date fix karta hai aur scope dobara negotiate karta hai. Zyadatar \"agile\" teams dono nahi karti — scope *aur* date pin kar deti hain, aur chupke se quality gir jaati hai. Pehle tay karo kya fixed hai, aur bol do.\n• **Estimates** deciding ke liye hain, promise ke liye nahi. Order of magnitude (S/M/L + range) ghanton ki jhooti precision se behtar hai; chhote kaam lambe khinchte hain, bade usse bhi zyada.\n• **Retro**: kya accha hua, kya takleef di, aur *ek* change jiska owner aur date ho. Das action items se zero kaam hota hai; ek se ek.\n• **Standup** blockers saamne laane aur \"aaj kya cut karna hai\" tay karne ke liye hai — status report padhna sabka time barbaad karta hai.\n• **Default async**: likha hua issue/doc/PR timezones mein scale karta hai, meeting nahi.\n\n• Asli measure: chhota, safe improvement kitni jaldi production tak pahunchta hai — board kitna bhara dikhta hai, wo nahi.",
    ["eng-code-review", "eng-tech-debt", "ops-postmortem"],
  ),
  // ---------------------------------------------------------------- testing & ops, continued
  L(
    "testing-load",
    "Load testing and capacity",
    "testing",
    ["what is load testing", "how to load test", "what is capacity planning", "how much traffic can we handle",
      "what is a load test",
      "load test"],
    ["load", "testing", "capacity", "k6", "locust", "jmeter", "throughput", "rps", "headroom"],
    "**Load testing** answers two questions: what breaks first, and at what number?\n\n• Test a realistic mix of endpoints with think time — not one URL hammered flat out.\n• Watch latency *and* saturation (CPU, pool size, queue depth). Latency reports the symptom; saturation explains it.\n• Test the degradation path too: what happens when the database is five times slower, or a downstream starts timing out at 30 s?\n• Run it against a production-like environment with production-like data volumes, or the numbers are decoration.\n\n**Capacity planning**: measure throughput per replica, add headroom for one lost zone (N+1) and for peak season (often 2-3× average), then re-verify after every significant change.\n\n• A load test that has never failed is a load test you did not push hard enough — the interesting answer is where the knee is, not that it survived.",
    "**Load testing** do sawaalon ka jawab deta hai: pehle kya tootega, aur kitne number par?\n\n• Endpoints ka realistic mix test karo think time ke saath — ek URL ko poora jhonk kar nahi.\n• Latency *aur* saturation (CPU, pool size, queue depth) dono dekho. Latency symptom batati hai; saturation wajah.\n• Degradation path bhi test karo: database 5x slow ho jaye ya downstream 30 s par timeout kare to kya hoga?\n• Production jaisa environment aur production jaisa data volume chahiye, warna numbers decoration hain.\n\n**Capacity planning**: per replica throughput measure karo, ek zone khone ka headroom (N+1) aur peak season (aksar average ka 2-3x) jodo, phir har bade change ke baad dobara verify karo.\n\n• Jo load test kabhi fail hi nahi hua, wo poora push nahi kiya gaya — asli jawab yeh nahi ki survive kiya, asli jawab knee kahan hai.",
    ["perf-latency", "testing-pyramid", "web-backpressure"],
  ),
  L(
    "ops-toil",
    "Toil and automation",
    "ops",
    ["what is toil", "what is sre toil", "how to reduce manual work", "automate operations",
      "what is toil in sre",
      "how to reduce toil",
      "toil"],
    ["toil", "manual", "repetitive", "automation", "automate", "manual work", "drudgery"],
    "**Toil** is repetitive, manual, automatable work that scales with the system: restarts, re-runs, manual backfills, copy-pasted runbook steps. It feels productive and leaves nothing behind.\n\n• **Measure it** like latency. If the same manual task happens weekly, the tooling has a bug.\n• **Automate the decision**, not only the keystrokes — a script that still needs three people to agree when to run it is not automation, it is a shorter meeting.\n• **Runbooks** for what you should not automate yet, each with an owner and a date. An unowned runbook is a rumour.\n• **Toil budget**: keep it under roughly half of on-call effort. Beyond that, the team is maintaining its tooling by hand instead of improving the product.\n\n• ARCH's angle: the runbook should be readable *in* the response flow — open the incident, follow the steps, click the fix — instead of a wiki page nobody can find at 3 a.m.",
    "**Toil** wo repetitive, manual, automatable kaam hai jo system ke saath badhta hai: restarts, re-runs, manual backfills, copy-paste runbook steps. Lagta hai productive kaam, peeche kuch chhodta nahi.\n\n• **Measure karo** latency ki tarah. Same manual task har hafte ho raha hai to tooling mein bug hai.\n• **Decision automate karo**, sirf keystrokes nahi — jise chalane ke liye teen logon ka consensus chahiye, wo automation nahi, chhoti meeting hai.\n• Jise abhi automate nahi karna, uske liye **runbook** — har ek par owner aur date. Bina owner ka runbook afwaah hai.\n• **Toil budget**: on-call effort ka lagbhag aadha. Usse zyada matlab team tooling haath se sambhal rahi hai, product improve nahi kar rahi.\n\n• ARCH ka angle: runbook response flow ke *andar* padhne layak ho — incident kholo, steps follow karo, fix click karo — na ki wiki page jo 3 baje koi dhoondh na paye.",
    ["ops-runbook", "ops-oncall", "ops-alerting"],
  ),
  L(
    "ops-change-management",
    "Change management and deploy safety",
    "ops",
    ["what is change management", "what is a change freeze", "what is a deploy window", "how to ship safely", "release management",
      "what is a feature freeze"],
    ["change", "management", "freeze", "window", "cabal", "release", "gate", "approval"],
    "Nearly every incident starts with a change, and the goal of change management is to make changes boring:\n\n• **Small and frequent** beats big and rare. A twenty-line change is easy to reason about, quick to verify and cheap to revert.\n• **Gates**: review, CI (tests, typecheck, migration check), and at least one human who did not write it. For risky changes, a rehearsed rollback and a named owner watching the dashboard after deploy.\n• **Deploy windows / freezes**: a freeze is a tool for one specific risk (a launch, end of quarter, a big marketing moment). As a permanent policy it just moves every deploy to the last hour of the window, which is worse than no policy.\n• **Feature flags** separate deploy from release: ship dark, enable for 1% of traffic, watch the metrics, then ramp or flip it off in a click. Most 'rollbacks' should be a flag flip, not a redeploy.\n• **Rollback plan** in the PR: how we get back, how long it takes, and whether the migration is reversible.\n\n• If the rollback has never been rehearsed, you do not have a rollback plan — you have a hope.",
    "Lagbhag har incident ek change se shuru hota hai, aur change management ka maksad changes ko boring banana hai:\n\n• **Chhote aur frequent** bade aur rare se behtar hain. Bees line ka change samajhna aasan, verify karna jaldi, revert sasta.\n• **Gates**: review, CI (tests, typecheck, migration check), aur kam se kam ek banda jisne likha nahi. Risky change par rehearsed rollback aur deploy ke baad dashboard dekhne wala named owner.\n• **Deploy window / freeze**: freeze ek khaas risk ke liye tool hai (launch, quarter end, bada marketing moment). Permanent policy ban gayi to sab deploys window ki aakhri ghadi mein chale jaate hain — policy na hone se bhi bura.\n• **Feature flags** deploy aur release ko alag karte hain: andhera ship karo, 1% traffic par on karo, metrics dekho, phir ramp ya ek click mein off. Zyadatar \"rollbacks\" flag flip hone chahiye, redeploy nahi.\n• **Rollback plan** PR mein: wapas kaise aayenge, kitna time lagega, aur migration reversible hai ya nahi.\n\n• Jo rollback kabhi rehearse nahi hua, wo rollback plan nahi — umeed hai.",
    ["ops-deploy-strategies", "infra-cicd", "ops-alerting"],
  ),
  // ---------------------------------------------------------------- AI practice
  L(
    "ai-eval",
    "How to test an AI feature",
    "ai",
    ["how to evaluate an ai feature", "what is an eval", "what is a golden set", "how to test an llm", "llm evaluation"],
    ["eval", "evals", "evaluation", "golden", "benchmark", "regression", "judge", "thumbs", "rubric"],
    "An AI feature is only as trustworthy as the test you hold it to.\n\n• **Golden set**: 50-200 real questions with the answer you expect — an exact string, a required citation, or a graded rubric. Build it from real usage, not invented examples.\n• **Keep the deterministic core testable**: classifiers, retrieval and templates should be pure functions with unit tests. Only the generation step needs judgement, and it should be isolated behind a provider interface (this is exactly how ARCH's chat engine is built — `AI_PROVIDER=mock` in CI, no vendor calls).\n• **Regression runs in CI**: a prompt or model change that drops a golden question fails the build, like any other regression.\n• **Online signals**: thumbs, edit/accept rates, and how often a human has to take over. This is the only ground truth that scales.\n• **LLM-as-judge** is a proxy — useful for ranking two versions, never a replacement for a human spot check on a sample.\n• **Safety evals** matter as much as quality ones: does it invent a fact when the data is missing? Does it leak another tenant's data? Both should be asserted, not hoped for.\n\n• The rule ARCH follows: when the model does not know, it says so. An eval set where 'I do not know' is sometimes the correct answer is a better eval set than one where it is always wrong.",
    "AI feature utna hi bharosemand hai jitna uska test.\n\n• **Golden set**: 50-200 asli sawaal jinke expected jawab aap jaante ho — exact string, zaroori citation, ya graded rubric. Real usage se banao, banaye hue examples se nahi.\n• **Deterministic core testable rakho**: classifiers, retrieval aur templates pure functions hone chahiye (unit tests ke saath). Sirf generation step par judgement chahiye, aur wo provider interface ke peeche isolated ho — ARCH ka chat engine bilkul aise bana hai (`AI_PROVIDER=mock` CI mein, koi vendor call nahi).\n• **CI mein regression runs**: prompt ya model change se golden question toota to build fail, kisi bhi regression ki tarah.\n• **Online signals**: thumbs, edit/accept rate, aur kitni baar human ko takeover karna pada. Sirf yahi ground truth scale karta hai.\n• **LLM-as-judge** ek proxy hai — do versions rank karne ke liye theek, human spot check ki jagah nahi.\n• **Safety evals** quality jitne hi zaroori hain: data na hone par fact banata hai kya? Doosre tenant ka data leak karta hai kya? Dono assert karo, ummeed mat karo.\n\n• ARCH ka rule: jab model ko nahi pata, wo bol deta hai. Aisa eval set jisme \"mujhe nahi pata\" kabhi sahi jawab hai, usse behtar hai jisme wo kabhi sahi nahi hota.",
    ["ai-hallucination", "arch-model", "testing-pyramid"],
  ),

  // ---------------------------------------------------------------- deeper gaps
  L(
    "sys-linux-basics",
    "Virtual memory, cgroups and kernel panics",
    "systems",
    ["what is virtual memory", "what is swap", "what is a cgroup", "what is a kernel panic", "what is an oom kill",
      "linux cgroup"],
    ["virtual", "memory", "swap", "paging", "cgroup", "limit", "container", "panic", "oom", "killed"],
    "**Virtual memory** gives every process its own address space, mapped by the kernel onto physical RAM and files. A process can therefore see more memory than is physically free, and the **page cache** keeps hot file data in RAM — which is why 'free memory is low' on a Linux box is usually healthy, not a problem. **Swap** extends RAM to disk; it saves you from a crash and costs you latency.\n\n**cgroups** are the kernel feature behind container CPU/memory limits: exceed the memory limit and the kernel **OOM-kills** your process (exit code 137), no exception, no stack trace. That is the number-one cause of a container restarting in a loop — check the limit and the peak RSS, not the application logs.\n\n**Kernel panic** is the OS itself giving up (bad driver, corrupted filesystem, hardware). It is not an application bug; the evidence is in `dmesg`, not your app.\n\n• Debug order for a restarting pod: exit code (137 = OOM, 143 = SIGTERM) → memory limit vs peak → cgroup events → application logs.",
    "**Virtual memory** har process ko apna address space deti hai, jise kernel physical RAM aur files par map karta hai. Isliye process physically free se zyada memory dekh sakta hai, aur **page cache** hot file data RAM mein rakhti hai — isliye Linux par \"free memory kam hai\" aksar theek hai, problem nahi. **Swap** RAM ko disk tak badhata hai: crash se bachata hai, latency ki keemat par.\n\n**cgroups** wahi kernel feature hai jo container ke CPU/memory limits chalata hai: memory limit se upar gaye to kernel **OOM-kill** kar dega (exit code 137) — na exception, na stack trace. Container loop mein restart hone ki yeh number-one wajah hai — application log nahi, limit aur peak RSS dekho.\n\n**Kernel panic** OS ka khud surrender hai (kharab driver, corrupt filesystem, hardware). Yeh application bug nahi hai; evidence `dmesg` mein hai, aapke app mein nahi.\n\n• Restarting pod ka debug order: exit code (137 = OOM, 143 = SIGTERM) → memory limit vs peak → cgroup events → app logs.",
    ["sys-gc-memory", "infra-k8s-objects", "sys-process-thread"],
  ),
  L(
    "db-bloom-filter",
    "Bloom filters",
    "databases",
    ["what is a bloom filter", "bloom filter use case", "probabilistic data structure"],
    ["bloom", "filter", "probabilistic", "false", "positive", "bitset", "cuckoo"],
    "A **Bloom filter** is a tiny probabilistic set: you hash each item into several bits of a bit array. Lookup answers 'definitely not present' or 'possibly present' —  no false negatives, but a tunable rate of false positives.\n\n• Why it is useful: it answers most 'is this in the set?' questions from a few bytes of memory, before paying for a disk seek or a network call. That is why databases and CDNs use them to skip files that cannot contain a key, and why browsers used them for malicious-URL checks.\n• Cost: you cannot enumerate the set, you cannot remove items (counting variants can), and the false-positive rate grows as the filter fills — plan for rebuilding it.\n\n• The trade in one line: a small, bounded lie rate in exchange for never doing the expensive lookup that would have failed anyway.",
    "**Bloom filter** ek chhota probabilistic set hai: har item ko kuch bits par hash kiya jaata hai. Lookup batata hai \"bila shak nahi hai\" ya \"ho sakta hai hai\" — false negative nahi hota, false positive ki rate tune kar sakte ho.\n\n• Kaam kyun aata hai: \"kya ye is set mein hai?\" ke zyadatar sawaal kuch bytes mein answer ho jaate hain, disk seek ya network call se pehle. Isi liye databases aur CDNs isse aise files skip karte hain jinme key ho hi nahi sakti, aur browsers malicious-URL check ke liye use karte the.\n• Cost: set enumerate nahi kar sakte, item remove nahi kar sakte (counting variant kar sakta hai), aur filter bharte-bharte false-positive rate badhta hai — rebuild ka plan rakho.\n\n• Ek line mein trade: chhoti, bounded jhoot ki rate, badle mein wo mehnga lookup hi nahi karna padta jo fail hone hi wala tha.",
    ["db-indexes", "web-caching", "web-rate-limit"],
  ),
  L(
    "web-webassembly",
    "WebAssembly",
    "web",
    ["what is webassembly", "what is wasm", "wasm use cases"],
    ["webassembly", "wasm", "wat", "compile", "sandbox", "runtime"],
    "**WebAssembly (Wasm)** is a compact binary instruction format that runs in a sandboxed virtual machine at near-native speed. It is a compilation target, not a language you write by hand: C, C++, Rust, Go and others compile to it.\n\n• In the browser it is how heavy workloads (video/photo editing, CAD, games, codecs) run client-side: predictable performance, and it downloads smaller than the equivalent JavaScript.\n• It is not a JavaScript replacement — DOM access still goes through JS, so it is used for compute, not for UI.\n• Outside the browser it became a portable plugin system: edge functions (Cloudflare Workers), serverless runtimes, and embedded plugin sandboxes. The value is *isolation with a small footprint* — you can run untrusted user code without a container or a VM per invocation.\n\n• Where it wins: you already have a C/Rust library or a hot numeric loop, or you need to run someone else's code safely. Where it does not: ordinary business logic, where the JS/TS ecosystem is faster to ship and debug.",
    "**WebAssembly (Wasm)** ek compact binary instruction format hai jo sandboxed VM mein native ke kareeb speed par chalta hai. Yeh compilation target hai, haath se likhne wali language nahi: C, C++, Rust, Go isme compile hote hain.\n\n• Browser mein bhaari kaam (video/photo editing, CAD, games, codecs) client-side chalane ka yahi raasta hai: performance predictable, aur equivalent JavaScript se chhota download.\n• Yeh JavaScript ka replacement nahi hai — DOM access JS se hi hota hai, isliye iska use compute ke liye hai, UI ke liye nahi.\n• Browser ke bahar yeh portable plugin system ban gaya: edge functions (Cloudflare Workers), serverless runtimes, embedded plugin sandboxes. Value hai *chhote footprint ke saath isolation* — untrusted user code bina container ya per-invocation VM chala sakte ho.\n\n• Jahan jeetta hai: C/Rust library pehle se hai, hot numeric loop hai, ya kisi aur ka code safely chalana hai. Jahan nahi: aam business logic, jahan JS/TS ecosystem ship aur debug karna aasan hai.",
    ["infra-serverless", "web-http-versions", "perf-latency"],
  ),
  L(
    "db-hot-partition",
    "Hot partitions and hot keys",
    "databases",
    ["what is a hot partition", "what is a hot key", "skewed partition", "one shard is overloaded"],
    ["hot", "partition", "key", "skew", "shard", "sharding", "throughput", "celebrity"],
    "A **hot partition** is one shard or partition taking far more traffic than the others, so it saturates while the rest of the cluster idles. A **hot key** is the single-row version: one record everyone reads or writes at once ('the' tenant, a global counter, a celebrity user).\n\n• It is a *distribution* bug, not a capacity bug — adding nodes does not fix it, because the load cannot spread.\n• Fixes: choose a higher-cardinality partition key; add a random suffix or bucket to spread writes (`key#1..key#10`) and aggregate on read; cache the hot key aggressively; split one logical counter into N counters and sum them.\n\n• Symptoms to look for: one node's CPU or disk queue far above its peers, latency spikes that track a single tenant, or a queue topic where one consumer lags.\n• Design check: walk through your top three access patterns and ask what the busiest key does at 10× the traffic.",
    "**Hot partition** tab hota hai jab ek shard ya partition baaki sabse kaafi zyada traffic le, isliye wahi saturate ho jaata hai aur cluster idle baitha rehta hai. **Hot key** uska single-row version hai: ek record jo sab ek saath padhte ya likhte hain (\"wo\" tenant, global counter, famous user).\n\n• Yeh *distribution* ka bug hai, capacity ka nahi — node badhane se fix nahi hota, load spread hi nahi ho sakta.\n• Fixes: higher-cardinality partition key chuno; writes spread karne ke liye random suffix ya bucket lagao (`key#1..key#10`) aur read par aggregate karo; hot key ko aggressively cache karo; ek logical counter ko N counters mein todo aur sum karo.\n\n• Symptoms: ek node ka CPU/disk queue baaki sabse kaafi upar, latency spikes ek hi tenant ke saath, ya ek queue topic jahan ek consumer peeche chhoot raha hai.\n• Design check: apne top 3 access patterns nikaalo aur poochho sabse busy key 10x traffic par kya karegi.",
    ["db-replication", "db-indexes", "perf-latency"],
  ),
  L(
    "eng-monorepo",
    "Monorepo vs polyrepo",
    "engineering",
    ["what is a monorepo", "monorepo vs polyrepo", "should we use a monorepo", "multi repo vs single repo"],
    ["monorepo", "polyrepo", "repository", "repos", "workspace", "turbo", "nx", "bazel"],
    "**Monorepo** = every project in one repository. **Polyrepo** = one repository per service or library.\n\nThe monorepo argument:\n• One atomic change can touch an API and all its callers in a single reviewed PR.\n• Shared tooling, one CI config, one dependency upgrade for everyone.\n• Refactors across boundaries are possible at all — in a polyrepo they are a quarter-long project.\n\nThe polyrepo argument:\n• Blast radius and access control per team; a broken build cannot block everyone.\n• Independent release cadence and CI that only runs what changed.\n\nWhat actually decides it: **tooling**. A monorepo without affected-only builds (Nx, Turborepo, Bazel) and without enforced boundaries becomes a slow, tangled repository. A polyrepo without a shared contract and versioning discipline becomes integration hell.\n\n• Practical middle ground: monorepo for code that ships together (app + shared libs + infra), separate repos for genuinely independent products, and a published contract (schema, OpenAPI) between them.\n• A monorepo does not mean one deployable — it means one place to review and refactor.",
    "**Monorepo** = saare projects ek repository mein. **Polyrepo** = har service ya library ka apna repository.\n\nMonorepo ka paksh:\n• Ek atomic change API aur uske saare callers ko ek hi reviewed PR mein badal sakta hai.\n• Shared tooling, ek CI config, sabke liye ek dependency upgrade.\n• Boundaries ke paar refactor possible hi ho jaata hai — polyrepo mein wo quarter-long project hai.\n\nPolyrepo ka paksh:\n• Per team blast radius aur access control; ek toota build sabko block nahi karta.\n• Independent release cadence aur CI jo sirf changed cheez chalati hai.\n\nAsli faisla **tooling** karta hai: affected-only builds (Nx, Turborepo, Bazel) aur enforced boundaries ke bina monorepo slow aur tangled ho jaata hai. Shared contract aur versioning discipline ke bina polyrepo integration hell ban jaata hai.\n\n• Practical middle: jo saath ship hota hai uske liye monorepo (app + shared libs + infra), jo sach mein independent products hain unke liye alag repos, aur beech mein published contract (schema, OpenAPI).\n• Monorepo ka matlab ek deployable nahi — matlab ek jagah review aur refactor karna.",
    ["code-git", "infra-monolith-microservices", "eng-code-review"],
  ),

];

// ---------------------------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------------------------

/**
 * Filler that changes the sentence but not the question: "how does https *actually* work",
 * "how do i reduce cloud cost", "what is *the* CAP theorem". Dropping these — including articles —
 * lets one alias match the several ways engineers ask the same thing. Note it is applied to both
 * sides (question and stored phrase), so the data does not have to spell every variation.
 */
const FILLER = /\b(actually|really|exactly|basically|please|simply|just|properly|quickly|kindly|maybe|do|does|did|can|could|should|would|to|i|you|me|a|an|the)\b/g;

/** Lowercase, strip filler, collapse whitespace — shared by questions and by the data they match. */
function clean(text: string): string {
  return text
    .toLowerCase()
    .replace(FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalised, padded form so phrase matching is word-boundary safe without regex escaping.
 *
 * Two normalisations earn their keep on real questions: filler words are dropped, and
 * or / vs / versus / and are folded into a single `vs` token — engineers write "session or jwt",
 * "websocket vs polling" and "difference between rest and graphql" for the same shape of question,
 * so the data only has to spell each of those once.
 */
function normalise(text: string): string {
  // Lowercase *before* stripping punctuation, or acronyms ("CAP", "HTTP", "JWT") lose their letters.
  const stripped = text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ');
  const cleaned = clean(stripped).replace(/\b(versus|or|and)\b/g, 'vs');
  return ` ${cleaned} `;
}

/** Every spelling of a phrase we should look for in the normalised haystack. */
function phraseVariants(phrase: string): string[] {
  const base = clean(phrase).replace(/\b(versus|or|and)\b/g, 'vs');
  return [
    base,
    `${base}s`,
    base.replace(/\band\b/g, 'vs'),
    base.replace(/\bvs\b/g, 'and'),
    base.replace(/\s+/g, '-'),
    base.replace(/-/g, ' '),
  ];
}

/** True when the padded haystack contains the phrase, tolerating plurals, and/or swaps and hyphens. */
function hasPhrase(haystack: string, phrase: string): boolean {
  return phraseVariants(phrase).some((variant) => haystack.includes(` ${variant} `));
}

/** A defining word ("kubernetes", "postmortem") is worth more than a generic one ("use", "best"). */
function keywordWeight(keyword: string): number {
  return keyword.length >= 6 || /\d/.test(keyword) ? 2 : 1;
}

export type TechMatch = { fact: TechFact; score: number };

/**
 * Find the best built-in topic for a question, or null when nothing clears the bar.
 *
 * Scoring is deliberately blunt and explainable: an alias phrase is worth 3 (plus 1 per extra word),
 * a defining keyword 2 and a short one 1 (capped at 8), a cue 2. The threshold exists so that a
 * stray keyword ("cache" in "our cache incident") never turns into a general-knowledge lecture —
 * better to say nothing than to answer a different question than the one asked.
 *
 * Ties break towards the fact that matched a *phrase* rather than loose keywords: for "is python
 * good for microservices?" both the Python topic (python + "good for") and the microservices topic
 * (just the word "microservices") score 4, and the phrase match is the better reading.
 */
/** Words that carry no topic by themselves — used only by the bare-topic fallback below. */
const QUESTION_FILLERS = new Set([
  'what', 'which', 'why', 'when', 'how', 'who', 'does', 'did', 'is', 'are', 'was', 'were', 'be',
  'kya', 'hai', 'hain', 'hota', 'hoti', 'hote', 'matlab', 'samjhao', 'samjha', 'batao', 'bata',
  'kaise', 'kaam', 'karta', 'karti', 'karte', 'karo', 'use', 'uses', 'used', 'using', 'about',
  'tell', 'explain', 'define', 'definition', 'meaning', 'difference', 'between', 'versus', 'vs',
  'work', 'works', 'working', 'please', 'the', 'a', 'an', 'in', 'of', 'for', 'to', 'and', 'or',
  'on', 'off', 'with', 'without', 'my', 'our', 'your', 'me', 'isnt', 'doesnt', 'this', 'that',
]);

/**
 * The one-word question: "redis?", "kafka kya hai", "docker kaise kaam karta hai".
 *
 * Only consulted when nothing else matched, and only when the question reduces to a single content
 * word that some topic lists as a defining keyword — so "docker down" or "our cache incident" can
 * never become a lecture, while a bare topic name gets its one good answer.
 */
function matchBareTopic(question: string): TechFact | null {
  const words = clean(question)
    .split(' ')
    .filter((word) => word.length >= 3 && !QUESTION_FILLERS.has(word));
  if (words.length !== 1) return null;
  const [word] = words;
  if (!word) return null;
  const candidates = TECH_FACTS.filter((fact) => fact.keywords.some((keyword) => keyword === word || keyword === `${word}s`));
  if (candidates.length === 1) return candidates[0]!;
  // Several topics may merely *mention* a word ("redis" is a keyword for caching and for Redis).
  // The topic that names it — in its title or an alias — is the one the question is about.
  const named = candidates.filter(
    (fact) => fact.title.toLowerCase().includes(word) || fact.aliases.some((alias) => alias.includes(word)),
  );
  return named.length === 1 ? named[0]! : null;
}

export function matchTechFact(question: string): TechMatch | null {
  const haystack = normalise(question);
  let best: (TechMatch & { phraseScore: number }) | null = null;

  for (const fact of TECH_FACTS) {
    let phraseScore = 0;
    for (const alias of fact.aliases) {
      if (hasPhrase(haystack, alias)) phraseScore += 3 + Math.max(0, alias.split(' ').length - 1);
    }
    for (const cue of fact.cues ?? []) {
      if (hasPhrase(haystack, cue)) phraseScore += 2;
    }
    let keywordScore = 0;
    for (const keyword of fact.keywords) {
      if (hasPhrase(haystack, keyword)) keywordScore += keywordWeight(keyword);
    }
    const score = phraseScore + Math.min(keywordScore, 8);
    const better =
      !best || score > best.score || (score === best.score && phraseScore > best.phraseScore);
    if (better) best = { fact, score, phraseScore };
  }

  // 3 = one alias, or a combination that is clearly about one topic.
  if (best && best.score >= 3) return { fact: best.fact, score: best.score };

  const bare = matchBareTopic(question);
  return bare ? { fact: bare, score: 2 } : null;
}

/** Topics offered as follow-up chips after a general-knowledge answer. */
export function techFactSuggestions(fact: TechFact, count = 3): string[] {
  const related = (fact.related ?? [])
    .map((id) => TECH_FACTS.find((entry) => entry.id === id))
    .filter((entry): entry is TechFact => Boolean(entry))
    .map((entry) => `What is ${entry.title.toLowerCase()}?`);
  const fallback = ['What is open right now?', 'What does our runbook say?', 'Which language should I use for microservices?'];
  return [...related, ...fallback].slice(0, count);
}

/** Honest, countable statement of coverage — used by the "I do not know that one" answer. */
/** Human labels for citations — a reader should not have to parse a slug like `ops`. */
export const TECH_CATEGORY_LABELS: Record<TechCategory, string> = {
  languages: 'programming languages',
  web: 'web & networking',
  databases: 'databases',
  infra: 'infrastructure',
  ops: 'operations & SRE',
  security: 'security',
  testing: 'testing',
  ai: 'AI & ML',
  cloud: 'cloud',
  performance: 'performance',
  systems: 'operating systems & runtime',
  engineering: 'engineering practice',
};

export const TECH_PACK_STATS = {
  topics: TECH_FACTS.length,
  categories: [...new Set(TECH_FACTS.map((fact) => fact.category))],
} as const;
