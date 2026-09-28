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
  | 'engineering'
  | 'distributed'
  | 'data'
  | 'emerging'
  | 'fundamentals';

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
    ['how does caching work', 'what is cache invalidation', 'cache stampede', 'cache aside'],
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
    ['what is a load balancer', 'layer 4 vs layer 7', 'what is a reverse proxy'],
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
    ['what is acid', 'what are transactions', 'isolation levels', 'what is base consistency', 'acid properties', 'what is acid in database'],
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
    ['what is a database index', 'what is n+1', 'how to speed up query'],
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
      'region vs availability zone', 'what is elastic compute', 'elastic compute'],
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
      "slo burn rate", 'error budget', 'error budget vs slo'],
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
    ['what is a circuit breaker', 'retry with backoff', 'why timeout is important', 'exponential backoff',
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
    ['what is 12 factor app', 'where should i put config', 'environment variables vs config file', 'twelve factor app', 'twelve-factor app'],
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
    ['difference between authentication and authorization', 'session vs jwt', 'how does login work', '401 vs 403'],
    ['auth', 'authentication', 'authorization', 'jwt', 'token', 'session', 'cookie', 'oauth', 'oidc', 'sso', 'rbac', 'permission', 'login'],
    '**Authentication** = who you are. **Authorization** = what you may do. They fail differently: 401 means "not signed in", 403 means "signed in, not allowed" — and confusing them sends the wrong signal to the client.\n\n**Sessions (server-side)** store state on the server and hand the browser an opaque cookie: revocable immediately, easy to reason about.\n**JWT (stateless)** carries signed claims: no lookup per request, but *revocation is the hard part* — you either keep a denylist (and lose the benefit) or accept tokens that outlive a logout. Keep them short-lived with a refresh token.\n\nAuthorization models: **RBAC** (roles → permissions; ARCH uses OWNER/ADMIN/RESPONDER/VIEWER), **ABAC** (attributes/policies), **ReBAC** (relationships). Whichever you use, **enforce on the server for every request**, never in the UI only — and return 404 rather than 403 for another tenant\'s id, so existence does not leak.\n\n• OAuth2 = *delegated authorization*; OIDC = an identity layer on top of it (login). SSO/SAML is the enterprise version of the same idea.',
    '**Authentication** = aap kaun ho. **Authorization** = aap kya kar sakte ho. Dono ka failure alag hai: 401 matlab "login nahi", 403 matlab "login hai, permission nahi" — inhe mix karne se client ko galat signal jaata hai.\n\n**Sessions (server-side)** state server par rakhte hain aur browser ko opaque cookie dete hain: turant revoke ho jaate hain, samajhna aasan.\n**JWT (stateless)** signed claims le jaata hai: per-request lookup nahi, par *revoke karna mushkil* hai — ya denylist rakho (aur benefit khatam) ya logout ke baad bhi valid token accept karo. Isliye short-lived rakho + refresh token.\n\nAuthorization models: **RBAC** (roles → permissions; ARCH mein OWNER/ADMIN/RESPONDER/VIEWER), **ABAC** (attributes), **ReBAC** (relationships). Jo bhi use karo, **server par har request enforce karo**, sirf UI mein nahi — aur doosre tenant ka id ho to 403 ke bajaye 404 do, taaki existence leak na ho.\n\n• OAuth2 = delegated authorization; OIDC = uske upar identity layer (login). SSO/SAML isi idea ka enterprise version.',
    ['security-secrets', 'security-owasp'],
  ),
  L(
    'security-secrets',
    'Hashing vs encryption, HMAC and secrets management',
    'security',
    ['hashing vs encryption', 'what is hmac', 'how to manage secrets',
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
    ['what is sql injection', 'what is ssrf', 'how to secure an api',
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
    ['what is rag', 'what is an embedding', 'how to give llm my data'],
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
    'ARCH runs **its own model on this server** — no vendor, no API key, and with `ARCH_OFFLINE_ONLY=true` (the default) nothing leaves the deployment.\n\nWhat it actually is: intent classification + a Naive Bayes classifier for failure category and severity, TF-IDF/embedding retrieval over *your* resolved incidents (plus a built-in library of failure patterns), and templates that fill in the retrieved facts. It trains on your history, and every answer cites what it used.\n\nThe honest trade: this cannot write fluent essays or reason about the wider world the way a frontier model can. What it can do is answer about *your* incidents in milliseconds, for free, deterministically, and without ever inventing an outage you never had.\n\n• For complex requests the built-in agent loop takes over: it plans the task (thinking/plan tags), calls native tools (calculator, clock, scoped file reads) and runs generated Python in a sandboxed subprocess, feeding failures back until the script passes — all on this server, still no vendor.',
    'ARCH **apna model isi server par** chalata hai — koi vendor nahi, koi API key nahi, aur `ARCH_OFFLINE_ONLY=true` (default) ke saath kuch bhi deployment se bahar nahi jaata.\n\nAsal mein kya hai: intent classification + failure category/severity ke liye Naive Bayes, *aapke* resolved incidents par TF-IDF/embedding retrieval (aur ek built-in failure patterns library), aur templates jo retrieved facts bharte hain. Aapki history par train hota hai, aur har answer cite karta hai ki kya use hua.\n\nImaandaar trade: yeh frontier model jaisa fluent essay ya duniya bhar ka reasoning nahi kar sakta. Par *aapke* incidents ke baare mein milliseconds mein, free, deterministic jawab de sakta hai — aur aisa outage kabhi invent nahi karega jo hua hi nahi.\n\n• Complex requests par built-in agent loop chalta hai: pehle task ka plan banta hai (thinking/plan tags), phir native tools chalte hain (calculator, clock, scoped file read), aur jo Python script banti hai wo sandboxed subprocess mein chalti hai — fail ho to error wapas karke fix hoti hai — sab isi server par, phir bhi koi vendor nahi.',
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
    ["what is a deadlock", "what is a race condition", "lost update", "why is my update lost", 'mutex vs semaphore', 'what is a mutex', 'what is a semaphore'],
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
    ["what is oltp", "what is olap", "difference between oltp and olap", "what is a data warehouse", "what is a data lake"],
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
    ["what is oauth", "what is oidc", "what is saml", "how does single sign on work"],
    ["oauth", "oidc", "jwt", "saml", "token", "claims", "sso", "refresh"],
    "Sign-in protocols, from the app's point of view:\n\n• **OAuth 2.0** is *authorization*: a user grants an app limited access to their data without handing over a password. It is not a login protocol by itself.\n• **OIDC** is the login layer on top of OAuth: an ID token (a **JWT**) that says who the user is. This is what 'Sign in with Google/Okta' means.\n• **SAML** is the older enterprise equivalent — XML assertions, heavier, still everywhere in B2B.\n• **JWT** is only a signed token format: header, payload, signature. The payload is readable by anyone, so put no secrets in it, and verify signature and expiry server-side on every request.\n\n• Normal web app: OIDC for login, short-lived access tokens, refresh tokens rotated and revocable server-side.\n• Never trust a JWT's `alg` header blindly — pin the algorithms you accept (`alg: none` is a known attack).",
    "App ke nazariye se sign-in protocols:\n\n• **OAuth 2.0** *authorization* hai: user bina password diye app ko apne data ka limited access deta hai. Yeh akela login protocol nahi hai.\n• **OIDC** OAuth ke upar login layer hai: ek ID token (**JWT**) jo batata hai user kaun hai. \"Sign in with Google/Okta\" isi ko kehte hain.\n• **SAML** purana enterprise equivalent hai — XML assertions, bhaari, par B2B mein aaj bhi har jagah.\n• **JWT** sirf ek signed token format hai: header, payload, signature. Payload sab padh sakte hain, isliye usme secret kabhi nahi, aur har request par signature + expiry server-side verify karo.\n\n• Aam web app: login ke liye OIDC, chhote access tokens, refresh tokens rotate + server-side revoke.\n• JWT ka `alg` header aankh band karke trust mat karo — accepted algorithms pin karo (`alg: none` ek known attack hai).",
    ["security-authn-authz", "security-mfa", "arch-api"],
  ),
  L(
    "security-mfa",
    "MFA, passwords and zero trust",
    "security",
    ["what is mfa", "what is two factor", "how to secure login", "password breach"],
    ["mfa", "2fa", "factor", "passkey", "webauthn", "zero", "trust", "credential"],
    "• **MFA** is a second proof of identity: something you know (password) plus something you have (TOTP app, hardware key) or are (biometric). It kills the vast majority of credential-stuffing attacks, because a leaked password alone is no longer enough.\n• **Passkeys / WebAuthn** are the strongest common option — phishing-resistant by design, because the secret never leaves the device. Ship them where you can.\n• **SMS codes** are the weakest second factor: SIM-swap and interception are real. Better than nothing, not a target.\n• **Zero trust** means stop treating 'inside the network' as trusted: authenticate and authorise every request, use short-lived identity tokens, and prefer per-service mTLS over a flat private network.\n• Practical hardening order: MFA on admin accounts → password manager + unique passwords → rate limit and lockout on login → alert on impossible-travel and new-device logins.",
    "• **MFA** identity ka doosra proof hai: jo aap jaante ho (password) plus jo aapke paas hai (TOTP app, hardware key) ya jo aap ho (biometric). Isse credential-stuffing attacks ke zyadatar cases mar jaate hain, kyunki sirf leaked password kaafi nahi rehta.\n• **Passkeys / WebAuthn** sabse strong common option hain — phishing-resistant by design, kyunki secret device se bahar jaata hi nahi. Jahan possible ho, ship karo.\n• **SMS codes** sabse kamzor second factor hain: SIM-swap aur interception asli hain. Kuch nahi se behtar, par target nahi.\n• **Zero trust** matlab \"network ke andar hai to trusted hai\" band karo: har request authenticate + authorise karo, chhote identity tokens use karo, aur flat private network ki jagah per-service mTLS rakho.\n• Practical order: admin accounts par MFA → password manager + unique passwords → login par rate limit aur lockout → impossible-travel aur new-device logins par alert.",
    ["security-authn-authz", "security-oauth-oidc", "security-network"],
  ),
  L(
    "security-encryption",
    "Encryption, hashing and keys",
    "security",
    ["difference between hashing and encryption", "encryption at rest", "what is a salt", "key rotation",
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
    ["how to do code review", "what is a good pull request", "what is trunk based development", "small pull requests"],
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

  // ---------------------------------------------------------------- languages, continued
  L(
    "language-java-jvm",
    "Java, the JVM and C#",
    "languages",
    ["what is java", "java vs c#", "what is the jvm", "java or c#"],
    ["java", "jvm", "c#", "dotnet", "kotlin", "bytecode", "graal"],
    "**Java (1995)** compiles to **bytecode** that runs on the JVM: write once, run anywhere, with a huge ecosystem and the most mature tooling of any runtime. Verbose by modern standards, and that is what Kotlin/Scala exist to fix without leaving the JVM.\n\n**C# (2000)** is Microsoft's answer: similar shape, generally nicer syntax, and now cross-platform via .NET. On Linux servers Java is the safer default; in a Microsoft shop C# is the natural choice.\n\n• Both are fast, GC'd and enterprise-proven — the choice is ecosystem and hiring, not speed.\n• For a new JVM service, Kotlin is a reasonable default; existing Java teams should not rewrite for syntax.",
    "**Java (1995)** **bytecode** mein compile hoti hai jo JVM par chalti hai: ek baar likho, kahin chalao — bada ecosystem aur sabse mature tooling. Modern nazariye se verbose, isi ke fix ke liye Kotlin/Scala aaye.\n\n**C# (2000)** Microsoft ka jawab hai: shape same, syntax aksar behtar, aur .NET se cross-platform. Linux servers par Java safe default hai; Microsoft waale setup mein C# natural hai.\n\n• Dono fast, GC'd aur enterprise-proven hain — choice ecosystem aur hiring ki hai, speed ki nahi.\n• Nayi JVM service ke liye Kotlin theek default hai; purani Java team ko sirf syntax ke liye rewrite nahi karna chahiye.",
    ["language-first-choice", "language-go-rust", "sys-gc-memory"],
  ),
  L(
    "language-rust-ownership",
    "Rust ownership and borrowing",
    "languages",
    ["rust ownership", "what is the borrow checker", "why is rust hard", "rust lifetimes"],
    ["rust", "ownership", "borrow", "borrower", "lifetime", "lifetimes", "mut"],
    "**Ownership** is Rust's rule for memory: every value has exactly one owner, and when the owner goes out of scope the value is freed — no GC, no manual free.\n\n**Borrowing** lets other code use the value without taking it: any number of shared (`&T`) borrows *or* exactly one mutable (`&mut T`) borrow at a time. That single rule is what makes data races compile-time errors instead of 3 a.m. bugs.\n\n**Lifetimes** are how the compiler knows a reference outlives its use — usually inferred, and only written out when a function returns a reference.\n\n• Expect the first week to be a fight with the borrow checker; after that it is mostly quiet.\n• Cheap workarounds when you are learning: clone, index instead of holding references, restructure instead of fighting — but do not reach for `unsafe`.",
    "**Ownership** Rust ka memory rule hai: har value ka ek hi owner hota hai, aur scope se bahar jaate hi value free — na GC, na manual free.\n\n**Borrowing** se doosra code value use kar sakta hai bina owner badle: kitne bhi shared (`&T`) borrow, ya sirf **ek** mutable (`&mut T`) borrow. Yahi ek rule data races ko compile-time error bana deta hai.\n\n**Lifetimes** compiler ko batate hain ki reference apne use se zyada jeeyega — aksar infer ho jaate hain, likhne tab padte hain jab function reference return kare.\n\n• Pehla hafta borrow checker se ladai hoti hai; uske baad shaant.\n• Seekhte waqt clone karo, reference hold karne ki jagah index karo — par `unsafe` ki taraf mat bhaago.",
    ["language-go-rust", "language-c", "sys-gc-memory"],
  ),
  L(
    "language-mobile",
    "Mobile: Swift and Kotlin",
    "languages",
    ["swift vs kotlin", "what is swift", "what is kotlin", "native vs cross platform mobile"],
    ["swift", "kotlin", "ios", "android", "flutter", "react native", "mobile"],
    "**Swift** (Apple, 2014) is the native language for iOS/macOS; **Kotlin** (JetBrains, 2011, Android-official since 2017) is the JVM language for Android. Both are modern, null-safe and pleasant — the split exists because the platforms do.\n\n**Cross-platform** (Flutter, React Native, Kotlin Multiplatform) trades native feel and platform API access for one codebase. It is the right call for content-ish apps and internal tools; it hurts when you need deep platform features, heavy graphics, or the newest OS APIs on day one.\n\n• Rule of thumb: two strong platform teams → native; one small team and a CRUD app → cross-platform.\n• Server work is unaffected — mobile clients just call your API; the API contract is what matters.",
    "**Swift** (Apple, 2014) iOS/macOS ki native language hai; **Kotlin** (2011, 2017 se Android-official) Android ki JVM language. Dono modern, null-safe aur acchi hain — split isliye hai kyunki platforms alag hain.\n\n**Cross-platform** (Flutter, React Native) ek codebase ke badle native feel aur platform APIs ki access deta hai. Content-type apps aur internal tools ke liye theek; deep platform features, heavy graphics ya naye OS APIs chahiye to dard hota hai.\n\n• Rule: do strong platform teams → native; chhoti team + CRUD app → cross-platform.\n• Server par koi farak nahi padta — mobile client aapki API hi call karta hai.",
    ["language-java-jvm", "language-first-choice", "arch-api"],
  ),
  L(
    "language-sql",
    "SQL as a language",
    "languages",
    ["what is sql", "how to learn sql", "what is a join", "sql join types"],
    ["sql", "join", "joins", "select", "where", "group", "having", "union"],
    "**SQL** is the declarative language of relational data: you describe *what* you want, the planner decides *how*. It is 50 years old and still the highest-leverage language to learn — every backend, data and ops job assumes it.\n\nThe core is small:\n• `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`.\n• **JOIN** combines tables: `INNER` (matches only), `LEFT` (keep all left rows, nulls on the right), `FULL`, `CROSS`.\n• **Aggregates** (`count`, `sum`, `avg`) collapse rows; `HAVING` filters *after* aggregation, `WHERE` before.\n\n• Learn `EXPLAIN` early — it turns \"the query is slow\" into a specific missing index or a full scan.\n• NULL is not a value: `=', `!=`, `IN` all do surprising things with it, and `NOT IN` with NULLs returns nothing.",
    "**SQL** relational data ki declarative language hai: aap batate ho *kya* chahiye, planner tay karta hai *kaise*. 50 saal purani aur aaj bhi sabse zyada kaam aane wali language — har backend/data/ops job ise maangta hai.\n\nCore chhota hai:\n• `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`.\n• **JOIN**: `INNER` (sirf matches), `LEFT` (left ke saare rows, right par null), `FULL`, `CROSS`.\n• **Aggregates** (`count`, `sum`, `avg`) rows collapse karte hain; `HAVING` aggregation ke *baad* filter karta hai, `WHERE` pehle.\n\n• `EXPLAIN` jaldi seekho — \"query slow hai\" ko missing index ya full scan mein badal deta hai.\n• NULL value nahi hai: `=`, `!=`, `IN` sab iske saath ajeeb behave karte hain, aur NULL wala `NOT IN` kuch return nahi karta.",
    ["db-indexes", "db-sql-vs-nosql", "db-normalization"],
  ),
  L(
    "language-compiled-interpreted",
    "Compiled vs interpreted vs JIT",
    "languages",
    ["compiled vs interpreted", "what is jit", "is python compiled", "why is python slow"],
    ["compiled", "interpreted", "jit", "bytecode", "ahead", "vm", "bytecodes"],
    "**Compiled ahead of time** (C, Rust, Go): the source becomes machine code before it runs — fastest startup and run, but you build per platform.\n\n**Interpreted** (classic Python, Ruby, shell): a runtime executes the source each time — portable and quick to iterate, slower to run.\n\n**JIT** (Java, C#, modern JS, PyPy): bytecode runs in a VM that compiles the hot paths to machine code while running. Best of both once warm, plus a warm-up cost and more memory.\n\n• \"Python is interpreted\" is a simplification — CPython compiles to bytecode and caches it (`.pyc`), but there is no JIT in the default implementation, which is exactly why heavy maths lives in C libraries (NumPy, PyTorch).\n• Serverless and CLI tools care about *startup*; long-running services care about *throughput*. That difference decides more arguments than language comparisons do.",
    "**Ahead-of-time compiled** (C, Rust, Go): source chalne se pehle machine code ban jaata hai — sabse fast startup aur run, par per platform build.\n\n**Interpreted** (classic Python, Ruby, shell): runtime har baar source execute karta hai — portable aur jaldi iterate, par slow.\n\n**JIT** (Java, C#, modern JS): bytecode VM mein chalta hai jo hot paths ko chalte-chalte machine code mein compile karta hai — warm hone par best, par warm-up cost aur zyada memory.\n\n• \"Python interpreted hai\" aadhi sach hai — CPython bytecode banata hai (`.pyc`), par JIT nahi hai — isliye bhaari maths C libraries (NumPy) mein hoti hai.\n• Serverless/CLI ko **startup** maayne rakhta hai, lambi services ko **throughput** — yeh farak zyadatar language debates se zyada decide karta hai.",
    ["language-python", "language-java-jvm", "perf-latency"],
  ),
  L(
    "language-functional-oo",
    "Functional vs object-oriented",
    "languages",
    ["functional vs object oriented", "what is functional programming", "what is oop", "pure function"],
    ["functional", "oop", "object", "oriented", "pure", "immutable", "immutability", "side effect"],
    "**OOP** organises code around objects that hold state and the methods that change it. **Functional** organises it around values and pure functions: same input, same output, no hidden state.\n\n• Functional's practical wins: pure functions are trivially testable, immutable values are safe to share across threads, and data transformations read top-to-bottom.\n• OOP's practical wins: modelling things with a lifecycle (a connection, a booking) is natural, and encapsulation keeps invariants in one place.\n\nAlmost every production codebase is a mix — the useful discipline is not picking a side but **isolating side effects**: keep the core logic pure, push I/O, time, randomness and mutation to the edges.\n\n• The smell to watch for in either style: a function that needs three collaborators and a database to be understood.",
    "**OOP** code ko objects ke around organise karta hai jo state aur uske methods rakhte hain. **Functional** values aur pure functions ke around: same input, same output, koi chhupi state nahi.\n\n• Functional ke practical fayde: pure functions test karna aasan, immutable values threads mein safe share hote hain, aur data transformation upar se neeche padhne layak hoti hai.\n• OOP ke fayde: lifecycle wali cheezein (connection, booking) model karna natural hai, aur encapsulation se invariants ek jagah rehte hain.\n\nZyadatar production codebase mix hota hai — asli discipline side hai chunna nahi, balki **side effects alag karna** hai: core logic pure rakho, I/O, time, randomness aur mutation kinare par.\n\n• Dono styles mein gandagi ki nishaani: wo function jise samajhne ke liye teen collaborators aur ek database chahiye.",
    ["eng-design-doc", "language-first-choice", "testing-pyramid"],
  ),
  // ---------------------------------------------------------------- web, continued
  L(
    "web-cors",
    "CORS, in one page",
    "web",
    ["what is cors", "cors error", "why is my request blocked", "access control allow origin"],
    ["cors", "origin", "preflight", "options", "allow", "credentials", "cross origin"],
    "**CORS** is the browser asking a *server* whether one origin may read its responses. It is not a server-to-server security feature, and not something your API can enforce for non-browser clients — `curl` ignores it entirely.\n\nThe mechanism: for a cross-origin request the browser sends an `Origin` header and, for anything beyond a simple GET/POST with simple headers, an **`OPTIONS` preflight** first. The server answers with `Access-Control-Allow-Origin` (and `-Methods`, `-Headers`). No matching header → the browser blocks the response, and you see the CORS error in the console.\n\n• `Access-Control-Allow-Origin: *` and `Allow-Credentials: true` cannot be combined — with cookies you must echo the exact origin (and keep an allow-list).\n• Preflights are cached via `Access-Control-Max-Age`; missing that header is why some apps OPTIONS every request.\n• A 500 on the preflight means your route does not handle `OPTIONS`, not that CORS is \"misconfigured\".",
    "**CORS** browser ka aapki server se sawaal hai: is origin ko aapki response padhne ki ijazat hai? Yeh server-to-server security nahi hai, aur non-browser clients (`curl`) ise ignore karte hain.\n\nTareeqa: cross-origin request par browser `Origin` header bhejta hai, aur simple GET/POST se aage kuch bhi ho to pehle **`OPTIONS` preflight**. Server `Access-Control-Allow-Origin` (aur `-Methods`, `-Headers`) se jawab deta hai. Header match na ho → browser response block kar deta hai, console mein CORS error dikhta hai.\n\n• `Allow-Origin: *` aur `Allow-Credentials: true` saath nahi chalte — cookies ke saath exact origin echo karo (allow-list ke saath).\n• Preflight `Access-Control-Max-Age` se cache hota hai; wo header na hone se har request par OPTIONS jaata hai.\n• Preflight par 500 ka matlab route `OPTIONS` handle nahi karta, CORS \"galat config\" nahi.",
    ["web-cache-headers", "security-owasp", "web-api-gateway"],
  ),
  L(
    "web-cookies-storage",
    "Cookies, localStorage and sessions",
    "web",
    ["cookies vs localstorage", "where to store jwt", "what is a session cookie", "httponly"],
    ["cookie", "cookies", "localstorage", "sessionstorage", "httponly", "samesite", "secure", "session"],
    "• **Cookie**: sent with every request to that domain, so it is the only option for a server session. Flags matter: `HttpOnly` (JavaScript cannot read it — the biggest XSS protection available), `Secure` (HTTPS only), `SameSite=Lax/Strict` (blocks most CSRF).\n• **localStorage / sessionStorage**: JavaScript-only, not sent automatically, gone on clear (session storage on tab close). Convenient, and readable by any script that runs on your page — so an XSS bug steals everything there.\n• **Where to put a session token**: in an `HttpOnly`, `Secure`, `SameSite` cookie. Putting a JWT in localStorage is the common mistake: it is XSS-readable and it is not a session you can revoke server-side.\n\n• Cookies cost bytes on every request — never store big objects or lists in them.\n• Do not trust anything in a cookie you did not sign: the client can edit it.",
    "• **Cookie**: us domain ki har request ke saath jaata hai, isliye server session ka yahi ek option hai. Flags maayne rakhte hain: `HttpOnly` (JavaScript padh nahi sakti — sabse bada XSS bachav), `Secure` (sirf HTTPS), `SameSite=Lax/Strict` (CSRF block karta hai).\n• **localStorage / sessionStorage**: sirf JavaScript ke liye, automatically nahi jaata, clear par gayab (session storage tab band hone par). Aasan hai, par page par chala koi bhi script padh sakta hai — XSS bug wahan ka sab kuch le jaata hai.\n• **Session token kahan rakhein**: `HttpOnly`, `Secure`, `SameSite` cookie mein. JWT ko localStorage mein rakhna aam galti hai: XSS usse padh sakta hai aur server-side revoke nahi hota.\n\n• Cookies har request par bytes kharch karte hain — bade objects/lists kabhi mat rakho.\n• Jo cookie aapne sign nahi ki, uspar bharosa mat karo — client usse badal sakta hai.",
    ["security-owasp", "web-cors", "security-oauth-oidc"],
  ),
  L(
    "web-cache-headers",
    "Cache-Control, ETag and CDN semantics",
    "web",
    ["what is cache control", "what is an etag", "how does caching work in http", "no cache vs no store"],
    ["cache-control", "etag", "max-age", "expires", "stale", "revalidate", "immutable", "vary"],
    "HTTP caching is decided by headers, and getting four of them right removes most \"why is the old version still showing?\" bugs.\n\n• `Cache-Control: public, max-age=31536000, immutable` — for **fingerprinted** assets (`app.4f2a1c.js`). Forever is safe because the name changes with the bytes.\n• `Cache-Control: no-cache` — *not* \"do not cache\"; it means \"cache, but revalidate before using\". `no-store` is the real \"never keep this\" (use it for personal data).\n• `ETag` + `If-None-Match` — the server answers **304 Not Modified** with no body when nothing changed: cheap correctness for HTML and APIs.\n• `Vary: Accept-Encoding, Authorization` — cache keys must include the things the response depends on, or one user's response gets served to another. This is where cache bugs become security bugs.\n\n• Debug order: is it the browser, the CDN, or your app? Check response headers on the *second* request — that is the one that shows what is really cached.\n• Never cache an authenticated API response publicly, and purge the CDN path when you ship a hotfix to a cached asset.",
    "HTTP caching headers se tay hoti hai, aur chaar cheezein theek karo to \"purana version kyun dikh raha hai\" bugs khatam:\n\n• `Cache-Control: public, max-age=31536000, immutable` — **fingerprinted** assets ke liye (`app.4f2a1c.js`). Hamesha theek hai kyunki naam bytes ke saath badalta hai.\n• `no-cache` ka matlab \"cache mat karo\" **nahi**, balki \"cache karo, par use se pehle revalidate karo\". Asli \"kabhi store na karo\" `no-store` hai (personal data ke liye).\n• `ETag` + `If-None-Match` — kuch na badla ho to server **304 Not Modified** deta hai bina body ke.\n• `Vary: Accept-Encoding, Authorization` — jo cheez response decide karti hai wo cache key mein honi chahiye, warna ek user ka response doosre ko mil sakta hai. Yahan cache bug security bug ban jaata hai.\n\n• Debug order: browser, CDN ya app? **Doosri** request ke headers dekho — wahi asli cache batate hain.\n• Authenticated API response kabhi publicly cache mat karo, aur hotfix ke baad CDN path purge karo.",
    ["web-cdn", "web-caching", "perf-latency"],
  ),
  L(
    "web-cdn",
    "CDNs",
    "web",
    ["what is a cdn", "how does a cdn work", "what is an edge", "why use a cdn"],
    ["cdn", "edge", "pop", "origin", "akamai", "cloudflare", "cloudfront", "cache"],
    "A **CDN** is a network of edge servers that sit between users and your origin, keeping copies of cacheable responses close to where people are.\n\nWhat it buys you:\n• **Latency**: the bytes come from a nearby city instead of your region.\n• **Offload**: static assets and cacheable API reads never touch your servers, so a traffic spike or a scraping burst hits the CDN.\n• **Availability and DDoS absorption**: the edge can serve cached content while your origin restarts, and it absorbs raw floods.\n• Also useful beyond caching: TLS termination, HTTP/3, WAF rules, image resizing, and edge redirects.\n\n• Cache invalidation is the hard part: fingerprint asset names and use short TTLs + purge APIs rather than a long TTL and hope.\n• Know what your CDN caches *by default* — HTML with `Set-Cookie` or an `Authorization` header must not be cached publicly, or you will serve one tenant's page to another.",
    "**CDN** edge servers ka network hai jo users aur aapke origin ke beech baithta hai aur cacheable responses ki copy users ke paas rakhta hai.\n\nFaayde:\n• **Latency**: bytes nazdeeki city se aate hain, aapke region se nahi.\n• **Offload**: static assets aur cacheable API reads aapke server ko chhoote hi nahi, to spike ya scraping burst CDN par rukta hai.\n• **Availability aur DDoS absorption**: origin restart ho raha ho to edge cached content serve karta hai, aur raw floods absorb karta hai.\n• Caching ke alawa bhi: TLS termination, HTTP/3, WAF rules, image resizing, edge redirects.\n\n• Mushkil hissa invalidation hai: asset names fingerprint karo, short TTL + purge API use karo, lamba TTL rakh kar ummeed nahi.\n• Jaano aapka CDN *default* mein kya cache karta hai — `Set-Cookie` ya `Authorization` wala HTML publicly cache nahi hona chahiye, warna ek tenant ka page doosre ko milega.",
    ["web-cache-headers", "web-load-balancer", "web-http-versions"],
  ),
  L(
    "web-pagination",
    "Pagination: offset vs cursor",
    "web",
    ["how to paginate an api", "offset vs cursor pagination", "keyset pagination", "limit offset slow"],
    ["pagination", "offset", "cursor", "keyset", "limit", "page", "next"],
    "**Offset pagination** (`LIMIT 20 OFFSET 400`) is easy and answers \"page 21\" directly, but it has two problems: the database still walks the skipped rows (slow deep in the list), and rows shift under you — insert an item while someone is paging and they see a duplicate or miss a record.\n\n**Cursor (keyset) pagination** (`WHERE (created_at, id) < (:last_created, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20`) is O(log n) with the right index and stable: the cursor is a position in a sorted list, not a count. Opaque cursor strings let you change the ordering later without breaking clients.\n\n• Default to cursor for anything that grows without bound (incidents, events, logs, feeds).\n• Keep offset for admin tables and small, stable lists where \"jump to page 7\" is a real requirement.\n• Always return a total *only* if you can compute it cheaply — a `COUNT(*)` over a big filtered table is often the slowest part of the request.",
    "**Offset pagination** (`LIMIT 20 OFFSET 400`) aasan hai aur \"page 21\" seedha deta hai, par do dikkat: database skip kiye rows par bhi chalta hai (list gehri hone par slow), aur rows shift hote hain — paging ke beech item insert hua to duplicate dikhega ya record chhoot jayega.\n\n**Cursor (keyset) pagination** (`WHERE (created_at, id) < (:last_created, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20`) sahi index ke saath O(log n) hai aur stable: cursor sorted list mein position hai, ginti nahi. Opaque cursor string se baad mein ordering badal sakte ho bina clients tode.\n\n• Jo list badhti rehti hai (incidents, events, logs, feeds) uske liye cursor default rakho.\n• Offset admin tables aur chhoti stable lists ke liye rakho jahan \"page 7 par jao\" asli requirement hai.\n• Total sirf tab return karo jab sasta ho — bade filtered table par `COUNT(*)` aksar poore request ka sabse slow hissa hota hai.",
    ["arch-api", "db-indexes", "perf-latency"],
  ),
  L(
    "web-api-versioning",
    "Versioning an API",
    "web",
    ["how to version an api", "api versioning best practice", "breaking change in api", "deprecate an api"],
    ["versioning", "version", "v1", "v2", "breaking", "deprecate", "deprecation", "contract"],
    "Version an API only when you must — the cheaper answer is usually **additive change**: new optional fields, new endpoints, new enum values that old clients ignore.\n\nWhen it is genuinely breaking (renaming a field, changing a type, changing semantics):\n• **Version in the URL** (`/api/v2/…`) or in a header (`Accept: application/vnd.api+json;version=2`). URL is uglier and far easier to debug, route and reason about; header versioning is cleaner and harder to see.\n• **Run both**, never migrate by surprise: v1 keeps working while clients move, with a published **deprecation date** and a `Deprecation`/`Sunset` header.\n• **Measure usage per version** before switching anything off — \"nobody uses it\" is a guess until you have the numbers.\n• Bigger APIs: version the *contract* (OpenAPI) and generate clients from it, so the drift is visible in review.\n\n• Whatever you choose, write it down: what a version number promises (and does not) is more important than where it sits in the path.",
    "API version sirf tab karo jab zaroori ho — sasta jawab aksar **additive change** hai: naye optional fields, naye endpoints, naye enum values jinhe purane clients ignore kar dete hain.\n\nSach mein breaking ho (field rename, type change, semantics change) to:\n• **URL mein version** (`/api/v2/…`) ya header mein (`Accept: ...;version=2`). URL bada hai par debug/route karna aasan; header saaf hai par dikhta nahi.\n• **Dono chalao**, surprise mein migrate mat karo: v1 chalta rahe jab tak clients move karein, published **deprecation date** aur `Deprecation`/`Sunset` header ke saath.\n• Version-wise usage **measure** karo — \"koi use nahi karta\" tab tak guess hai jab tak numbers na ho.\n• Bade APIs: **contract** (OpenAPI) version karo aur clients usse generate karo, taaki drift review mein dikhe.\n\n• Jo bhi chuno, likho: version number kya promise karta hai (aur kya nahi) — yeh path mein kahan baitha hai usse zyada important hai.",
    ["arch-api", "eng-design-doc", "ops-change-management"],
  ),
  L(
    "web-api-gateway",
    "API gateways",
    "web",
    ["what is an api gateway", "gateway vs load balancer", "gateway vs reverse proxy", "api gateway vs service mesh"],
    ["gateway", "kong", "apigee", "ingress", "proxy", "route", "apikey", "throttle"],
    "An **API gateway** is the front door for API traffic: routing, authentication, rate limits and quotas, request/response shaping, sometimes caching and usage analytics. One place to enforce policy instead of N services each doing it differently.\n\nHow it differs from its neighbours:\n• **Load balancer**: distributes connections to healthy backends. No business logic.\n• **Reverse proxy**: terminates TLS, forwards requests, maybe caches (nginx).\n• **Gateway**: the above plus API-level concerns (authn/z, keys, quotas, version routing, sometimes transformations).\n• **Service mesh**: service-to-service traffic *inside* the network — retries, mTLS, telemetry. The gateway is north-south (client → platform); the mesh is east-west (service → service).\n\n• The gateway is a single point of failure and an extra hop — run it as a fleet, watch its latency, and keep the timeout/retry policy there in one place.\n• Do not put business logic in it; policy yes, domain rules no, or your platform team becomes a bottleneck for every feature.",
    "**API gateway** API traffic ka front door hai: routing, authentication, rate limits aur quotas, request/response shaping, kabhi caching aur usage analytics. Policy ek jagah lagti hai, N services mein alag-alag nahi.\n\nPadosiyon se farak:\n• **Load balancer**: connections healthy backends ko baantta hai. Koi business logic nahi.\n• **Reverse proxy**: TLS terminate, request aage bhejo, caching ho sakti hai (nginx).\n• **Gateway**: upar wala sab + API-level cheezein (authn/z, keys, quotas, version routing, transformations).\n• **Service mesh**: network ke *andar* service-to-service traffic — retries, mTLS, telemetry. Gateway north-south hai (client → platform), mesh east-west (service → service).\n\n• Gateway single point of failure aur extra hop hai — fleet mein chalao, latency dekho, aur timeout/retry policy wahin ek jagah rakho.\n• Usme business logic mat daalo; policy haan, domain rules nahi, warna platform team har feature ka bottleneck ban jaati hai.",
    ["web-load-balancer", "infra-service-mesh", "web-rate-limit"],
  ),
  L(
    "web-event-loop",
    "The event loop and async",
    "web",
    ["what is the event loop", "why is node single threaded", "promises vs async await", "callback hell"],
    ["event", "loop", "async", "await", "promise", "promises", "callback", "microtask", "single-threaded"],
    "JavaScript runs on one thread with an **event loop**: it executes your synchronous code, then drains queued callbacks. Nothing is parallel — but while a network call is pending, other work runs, which is why Node handles many concurrent I/O requests on one core.\n\nThe consequences that bite:\n• **Never block the loop**: a long CPU loop (or a sync filesystem/JSON parse on a huge payload) freezes every in-flight request on that process. Do it in a worker thread, or split it.\n• **Promises/async-await** are just syntax over callbacks: `await` yields the loop until the promise settles. Forget an `await` and you get \"cannot read property of undefined\" at the worst time.\n• **Ordering**: promise callbacks (microtasks) run before timers and I/O (macrotasks) — which is why `await Promise.resolve()` can reorder work you expected to be synchronous.\n• For real CPU parallelism, use workers or extra processes (Node's `cluster` / a process manager), not more `async`.\n\n• Debug trick: if latency is fine at low load and terrible under load while CPU is not saturated, suspect a blocked loop or a queue with no bound.",
    "JavaScript ek thread par **event loop** ke saath chalti hai: sync code chalta hai, phir queued callbacks drain hote hain. Parallel kuch nahi — par network call pending hone ke dauraan baaki kaam chalta hai, isliye Node ek core par bahut concurrent I/O requests handle karta hai.\n\nJo cheezein dard deti hain:\n• **Loop block mat karo**: lamba CPU loop (ya bade payload par sync JSON parse) us process ki saari in-flight requests freeze kar deta hai. Worker thread mein karo ya todkar karo.\n• **Promises/async-await** callbacks ke upar syntax hain: `await` loop chhod kar promise settle hone ka wait karta hai. `await` bhoolo to sabse kharab waqt par \"cannot read property of undefined\".\n• **Ordering**: promise callbacks (microtasks) timers aur I/O (macrotasks) se pehle chalte hain — isliye `await Promise.resolve()` aapke expected order badal deta hai.\n• Asli CPU parallelism ke liye workers ya extra processes (Node `cluster`) use karo, zyada `async` nahi.\n\n• Debug trick: kam load par latency theek, load par kharab, CPU bhi saturate nahi — blocked loop ya unbounded queue socho.",
    ["sys-process-thread", "sys-gc-memory", "perf-latency"],
  ),
  L(
    "web-browser-perf",
    "Frontend performance",
    "web",
    ["how to make a website fast", "what are core web vitals", "why is my page slow", "largest contentful paint"],
    ["lcp", "cls", "inp", "vitals", "frontend", "bundle", "render", "browser", "slow page"],
    "Users feel frontend performance as three things: **when the main content appeared** (LCP), **whether it jumped around while loading** (CLS), and **how quickly it responded to a click** (INP). Everything else is diagnostics.\n\nThe order that actually helps:\n1. **Ship less JavaScript.** Bundle size is the biggest lever in most apps — split routes, drop the two-hundred-kilobyte dependency nobody needs, and check the bundle per release.\n2. **Load what matters first**: preload the hero image and font, defer everything below the fold, and never let a third-party script block rendering.\n3. **Cache aggressively but correctly** (fingerprinted assets, `immutable`), and serve from a CDN.\n4. **Measure on real users** (RUM/Web Vitals), not only on your laptop — a fast machine on office wifi hides everything.\n\n• Images are usually the biggest bytes: right size, right format (WebP/AVIF), lazy-load below the fold, and reserve dimensions so nothing shifts.\n• Set a budget (\"main bundle < 200 KB\") and fail the build when it is exceeded — performance regresses one innocent dependency at a time.",
    "Frontend performance users ko teen tarah se mehsoos hoti hai: **main content kab aaya** (LCP), **load hote waqt kooda kya** (CLS), aur **click par kitni jaldi response** (INP). Baaki sab diagnostics hain.\n\nJo order sach mein kaam karta hai:\n1. **JavaScript kam bhejo.** Sabse bada lever bundle size hai — routes split karo, wo 200 KB ki dependency hatao jise koi use nahi karta, aur har release par bundle check karo.\n2. **Jo pehle chahiye wahi pehle load karo**: hero image aur font preload, fold ke neeche sab defer, aur koi third-party script render block na kare.\n3. **Cache aggressively par sahi** (fingerprinted assets, `immutable`), aur CDN se serve karo.\n4. **Asli users par measure karo** (RUM/Web Vitals), sirf laptop par nahi.\n\n• Images aksar sabse bade bytes hote hain: sahi size, sahi format (WebP/AVIF), fold ke neeche lazy, aur dimensions reserve karo taaki shift na ho.\n• Budget tay karo (\"main bundle < 200 KB\") aur build fail karo jab exceed ho — performance ek-ek innocent dependency se regress karti hai.",
    ["web-cdn", "web-cache-headers", "perf-latency"],
  ),

  // ---------------------------------------------------------------- databases, continued
  L(
    "db-transactions-isolation",
    "Transactions and isolation levels",
    "databases",
    ["what are isolation levels", "what is a dirty read", "phantom read", "read committed vs repeatable read", 'what is an isolation level', 'transaction isolation'],
    ["isolation", "transaction", "transactions", "dirty", "phantom", "serializable", "read", "committed"],
    "A **transaction** groups statements so they all commit or all roll back (that is the A and C of ACID). **Isolation levels** decide what a transaction may see of others' unfinished work.\n\nFrom weakest to strongest, with the anomaly each allows:\n• **Read uncommitted** — dirty reads (you see uncommitted data). Rarely useful.\n• **Read committed** (Postgres default) — no dirty reads, but the same query can return different rows twice.\n• **Repeatable read** — one snapshot for the transaction; no non-repeatable reads, may still allow write skew.\n• **Serializable** — as if transactions ran one after another. Correct and slowest; expect retries on conflict.\n\n• The bug you actually hit at read committed: read-modify-write without a lock (`balance = balance + 10` as two statements). Fix with one atomic statement, `SELECT … FOR UPDATE`, or a higher level for that transaction only.\n• Do not raise the default level globally \"to be safe\" — you buy correctness with throughput and retry logic. Raise it per transaction that needs it.",
    "**Transaction** statements ko group karta hai: sab commit ya sab rollback (ACID ka A aur C). **Isolation level** tay karta hai ki ek transaction doosre ke adhoore kaam mein kya dekh sakta hai.\n\nKamzor se strong tak, aur uska anomaly:\n• **Read uncommitted** — dirty read (uncommitted data dikhta hai). Kam kaam ka.\n• **Read committed** (Postgres default) — dirty read nahi, par same query do baar different rows de sakti hai.\n• **Repeatable read** — poore transaction ke liye ek snapshot; write skew bacha sakta hai.\n• **Serializable** — jaise transactions ek ke baad ek chale. Sahi par sabse slow; conflict par retry expect karo.\n\n• Read committed par asli bug: bina lock ke read-modify-write (`balance = balance + 10` do statements mein). Fix: ek atomic statement, `SELECT … FOR UPDATE`, ya sirf usi transaction ka level badhao.\n• Default level globally \"safe rehne ke liye\" mat badhao — throughput aur retry logic ki keemat hai. Jahan chahiye wahan per-transaction badhao.",
    ["db-acid", "db-locks", "db-consistency-models"],
  ),
  L(
    "db-normalization",
    "Normalization and denormalization",
    "databases",
    ["what is normalization", "what is 3nf", "denormalization", "why normalize a database"],
    ["normalization", "normalisation", "normal", "1nf", "2nf", "3nf", "denormalize", "duplicate"],
    "**Normalization** stores each fact once: no duplicated customer addresses, no \"the category name is spelled three ways\". The usual target is **3NF** — every non-key column depends on the key, the whole key, and nothing but the key.\n\nWhy it matters in practice: one row to update when a name changes, no chance of two sources disagreeing, and smaller tables.\n\n**Denormalization** deliberately duplicates for read speed: a summary column, a materialised view, a copy of the author's name on every post. It is correct when reads dominate and the duplication is *owned* by one writer.\n\n• Normalize first — it is easier to denormalize later with real query patterns than to un-duplicate a mess.\n• If you denormalize, write down who maintains the copy and how it is repaired when it drifts (a job, a trigger, or a rebuild command).\n\n• The exception: analytical stores (OLAP) are deliberately denormalized (star schema) because reads are scans over millions of rows and joins there are expensive.",
    "**Normalization** har fact ek hi jagah rakhta hai: customer address duplicate nahi, category ka naam teen tarah se spelled nahi. Target aksar **3NF** hota hai — har non-key column key par depend kare, poori key par, aur sirf key par.\n\nKaam kyun aata hai: naam badla to ek row update, do sources ka disagreement nahi, chhoti tables.\n\n**Denormalization** jaan-boojh kar duplicate karta hai read speed ke liye: summary column, materialised view, har post par author ka naam. Tab sahi hai jab reads zyada hain aur duplicate copy ka **owner** ek writer hai.\n\n• Pehle normalize karo — baad mein asli query patterns ke saath denormalize karna aasan hai, unduplicate karna mushkil.\n• Denormalize karo to likho kaun copy maintain karta hai aur drift hone par repair kaise hoti hai (job, trigger, ya rebuild command).\n\n• Exception: analytical stores (OLAP) deliberately denormalized hote hain (star schema), kyunki wahan reads millions of rows ka scan hoti hai aur joins mehnge hain.",
    ["db-indexes", "db-oltp-olap", "db-sql-vs-nosql"],
  ),
  L(
    "db-nosql-types",
    "Types of NoSQL database",
    "databases",
    ["types of nosql", "document vs key value", "what is a graph database", "wide column database", 'what is a document database', 'document database'],
    ["nosql", "document", "key", "value", "graph", "column", "mongo", "cassandra", "dynamo"],
    "\"NoSQL\" is four different tools with different trade-offs — pick by access pattern, not by fashion:\n\n• **Document** (MongoDB, Couchbase): JSON-ish documents, usually one document per entity. Great when you always fetch whole objects; weak when you need joins across them.\n• **Key-value** (Redis, DynamoDB, memcached): get/put by key, microseconds, no query language. Sessions, caches, feature flags, counters.\n• **Wide-column** (Cassandra, ScyllaDB, Bigtable): huge write throughput across many nodes, query modelled per access pattern; design is decided before you write, not after.\n• **Graph** (Neo4j, Neptune): nodes and edges with traversals — fraud rings, recommendations, permission graphs. Awkward for anything that is not a relationship question.\n\n• They trade away joins, cross-record transactions and ad-hoc queries for scale and flexible schema. If you need all three of the former, a relational database is still the better tool.\n• \"Schemaless\" means the *database* will not stop you writing nonsense — so validation moves into your application, and it still has to exist.",
    "\"NoSQL\" chaar alag tools hain, alag trade-offs ke saath — fashion se nahi, access pattern se chuno:\n\n• **Document** (MongoDB, Couchbase): JSON-jaisa document, aksar ek document = ek entity. Tab best jab hamesha pura object chahiye; joins chahiye to kamzor.\n• **Key-value** (Redis, DynamoDB): key se get/put, microseconds, koi query language nahi. Sessions, caches, flags, counters.\n• **Wide-column** (Cassandra, ScyllaDB): bahut write throughput, query access pattern ke hisaab se model hoti hai; design likhne se pehle tay hota hai.\n• **Graph** (Neo4j, Neptune): nodes aur edges — fraud rings, recommendations, permissions. Jo relationship ka sawaal nahi hai uske liye bhaari.\n\n• Ye joins, cross-record transactions aur ad-hoc queries chhod dete hain scale aur flexible schema ke liye. Teeno chahiye to relational database hi behtar hai.\n• \"Schemaless\" matlab database aapko gandagi likhne se rokega nahi — validation app mein jaata hai, par karna phir bhi padta hai.",
    ["db-sql-vs-nosql", "db-postgres-mysql", "db-redis"],
  ),
  L(
    "db-search-engines",
    "Search engines (Elasticsearch and friends)",
    "databases",
    ["what is elasticsearch", "full text search vs like", "what is an inverted index", "why is elasticsearch fast"],
    ["elasticsearch", "opensearch", "search", "inverted", "index", "lucene", "tokenize", "relevance"],
    "A search engine is a **document store with an inverted index**: instead of scanning rows, it maps every token to the documents containing it, then scores relevance.\n\nWhy you cannot do this with `LIKE '%term%'`:\n• `LIKE %x%` cannot use a B-tree index — it scans every row, and it has no idea about relevance, stemming or typos.\n• A search index understands tokens (\"running\" matches \"run\"), ranks by relevance (TF-IDF/BM25), and supports fuzzy matching, highlighting and facets.\n\n• The trade: it is a **secondary** store. You still keep the source of truth in your database and index into the engine (near-real-time — expect a second or so of lag, not zero).\n• Keep the indexed document shaped for the screen; reindexing a big index is expensive and takes longer than you think, so plan for a rebuildable, versioned mapping.\n• Rule of thumb: exact lookups and transactions → Postgres; \"find documents that feel like this\" → search engine. Many products need both.",
    "Search engine ek **document store + inverted index** hai: rows scan karne ki jagah har token ko uske documents se map karta hai, phir relevance score karta hai.\n\n`LIKE '%term%'` se kyun nahi hota:\n• `LIKE %x%` B-tree index use nahi kar sakta — poori table scan, aur relevance, stemming ya typos ka koi idea nahi.\n• Search index tokens samajhta hai (\"running\" → \"run\"), relevance (TF-IDF/BM25) se rank karta hai, fuzzy match, highlighting, facets deta hai.\n\n• Trade: yeh **secondary** store hai. Source of truth aapke database mein hi rehta hai, index wahan jaata hai (near-real-time — 1 second ka lag normal hai, zero nahi).\n• Indexed document screen ke hisaab se shape karo; bada index reindex karna mehnga aur slow hota hai, to rebuildable versioned mapping ka plan rakho.\n• Rule: exact lookups aur transactions → Postgres; \"aise documents dhoondho\" → search engine. Bahut products ko dono chahiye.",
    ["db-indexes", "db-redis", "arch-knowledge"],
  ),
  L(
    "db-timeseries",
    "Time-series data",
    "databases",
    ["what is a time series database", "how to store metrics", "influxdb vs prometheus", "downsampling metrics", 'what is a timeseries database', 'timeseries database'],
    ["timeseries", "time-series", "prometheus", "influxdb", "metric", "metrics", "downsample", "retention"],
    "Time-series data is append-only, timestamped and boring: `(timestamp, series, value)`. That shape needs different machinery from a row store.\n\n• **Specialised databases** (Prometheus, InfluxDB, TimescaleDB) compress by delta-of-deltas and columnar layout, so millions of points per second are cheap; they also handle **downsampling** (raw 10s data → 1-minute averages after a week) and **retention** (drop raw data after N days).\n• **A normal relational table** works surprisingly far if you index `(series_id, at)` and partition by time; it becomes painful around hundreds of millions of rows or when writes compete with app traffic.\n• Never store high-cardinality labels (user id, request id, trace id) as a metric dimension — that is the classic way to melt a metrics backend. Put those in logs/traces and keep metrics low-cardinality.\n\n• Retention and downsampling are design decisions, not afterthoughts: decide what you keep at what resolution *before* the disk fills.\n• Query language matters: PromQL-style range queries answer \"what was p99 last week\" without pulling raw points.",
    "Time-series data append-only, timestamped aur boring hota hai: `(timestamp, series, value)`. Is shape ko row store se alag machinery chahiye.\n\n• **Specialised databases** (Prometheus, InfluxDB, TimescaleDB) delta compression aur columnar layout se compress karte hain, isliye millions of points per second sasta padta hai; **downsampling** (10s raw → ek hafte baad 1-minute average) aur **retention** (N din baad raw data drop) bhi sambhalte hain.\n• **Normal relational table** kaafi door tak chalti hai agar `(series_id, at)` index ho aur time se partition; dard tab shuru hota hai jab rows kai crore ho ya writes app traffic se compete karein.\n• High-cardinality labels (user id, request id, trace id) metric dimension kabhi mat banao — metrics backend pighal jaata hai. Wo logs/traces mein rakho, metrics low-cardinality.\n\n• Retention aur downsampling design decisions hain: disk bharta hai usse pehle tay karo kis resolution par kya rakhna hai.\n• Query language maayne rakhti hai: PromQL jaise range queries \"pichhle hafte p99 kya tha\" bina raw points pull kar ke dete hain.",
    ["ops-observability", "ops-alerting", "db-partitioning"],
  ),
  L(
    "db-partitioning",
    "Table partitioning",
    "databases",
    ["what is table partitioning", "partition by date", "partition vs shard", "why is my table slow"],
    ["partition", "partitioning", "partitions", "range", "prune", "archive", "vacuum"],
    "**Partitioning** splits one logical table into physical chunks inside the *same* database — usually by time range (`incidents_2026_09`) or by tenant hash.\n\nWhat it buys:\n• **Query pruning**: a query with `WHERE at >= '2026-09-01'` reads one partition instead of the whole table.\n• **Cheap deletes**: dropping a partition is instant; `DELETE FROM … WHERE at < …` rewrites and bloats the table, and vacuum has to clean up afterwards.\n• **Maintenance wins**: indexes, vacuum and backups work per partition.\n\n• It is not sharding: partitioning is one machine, sharding spreads across machines. Partition first; shard only when a single machine is genuinely the limit.\n• Partitioning does not make a single bad query fast — if every query scans all partitions, you have the same problem with more parts. The partition key must match the query filter.\n• Watch for too many partitions (thousands hurt planning) and for cross-partition unique constraints, which Postgres cannot enforce.",
    "**Partitioning** ek logical table ko *same* database ke andar physical chunks mein todta hai — aksar time range se (`incidents_2026_09`) ya tenant hash se.\n\nFaayde:\n• **Query pruning**: `WHERE at >= '2026-09-01'` wali query poori table ki jagah ek partition padhti hai.\n• **Sasta delete**: partition drop instant hai; `DELETE FROM … WHERE at < …` table ko rewrite/bloat karta hai aur phir vacuum ka kaam banta hai.\n• **Maintenance**: indexes, vacuum, backups per partition chalte hain.\n\n• Yeh sharding nahi hai: partitioning ek machine par, sharding machines mein faila hua. Pehle partition karo; shard sirf tab jab ek machine sach mein limit ho.\n• Partitioning kisi ek kharab query ko fast nahi banata — sab queries saare partitions scan karein to problem wahi hai, sirf parts zyada. Partition key query filter se match hona chahiye.\n• Bahut zyada partitions (hazaaron) planning kharab karte hain, aur cross-partition unique constraint Postgres enforce nahi kar sakta.",
    ["db-replication", "db-hot-partition", "db-timeseries"],
  ),
  L(
    "db-backups",
    "Backups, PITR and restore drills",
    "databases",
    ["how to back up a database", "what is point in time recovery", "backup vs replication", "how to test a backup"],
    ["backup", "backups", "pitr", "restore", "snapshot", "wal", "recovery", "dump"],
    "A backup you have never restored is a belief. The engineering checklist:\n\n• **Full + incremental + WAL/binlog** gives **point-in-time recovery**: restore last night's full backup, then replay the log to 09:41 when the bad migration ran — not to \"last night\".\n• **Backups are not replication.** A replica faithfully reproduces your `DELETE FROM incidents` within milliseconds; a backup lets you go back in time. You need both, they solve different incidents.\n• **Store somewhere else and somewhere immutable**: a different account/region, with object-lock or versioning, and credentials the app does not have. Ransomware and a compromised app both start by deleting the backups.\n• **Encrypt** the backups and test the restore key separately, or you will discover the key lived only in the server you lost.\n\n• Put a restore on the calendar: quarterly, into a scratch account, timed. Write down how long it took — that number *is* your real RTO, and it belongs in the DR plan.\n• Verify with a row count or a checksum on a known table, not with \"the job said success\".",
    "Jise kabhi restore na kiya, wo backup ek aankda hai. Checklist:\n\n• **Full + incremental + WAL/binlog** se **point-in-time recovery** milti hai: raat ka full backup restore karo, phir log replay karke 09:41 par le jao jab kharab migration chali — \"kal raat\" par nahi.\n• **Backup replication nahi hai.** Replica aapka `DELETE FROM incidents` milliseconds mein copy kar deta hai; backup time mein peeche jaane deta hai. Dono chahiye, dono alag incident ke liye.\n• **Kahin aur aur immutable rakho**: doosra account/region, object-lock ya versioning, aur aisi credentials jo app ke paas na hon. Ransomware aur compromised app dono pehle backup delete karte hain.\n• **Encrypt** karo, aur restore key ka test alag se rakho — warna pata chalega ki key usi server par thi jo gaya.\n\n• Calendar par restore rakho: quarterly, scratch account mein, time karke. Kitna time laga, likho — wahi aapka asli RTO hai, aur woh DR plan ka hissa hai.\n• \"Job success bola\" se verify nahi hota: kisi known table ka row count ya checksum dekho.",
    ["ops-runbook", "db-replication", "ops-postmortem"],
  ),
  L(
    "db-locks",
    "Database locks and contention",
    "databases",
    ["what is a database lock", "why is my transaction waiting", "deadlock in postgres", "lock timeout", 'postgres deadlock'],
    ["lock", "locks", "locked", "contention", "wait", "blocking", "advisory", "for update"],
    "Databases keep correctness with **locks**, and every lock is a queue someone can be stuck behind.\n\n• **Row locks** come from writes (`UPDATE`/`DELETE`) and from explicit `SELECT … FOR UPDATE`. Two transactions updating the same row: the second waits, then proceeds. Updating the same rows in a *different order* from two code paths is the classic deadlock.\n• **Table-level locks** come from DDL (`ALTER TABLE`, `CREATE INDEX` without `CONCURRENTLY`, adding constraints). One migration can block every query on the table, including reads, for as long as the DDL waits.\n• **Long transactions** are the amplifier: an idle transaction holding a row lock (\"in transaction\" while the app is doing something else) blocks everything behind it and can stop vacuum from cleaning up.\n\n• Debug: look at `pg_stat_activity` / `pg_locks` for waiters and blockers, and at `pg_stat_statements` for the query that started it. Set a `lock_timeout` so a blocked migration fails fast instead of queueing behind traffic.\n• Fixes: shorter transactions, one consistent update order, `SKIP LOCKED` for worker queues, and DDL that does not take an exclusive lock all at once.",
    "Databases correctness **locks** se rakhte hain, aur har lock ek queue hai jisme koi fasa sakta hai.\n\n• **Row locks** writes se aate hain (`UPDATE`/`DELETE`) aur `SELECT … FOR UPDATE` se. Do transactions ek hi row update karein: doosra wait karta hai, phir aage badhta hai. Do code paths *alag order* mein wahi rows update karein → classic deadlock.\n• **Table-level locks** DDL se aate hain (`ALTER TABLE`, `CONCURRENTLY` ke bina `CREATE INDEX`, constraint add karna). Ek migration us table ki har query block kar sakti hai, reads bhi, jab tak DDL wait karti hai.\n• **Lamba transaction** amplifier hai: idle transaction row lock pakde baithe ho (app kuch aur kar rahi ho) to peeche sab rukta hai aur vacuum bhi ruk jaata hai.\n\n• Debug: `pg_stat_activity` / `pg_locks` mein waiters aur blockers dekho, `pg_stat_statements` mein woh query jo shuru karti hai. `lock_timeout` lagao taaki blocked migration jaldi fail ho, traffic ke peeche queue na kare.\n• Fixes: chhote transactions, ek hi update order, worker queues ke liye `SKIP LOCKED`, aur aisi DDL jo ek saath exclusive lock na le.",
    ["db-transactions-isolation", "db-migrations", "sys-deadlock-race"],
  ),
  // ---------------------------------------------------------------- infra, continued
  L(
    "infra-dockerfile",
    "Dockerfiles and image size",
    "infra",
    ["how to write a dockerfile", "smaller docker image", "docker build cache", "multi stage build"],
    ["dockerfile", "image", "layer", "multi-stage", "buildkit", "cache", "alpine", "slim"],
    "A Dockerfile is a build script where **every instruction is a layer**, and layer order decides how often your cache is reused.\n\n• **Order from least to most volatile**: install dependencies (copy `package.json` + lockfile, run install) *before* copying your source. Then editing code reuses the dependency layer instead of reinstalling everything.\n• **Multi-stage**: build in a fat image with compilers, copy only the artifact into a slim runtime image. This is the single biggest size win (often 1 GB → 100 MB), and it also removes build tools from production.\n• **Pin base images** (`node:22.11-slim`, not `node:latest`) and rebuild on a schedule — a floating tag means your production image changes without a commit.\n• **Run as non-root**, and combine `RUN` commands so `apt-get update && install && rm -rf /var/lib/apt/lists/*` happens in one layer (deleting in a later layer does not shrink the image).\n\n• `.dockerignore` is not optional: a careless `node_modules` or `.git` copy both bloats the image and can leak secrets.\n• Never bake secrets into an image — they live in the layer history forever. Pass them at runtime.",
    "Dockerfile ek build script hai jisme **har instruction ek layer** hai, aur layer order decide karta hai cache kitna reuse hoga.\n\n• **Least se most volatile order**: pehle dependencies install karo (`package.json` + lockfile copy karke), *phir* source copy karo. Code badalne par dependency layer reuse hoti hai, dobara install nahi.\n• **Multi-stage**: bade image (compilers ke saath) mein build karo, sirf artifact slim runtime image mein copy karo — sabse bada size win (aksar 1 GB → 100 MB), aur production se build tools nikal jaate hain.\n• **Base image pin** karo (`node:22.11-slim`, `node:latest` nahi) aur schedule par rebuild — floating tag ka matlab production image bina commit badal sakti hai.\n• **Non-root** chalao, aur `RUN` commands jodo taaki `apt-get update && install && rm -rf /var/lib/apt/lists/*` ek layer mein ho (baad ki layer mein delete karne se image chhoti nahi hoti).\n\n• `.dockerignore` optional nahi: laparvahi se copy kiya `node_modules` ya `.git` image bhaari karta hai aur secrets leak kar sakta hai.\n• Image mein secrets kabhi bake mat karo — layer history mein hamesha rehte hain. Runtime par do.",
    ["infra-docker-k8s", "infra-artifact-registry", "security-supply-chain"],
  ),
  L(
    "infra-k8s-networking",
    "Kubernetes networking",
    "infra",
    ["kubernetes service types", "what is an ingress", "kubernetes dns", "cluster ip vs node port"],
    ["ingress", "service", "clusterip", "nodeport", "loadbalancer", "dns", "coredns", "networkpolicy", "cnI"],
    "The pieces in order, client to pod:\n\n• **Ingress** (plus an ingress controller — nginx, Traefik, or a Gateway API resource): HTTP routing from outside the cluster, TLS termination, host/path rules. This is what you configure 95% of the time.\n• **Service** — a stable virtual IP and DNS name in front of a changing set of pods. Types: `ClusterIP` (inside the cluster only, the default), `NodePort` (a port on every node, for debugging), `LoadBalancer` (asks the cloud for an external LB).\n• **CoreDNS** — pod DNS: `payments.default.svc.cluster.local`. In-cluster service discovery is just DNS, and a broken CoreDNS rollout looks like \"everything is slow\".\n• **NetworkPolicy** — firewall rules between pods. Default is allow-all, so policies matter if you are serious about blast radius.\n\n• A `Service` only sends traffic to pods that are **Ready** — a failing readiness probe silently removes a pod from rotation (good) and an empty endpoint list is \"why is this 503\" (the usual answer).\n• `kubectl get endpoints <service>` is the fastest check: no endpoints → the selector labels do not match the pods.",
    "Client se pod tak, is order mein:\n\n• **Ingress** (aur ingress controller — nginx, Traefik, ya Gateway API): bahar se HTTP routing, TLS termination, host/path rules. 95% waqt yahi configure karte ho.\n• **Service** — badalte pods ke aage stable virtual IP aur DNS naam. Types: `ClusterIP` (sirf cluster ke andar, default), `NodePort` (har node par port, debugging ke liye), `LoadBalancer` (cloud se external LB).\n• **CoreDNS** — pod DNS: `payments.default.svc.cluster.local`. In-cluster discovery bas DNS hai, aur toota CoreDNS \"sab slow hai\" jaisa dikhta hai.\n• **NetworkPolicy** — pods ke beech firewall. Default allow-all hai, to blast radius ke liye policies maayne rakhti hain.\n\n• `Service` sirf **Ready** pods ko traffic bhejta hai — toota readiness probe pod ko rotation se hata deta hai (achha) aur khaali endpoint list \"yeh 503 kyun\" ka aam jawab hai.\n• `kubectl get endpoints <service>` sabse fast check hai: endpoints khaali → selector labels pods se match nahi karte.",
    ["infra-k8s-objects", "web-load-balancer", "web-dns"],
  ),
  L(
    "infra-autoscaling",
    "Autoscaling",
    "infra",
    ["what is autoscaling", "kubernetes hpa", "why is autoscaling not working", "scale up vs scale out"],
    ["autoscaling", "hpa", "scale", "scaling", "replicas", "metrics", "cpu", "threshold", "cooldown"],
    "Autoscaling adds or removes capacity from a **signal**. Getting it right is mostly about choosing the signal and accepting that scaling is always a bit late.\n\n• **Scale out** (more replicas) is the default for stateless services; **scale up** (bigger machine) is for stateful work where the state cannot be split.\n• **Signal**: CPU is the easy default and a poor one for I/O-bound services — queue depth, request rate per replica, or concurrency usually track load better. Autoscaling on memory is a trap (memory does not fall when load does).\n• **Latency budget**: a new pod takes 20 s to boot and 40 s more to warm a cache; if your traffic spikes in 10 s, you need headroom (min replicas) and faster startup, not a lower threshold.\n\n• Classic failures: no `min` replicas (scale to zero at 3 a.m., then cold-start under the morning spike), scaling on the wrong metric, or a database that melts because the app scaled and its connection pool did not.\n• Always pair autoscaling with **load shedding** and a **connection pool ceiling** — otherwise you scale the outage, not the capacity.",
    "Autoscaling ek **signal** se capacity badhata/ghatata hai. Sahi karna zyadatar signal chunne ki baat hai, aur yeh maan lene ki ki scaling hamesha thodi late hoti hai.\n\n• **Scale out** (zyada replicas) stateless services ka default; **scale up** (badi machine) stateful kaam ke liye jahan state tod nahi sakte.\n• **Signal**: CPU aasan default hai par I/O-bound services ke liye ghatiya — queue depth, per-replica request rate ya concurrency load ko behtar track karte hain. Memory par autoscale karna trap hai (load girne par memory nahi girti).\n• **Latency budget**: naya pod boot hone mein 20 s aur cache warm karne mein 40 s lagta hai; traffic 10 s mein spike kare to headroom (min replicas) aur faster startup chahiye, threshold kam nahi.\n\n• Classic failures: `min` replicas nahi (raat 3 baje zero, subah spike par cold start), galat metric par scaling, ya database pighal jaana kyunki app scale hui par uska connection pool nahi.\n• Autoscaling ke saath **load shedding** aur **connection pool ceiling** rakho — warna outage scale karte ho, capacity nahi.",
    ["infra-k8s-objects", "web-backpressure", "db-connection-pool"],
  ),
  L(
    "infra-linux-troubleshooting",
    "Triage on a Linux box",
    "infra",
    ["how to debug a slow server", "linux troubleshooting commands", "server is slow what to check", "top vs htop", 'what is load average', 'linux load average'],
    ["linux", "troubleshooting", "dmesg", "iostat", "vmstat", "strace", "lsof", "top", "ss"],
    "The order that finds the problem fastest, from broad to narrow:\n\n1. **`uptime`** — load average above core count is real queueing (not necessarily CPU: load counts I/O waits too).\n2. **`top`/`htop`** — CPU per process, and RSS to see what is eating memory. Add `--sort=-%cpu` when scripting.\n3. **`free -h` and `vmstat 1`** — check `si/so` columns: swap-in/out means memory pressure is now latency.\n4. **`iostat -xz 1`** — `%util` near 100 and high `await` means the disk is the bottleneck, not your code.\n5. **`ss -s` / `ss -tnp`** — connection counts and states: thousands of `TIME_WAIT` after a deploy, or of `CLOSE_WAIT` because the app never closes sockets.\n6. **`dmesg -T | tail`** — the OOM killer, disk errors, or network resets leave a note here; the app logs will not mention them.\n7. **`lsof -p <pid>`** and **`strace -f -p <pid>`** (briefly!) — which files/sockets the process is stuck on.\n\n• \"Slow\" is ambiguous: check whether it is latency or throughput, and whether the trouble is CPU, memory, disk I/O, network or a lock. One measurement each in this order eliminates four of five suspects.\n• Do not leave `strace`/`tcpdump` running on production — the observation becomes the problem.",
    "Order jisme sabse jaldi problem milti hai, broad se narrow:\n\n1. **`uptime`** — load average core count se upar asli queueing hai (CPU nahi bhi ho sakta: load I/O wait bhi ginta hai).\n2. **`top`/`htop`** — per-process CPU, aur RSS se pata chalta hai memory kaun kha raha hai.\n3. **`free -h` aur `vmstat 1`** — `si/so` dekho: swap-in/out matlab memory pressure ab latency hai.\n4. **`iostat -xz 1`** — `%util` 100 ke paas aur high `await` matlab disk bottleneck hai, aapka code nahi.\n5. **`ss -s` / `ss -tnp`** — connections aur states: deploy ke baad hazaaron `TIME_WAIT`, ya `CLOSE_WAIT` kyunki app socket band nahi karti.\n6. **`dmesg -T | tail`** — OOM killer, disk errors, network resets yahan note chhodte hain; app logs mein nahi milega.\n7. **`lsof -p <pid>`** aur **`strace -f -p <pid>`** (thodi der!) — process kis file/socket par atka hai.\n\n• \"Slow\" ambiguous hai: latency ya throughput? aur dikkat CPU, memory, disk I/O, network ya lock? Is order mein ek-ek measurement paanch mein se chaar suspects hata deta hai.\n• Production par `strace`/`tcpdump` chalta mat chhodo — observation khud problem ban jaata hai.",
    ["sys-gc-memory", "infra-k8s-objects", "perf-latency"],
  ),
  L(
    "infra-ssh-keys",
    "SSH, keys and bastions",
    "infra",
    ["how does ssh work", "ssh key vs password", "what is a bastion host", "permission denied publickey"],
    ["ssh", "key", "keys", "bastion", "jump", "authorized_keys", "ed25519", "port forward"],
    "**SSH** proves your identity with a key pair: the server keeps the public key (`~/.ssh/authorized_keys`), your machine keeps the private one, and the private key never travels.\n\n• **Keys beat passwords** because there is nothing to phish or reuse; `ed25519` is the modern default. Protect the private key with a passphrase and an agent, and it is still convenient.\n• **Permissions matter**: `~/.ssh` must be `700`, the private key `600`, and `authorized_keys` `600` — a world-readable key is refused, which is the cause of most \"permission denied\" surprises.\n• **Bastion / jump host**: one hardened host that is the only way into a private network (`ssh -J bastion host`). Combined with key-only auth, MFA and short-lived certificates, it removes the need for every engineer to hold keys to everything.\n• **Debug with verbosity**: `ssh -vvv user@host` tells you exactly which key was offered and why it was rejected.\n\n• Do not share one key between people — you lose the audit trail and every rotation becomes a fire drill. One key per person, plus a break-glass key in a vault for the day the identity provider is down.",
    "**SSH** identity ek key pair se prove karta hai: server public key rakhta hai (`~/.ssh/authorized_keys`), aapki machine private key, aur private key kabhi travel nahi karti.\n\n• **Keys password se behtar** hain kyunki phish ya reuse karne ko kuch nahi; `ed25519` modern default hai. Private key par passphrase aur agent lagao — convenience bani rehti hai.\n• **Permissions maayne rakhte hain**: `~/.ssh` `700`, private key `600`, `authorized_keys` `600` — world-readable key refuse hoti hai, aur \"permission denied\" ki zyadatar wajah yahi hai.\n• **Bastion / jump host**: ek hardened host jo private network mein jaane ka ekmatra raasta hai (`ssh -J bastion host`). Key-only auth, MFA aur short-lived certificates ke saath isse har engineer ko sabki keys rakhne ki zaroorat nahi rehti.\n• **Verbose se debug**: `ssh -vvv user@host` batata hai kaunsi key offer hui aur kyun reject hui.\n\n• Ek key logon mein share mat karo — audit trail khatam aur har rotation fire drill ban jaati hai. Ek key per person, aur vault mein ek break-glass key us din ke liye jab identity provider down ho.",
    ["security-secrets", "infra-linux-troubleshooting", "security-rbac"],
  ),
  L(
    "infra-cron-schedulers",
    "Cron and scheduled jobs",
    "infra",
    ["what is cron", "cron syntax", "scheduled jobs best practice", "why did my cron run twice"],
    ["cron", "crontab", "schedule", "scheduler", "timer", "job", "quartz", "airflow"],
    "A scheduled job is a distributed-systems problem wearing a shell script costume.\n\n• **Cron syntax** is `minute hour day-of-month month day-of-week`; `*/5 * * * *` is every five minutes, `0 3 * * 1` is Mondays at 03:00. Remember: servers usually run in **UTC**, and day-of-month + day-of-week are OR'd, not AND'd.\n• **The duplicate-run problem**: more than one replica means the job runs N times (`n` crons on `n` pods). Either run it as a Kubernetes `CronJob` with a single replica, or take a **distributed lock** (Redis `SETNX` with a TTL, or a database advisory lock) before doing the work.\n• **Make every run idempotent**: assume it may be retried, overlapped or run manually. A job that appends the same rows twice is a data-quality incident on a timer.\n• **Observability**: log start/end, emit a metric, and alert on *absence* (\"daily digest did not run\") — silence is the failure mode nobody notices until a customer does.\n• For real workflows (many dependent steps, retries, backfills), use a scheduler meant for it (Airflow, Temporal, Step Functions) rather than a longer shell script.\n\n• Long jobs: set a timeout, and make them resumable — a 6-hour job that restarts from zero after a blip will not finish.",
    "Scheduled job ek distributed-systems problem hai shell script ke bhes mein.\n\n• **Cron syntax** `minute hour day-of-month month day-of-week`; `*/5 * * * *` har paanch minute, `0 3 * * 1` Monday 03:00. Yaad rakho: servers aksar **UTC** mein chalte hain, aur day-of-month + day-of-week OR hote hain, AND nahi.\n• **Duplicate run problem**: ek se zyada replica matlab job N baar chalega. Either single-replica `CronJob`, ya kaam se pehle **distributed lock** (Redis `SETNX` TTL ke saath, ya database advisory lock) lo.\n• **Har run idempotent** banao: maan lo retry ho sakta hai, overlap ho sakta hai, manually bhi chal sakta hai. Jo job wahi rows do baar daalta hai, wo timer par laga data-quality incident hai.\n• **Observability**: start/end log karo, metric bhejo, aur **absence** par alert karo (\"daily digest nahi chala\") — chuppi wahi failure hai jo customer se pehle koi notice nahi karta.\n• Asli workflows (bahut steps, retries, backfills) ke liye proper scheduler (Airflow, Temporal, Step Functions) use karo, lamba shell script nahi.\n\n• Lambe jobs: timeout lagao aur resumable banao — 6 ghante ka job blip ke baad zero se shuru ho to khatam nahi hoga.",
    ["infra-queues", "ops-observability", "db-locks"],
  ),
  L(
    "infra-artifact-registry",
    "Build artifacts and immutable images",
    "infra",
    ["what is an artifact registry", "docker image tags vs digests", "why not use latest tag", "immutable infrastructure"],
    ["artifact", "registry", "digest", "tag", "immutable", "promote", "sbom", "provenance"],
    "The rule that removes a whole class of incidents: **build once, promote the same artifact** from staging to production. Never rebuild for prod — a rebuild is a different binary, and \"it worked in staging\" stops being evidence.\n\n• **Tags are labels, digests are identity.** `myapp:1.4.2` can be repointed; `myapp@sha256:9f2c…` cannot. Deploy by digest (or by a tag you enforce as immutable) so what you tested is what runs.\n• **`latest` is not a version.** It is a moving pointer that means \"whatever was pushed most recently\" — and cache layers make it worse, because the image can differ between two machines pulling the same tag.\n• **Keep artifacts with their provenance**: the commit SHA, the CI job that built it, the SBOM, and the test results. That is what lets you answer \"are we affected?\" in minutes when a dependency CVE lands.\n• **Retention**: keep every production artifact for as long as you might need to roll back or investigate, and prune the rest. Registries are cheap storage with expensive surprises when you cannot redeploy last month's known-good image.",
    "Ek rule jo incidents ki poori class hata deta hai: **ek baar build karo, wahi artifact promote karo** staging se production tak. Prod ke liye rebuild kabhi mat karo — rebuild doosra binary hai, aur \"staging mein chala tha\" evidence nahi rehta.\n\n• **Tags label hain, digests identity.** `myapp:1.4.2` repoint ho sakta hai; `myapp@sha256:9f2c…` nahi. Digest se (ya immutable enforce kiye tag se) deploy karo taaki jo test kiya wahi chale.\n• **`latest` version nahi hai.** Wo chalta hua pointer hai — aur cache layers ise aur kharab karte hain, same tag pull karne wali do machines alag image le sakti hain.\n• **Artifact ke saath uska provenance rakho**: commit SHA, build karne wali CI job, SBOM, test results. Isi se dependency CVE par \"kya hum affected hain?\" minutes mein answer hota hai.\n• **Retention**: har production artifact utni der rakho jitni der rollback ya investigation chahiye ho sakti hai, baaki prune. Registry sasti storage hai, par \"pichhle mahine ki known-good image redeploy nahi kar sakte\" mehnga surprise hai.",
    ["infra-cicd", "security-supply-chain", "ops-change-management"],
  ),
  // ---------------------------------------------------------------- cloud, continued
  L(
    "cloud-iam",
    "Cloud IAM and least privilege",
    "cloud",
    ["what is iam", "least privilege", "cloud roles vs keys", "why not use access keys"],
    ["iam", "role", "roles", "policy", "permission", "least", "privilege", "service", "account", "assume"],
    "Cloud permissions are the blast radius of every bug and every leaked credential, so they deserve the same review as code.\n\n• **Roles for machines, keys for emergencies.** A workload assumes a role and gets short-lived credentials that rotate automatically; a long-lived access key in an env var is a credential that will eventually be committed, logged or stolen.\n• **Least privilege, arrived at by subtraction**: start from a broad policy in development if you must, then remove what the workload provably does not use (cloud providers will show you unused permissions). \"Admin for now\" is how a compromise becomes a full-account takeover.\n• **Separate by account/project, not by tag alone**: production, staging and dev in different accounts makes accidental cross-writes a permission error instead of an incident.\n• **Audit what assumes what**: role trust policies and cross-account relationships are the paths attackers look for. Keep them few and documented.\n\n• In-code equivalent: never give the app's database user DDL rights it does not need — a SQL-injection bug then reads/writes its tables instead of dropping them.",
    "Cloud permissions har bug aur har leaked credential ka blast radius hote hain, isliye inhe code jaisa review karo.\n\n• **Machines ke liye roles, emergencies ke liye keys.** Workload role assume karta hai aur short-lived credentials automatically rotate hote hain; env var mein long-lived access key aisa credential hai jo ek din commit, log ya chori ho jaayega.\n• **Least privilege, ghata ke**: development mein chaaho to broad policy se shuru karo, phir jo workload sach mein use nahi karta wo hatao (cloud providers unused permissions dikhate hain). \"Admin for now\" se compromise poore account ka takeover ban jaata hai.\n• **Account/project se alag karo**, sirf tag se nahi: production, staging, dev alag accounts mein ho to galti se cross-write permission error hai, incident nahi.\n• **Kaun kise assume karta hai yeh audit karo**: role trust policies aur cross-account raaste attackers dhoondhte hain. Kam rakho aur document karo.\n\n• Code ke andar equivalent: app ke database user ko DDL rights mat do — SQL-injection bug phir tables padh/likh leta hai, drop nahi karta.",
    ["security-rbac", "security-secrets", "cloud-managed-vs-self"],
  ),
  L(
    "cloud-managed-vs-self",
    "Managed service or run it yourself",
    "cloud",
    ["managed vs self hosted", "build vs buy infrastructure", "should we run our own database", "managed kubernetes"],
    ["managed", "self", "hosted", "build", "buy", "saas", "rds", "aurora", "ops burden"],
    "The question is never \"which is better\" but **who is on call for it at 3 a.m.**\n\n• **Managed (RDS, ElastiCache, managed Kubernetes)** buys you patching, backups, failover, monitoring and a support contract. You pay more per unit and lose some control over versions and tuning. This is usually the right default for anything stateful.\n• **Self-hosted** makes sense when you need a version or extension the managed offering does not have, when the cost delta is large enough to fund a person, or when the data must not leave your own hardware.\n• **The real cost of self-hosting is not the server, it is the runbooks**: backups that are tested, upgrades that do not drop traffic, a failover you have actually performed, and someone who notices at 3 a.m.\n\n• Managed does not remove responsibility — it moves it. You still need capacity planning, query tuning, schema migrations, connection pool limits and a restore drill.\n• Write the decision down (an ADR) with the numbers: monthly cost, headcount, and what you would do if the provider had a bad day. That ADR is what stops the argument from restarting every quarter.",
    "Sawaal \"kaun behtar hai\" nahi, hamesha yeh hai: **raat 3 baje iske liye on-call kaun hai.**\n\n• **Managed (RDS, ElastiCache, managed Kubernetes)** patching, backups, failover, monitoring aur support contract deta hai. Per unit mehnga, versions aur tuning par control kam. Stateful cheezon ke liye aam taur par yahi sahi default hai.\n• **Self-hosted** tab sahi hai jab managed offering mein wo version/extension nahi hai, cost difference itna hai ki ek banda fund ho sake, ya data apne hardware se bahar nahi ja sakta.\n• **Self-hosting ki asli cost server nahi, runbooks hain**: tested backups, bina downtime upgrade, failover jo sach mein kiya ho, aur koi jo 3 baje notice kare.\n\n• Managed zimmedari hatata nahi — hilaata hai. Capacity planning, query tuning, migrations, connection pool limits aur restore drill phir bhi aapke.\n• Decision likho (ADR) numbers ke saath: monthly cost, headcount, aur provider ka bura din aaya to kya karenge. Yahi ADR har quarter bahas dobara shuru hone se rokta hai.",
    ["cloud-iaas-paas", "cloud-cost", "arch-decisions"],
  ),
  L(
    "cloud-multi-cloud",
    "Multi-cloud and on-prem",
    "cloud",
    ["what is multi cloud", "should we use multiple clouds", "cloud lock in", "hybrid cloud"],
    ["multi", "cloud", "lock", "vendor", "hybrid", "onprem", "on-prem", "portability", "migration"],
    "**Multi-cloud** usually means one of three very different things — be precise about which one you mean:\n\n• **Avoiding lock-in** (portable code and open standards): cheap to aim for at the edges (containers, Postgres, S3-compatible APIs) and expensive to chase everywhere. Some lock-in is a rational trade for a managed service that saves you a team.\n• **Best-of-breed** (one cloud for ML, another for the data warehouse): real, and it costs you cross-cloud egress, two identity systems and two sets of on-call.\n• **Resilience** (survive a provider outage): this is the honest one, and it is *hard* — you need duplicated data, tested failover and enough spare capacity in the second provider. Most teams that claim it have never run the drill.\n\n• **On-prem** is not legacy by definition: regulation, data residency, latency to machinery and unit economics at large steady scale can all make it correct. What it does not have is elasticity, so you must plan capacity for peaks.\n\n• Practical rule: keep the *data* portable (open formats, standard SQL, S3 API) and let the compute be cloud-specific. Migration pain is almost always data and identity, rarely containers.",
    "**Multi-cloud** ka matlab aksar teen alag cheezein hoti hain — saaf karo aap kaunsi keh rahe ho:\n\n• **Lock-in se bachna** (portable code, open standards): kinaron par sasta hai (containers, Postgres, S3-compatible API), har jagah chase karna mehnga. Thoda lock-in ek aisi managed service ke liye rational trade hai jo poori team bacha deti hai.\n• **Best-of-breed** (ML ek cloud par, warehouse doosre par): asli hai, par iske saath cross-cloud egress, do identity systems aur do on-call aate hain.\n• **Resilience** (provider outage jhelna): yeh imaandar wala hai aur *mushkil* — data duplicate, tested failover aur doosre provider mein spare capacity chahiye. Jo teams iska dawa karti hain unme se zyadatar ne drill kabhi chalaya nahi.\n\n• **On-prem** definition se legacy nahi hai: regulation, data residency, machinery se latency aur bade steady scale par unit economics ise sahi bana sakte hain. Jo nahi milta wo elasticity hai — peaks ke liye capacity plan karni padegi.\n\n• Practical rule: *data* portable rakho (open formats, standard SQL, S3 API) aur compute cloud-specific rehne do. Migration ka dard almost hamesha data aur identity hota hai, containers nahi.",
    ["cloud-managed-vs-self", "cloud-iaas-paas", "db-backups"],
  ),

  // ---------------------------------------------------------------- distributed systems
  L(
    "dist-consensus",
    "Consensus and quorums (Raft, Paxos)",
    "distributed",
    ["what is consensus", "how does raft work", "what is a quorum", "paxos vs raft"],
    ["consensus", "raft", "paxos", "quorum", "leader", "election", "majority", "etcd"],
    "**Consensus** is how a group of machines agrees on one ordering of events even when some of them are slow or dead. It is the foundation under etcd, ZooKeeper, Consul, Kafka's controller and every \"single leader\" database.\n\n• **Quorum**: decisions need a majority (`floor(n/2)+1`). Five nodes tolerate two failures; that is why clusters are odd-sized — a sixth node buys no extra fault tolerance and one more voter.\n• **Raft** splits the problem into leader election, log replication and safety rules. One node is leader, followers replicate its log in order, and a candidate with an up-to-date log wins elections. Paxos solves the same problem with a more mathematical formulation and no single leader; Raft won in practice because it is easier to reason about and implement.\n\n• The cost is **latency**: every write waits for a majority round-trip. Stretch that majority across continents and you have bought correctness with hundreds of milliseconds.\n• Consensus gives you a consistent log, not a fast one — do not put it on the hot path of every user request. Use it for configuration, leader election, locks and small metadata; keep bulk data in a replicated store with looser guarantees.\n\n• Rule of thumb: if you are hand-rolling consensus, you are wrong — use etcd/ZooKeeper or a database that already has it.",
    "**Consensus** matlab: machines ka group events ke ek hi order par agree kare, chahe kuch slow ya dead hon. Yeh etcd, ZooKeeper, Consul, Kafka controller aur har \"single leader\" database ke neeche hai.\n\n• **Quorum**: decision ke liye majority chahiye (`floor(n/2)+1`). Paanch node do failure jhelte hain; isliye clusters odd-size hote hain — chhata node extra fault tolerance nahi deta, ek aur voter ban jaata hai.\n• **Raft** problem ko leader election, log replication aur safety rules mein todta hai. Ek node leader, followers uska log order mein replicate karte hain, aur up-to-date log wala candidate election jeetta hai. Paxos wahi problem zyada mathematical tarike se solve karta hai, single leader ke bina; practice mein Raft jeeta kyunki samajhna aur implement karna aasan hai.\n\n• Keemat **latency** hai: har write majority round-trip ka wait karta hai. Majority ko continents mein failao to correctness ki keemat sau milliseconds mein chukate ho.\n• Consensus consistent log deta hai, tez nahi — ise har user request ke hot path par mat lagao. Configuration, leader election, locks aur chhote metadata ke liye use karo; bulk data loose guarantees wale replicated store mein.\n\n• Rule: consensus khud likh rahe ho to galat kar rahe ho — etcd/ZooKeeper ya aisa database use karo jisme pehle se hai.",
    ["dist-distributed-locks", "db-replication", "db-cap"],
  ),
  L(
    "dist-distributed-locks",
    "Distributed locks",
    "distributed",
    ["what is a distributed lock", "redlock", "lock across servers", "why is my lock not working"],
    ["distributed", "lock", "redlock", "lease", "fencing", "mutex", "holder"],
    "A distributed lock is a mutex whose owner can die mid-critical-section. That single fact decides the design.\n\n• **Every lock needs a lease** (TTL), because a crash must not hold it forever. The TTL then creates the classic bug: the operation runs longer than the lease, the lock expires, a second worker starts, and now two workers are writing — the lock *looked* fine. If you cannot bound the work, you cannot safely use a bare lock.\n• **Fencing tokens** are the honest fix: the lock service returns a monotonically increasing number, and the storage layer rejects writes with an older token. Without fencing, a delayed holder can still corrupt data.\n• **Redis `SET key value NX PX ttl`** is fine for \"avoid duplicate work\" (a cache refresh, a cleanup job) — best-effort is enough there. It is *not* enough for correctness-critical mutual exclusion, because a failover can lose the lock (Redlock's assumption that clocks and processes are trustworthy is exactly what fails during a partition).\n• Stronger ground: a **consensus-backed** lock (etcd/ZooKeeper) plus fencing, or a database row lock if the work is on the same database anyway.\n\n• Often the best answer is to delete the lock: make the work **idempotent** and let two workers race — the second one's write is a no-op.",
    "Distributed lock ek mutex hai jiska owner critical-section ke beech mar sakta hai. Yahi ek fact design tay karta hai.\n\n• **Har lock ko lease (TTL) chahiye**, warna crash par lock hamesha ke liye pakda rahega. TTL se classic bug aata hai: operation lease se lamba chala, lock expire, doosra worker shuru — ab do workers likh rahe hain, par lock *theek dikh raha tha*. Work ka upper bound na ho to bare lock safe nahi hai.\n• **Fencing tokens** imaandar fix hain: lock service badhta hua number deta hai, aur storage older token wali write reject karta hai. Fencing ke bina late holder data corrupt kar sakta hai.\n• **Redis `SET key value NX PX ttl`** \"duplicate kaam se bachna\" ke liye theek hai (cache refresh, cleanup job) — best-effort kaafi hai. Correctness-critical mutual exclusion ke liye nahi, kyunki failover me lock kho sakta hai (Redlock ki \"clocks aur processes trustworthy\" assumption partition mein hi tootti hai).\n• Strong base: **consensus-backed** lock (etcd/ZooKeeper) + fencing, ya database row lock agar kaam wahi database par hai.\n\n• Aksar best answer lock hata dena hai: kaam **idempotent** banao aur race karne do — doosre worker ki write no-op ho jaati hai.",
    ["dist-consensus", "ops-idempotency", "db-locks"],
  ),
  L(
    "dist-sagas",
    "Sagas and distributed transactions",
    "distributed",
    ["what is a saga pattern", "distributed transaction across services", "two phase commit", "compensating transaction"],
    ["saga", "compensation", "compensating", "2pc", "two-phase", "distributed", "transaction", "choreography"],
    "You cannot have one ACID transaction across three services and a message broker. Two options remain:\n\n• **Two-phase commit (2PC)**: a coordinator asks every participant to prepare, then everyone commits. It gives atomicity, but the coordinator is a single point of failure, participants hold locks while waiting, and a slow participant stalls everyone. Fine inside one database or a tightly-coupled cluster; painful across microservices.\n• **Saga**: a sequence of local transactions, each with a **compensating action** for the ones before it. Order paid → payment fails → release stock. Eventual consistency, no global lock, and much easier to run on unreliable networks.\n\n• The catch: compensations are **semantic, not automatic**. \"Refund the card\" is not \"undo the charge\" — you need the business to accept that, and some steps (sending an email) cannot be undone at all. Design the *order* so irreversible steps come last.\n• Sagas need **idempotent steps** and **durable state**: a step can be retried, so \"charge once\" has to be enforced by a key, and the saga's progress has to survive a crash (an outbox/saga store), not live in a process's memory.\n\n• Choose by blast radius: sagas for cross-service workflows, 2PC for a single database, and a plain transaction whenever both things are in the same database — the simplest distributed system is the one you did not build.",
    "Teen services aur ek message broker par ek ACID transaction nahi ho sakta. Do raaste bachte hain:\n\n• **Two-phase commit (2PC)**: coordinator sabse poochta hai prepare karo, phir sab commit. Atomicity deta hai, par coordinator single point of failure hai, participants wait karte waqt locks pakde rehte hain, aur slow participant sabko rok deta hai. Ek database ya tightly-coupled cluster mein chalega; microservices mein dard.\n• **Saga**: local transactions ka sequence, har ek ke liye pehle walon ka **compensating action**. Order paid → payment fail → stock release. Eventual consistency, koi global lock nahi, unreliable network par behtar.\n\n• Catch: compensation **semantic** hoti hai, automatic nahi. \"Card refund\" \"charge undo\" nahi hai — business ko yeh maanna padega, aur kuch steps (email bhejna) undo hi nahi hote. Yaad rakho: irreversible steps sabse aakhir mein rakho.\n• Saga ke steps **idempotent** chahiye aur **state durable**: step retry ho sakta hai, to \"ek hi baar charge\" key se enforce karo, aur saga ki progress crash jhelni chahiye (outbox/saga store), process ki memory mein nahi rehni chahiye.\n\n• Blast radius se chuno: cross-service workflows ke liye saga, ek database ke liye 2PC, aur jab dono cheezein ek hi database mein hon to plain transaction — sabse simple distributed system wahi hai jo aapne banaya hi nahi.",
    ["db-event-sourcing", "infra-queues", "ops-idempotency"],
  ),
  L(
    "dist-message-ordering",
    "Message ordering and delivery guarantees",
    "distributed",
    ["message ordering guarantee", "at least once vs exactly once", "why are messages out of order", "kafka partitions order", 'at least once delivery', 'exactly once delivery'],
    ["ordering", "order", "guarantee", "at-least-once", "at-most-once", "exactly-once", "dedupe", "partition"],
    "Three questions to answer for any queue or stream: how many times, in what order, and what happens on failure.\n\n• **Delivery**: *at-most-once* (may lose), *at-least-once* (may duplicate), *exactly-once* (a marketing term — real systems give at-least-once plus **idempotent consumers**, which is effectively once for data you control).\n• **Ordering is per-partition, not per-topic.** Kafka guarantees order inside a partition; a topic with 12 partitions has 12 independent orders. Events about the same entity must share a key (the aggregate id) so they hash to the same partition — otherwise \"created\" can be processed after \"deleted\".\n• **The pipeline has more than the broker**: producers retry, consumers commit offsets late, and `SELECT max(id)` readers can jump ahead. Ordering is a property of the whole path, and it breaks at the slowest hop.\n\n• Practical design: partition by entity key, keep consumer work idempotent (a unique key or version column), store an event id for dedupe, and make consumers able to handle a late event (out-of-order arrival is normal, not exceptional).\n• Do not use \"exactly once\" as a requirement without saying what happens to the *effect*: an email sent twice is not deduplicated by the broker.",
    "Kisi bhi queue/stream ke liye teen sawaal: kitni baar, kis order mein, aur failure par kya.\n\n• **Delivery**: *at-most-once* (kho sakta hai), *at-least-once* (duplicate ho sakta hai), *exactly-once* (marketing term — real systems at-least-once dete hain plus **idempotent consumers**, jo un data ke liye effectively once hai jise aap control karte ho).\n• **Ordering per-partition hai, per-topic nahi.** Kafka partition ke andar order guarantee karta hai; 12 partitions wale topic ke 12 independent orders hain. Ek hi entity ke events ki ek hi key (aggregate id) honi chahiye taaki same partition par hash hon — warna \"created\" \"deleted\" ke baad process ho sakta hai.\n• **Pipeline mein broker se zyada cheezein hain**: producers retry karte hain, consumers offsets late commit karte hain, aur `SELECT max(id)` readers aage nikal jaate hain. Ordering poore path ki property hai, aur sabse slow hop par tootti hai.\n\n• Practical design: entity key se partition karo, consumer work idempotent rakho (unique key ya version column), dedupe ke liye event id store karo, aur consumer late event handle kare (out-of-order aana normal hai, exception nahi).\n• \"Exactly once\" requirement bina yeh bole mat likho ki *effect* ka kya hoga: broker do baar bheja gaya email dedupe nahi karta.",
    ["infra-queues", "db-event-sourcing", "dist-sagas"],
  ),
  L(
    "dist-consistent-hashing",
    "Consistent hashing",
    "distributed",
    ["what is consistent hashing", "how does a cache cluster shard keys", "virtual nodes", "rebalancing keys"],
    ["consistent", "hashing", "hash", "ring", "virtual", "node", "rebalance", "shard", "key"],
    "Plain `hash(key) % N` has a brutal property: change N and nearly every key moves to a different node, so every cache misses and every shard rebalances at once.\n\n**Consistent hashing** puts nodes on a ring and assigns each key to the next node clockwise. Adding or removing a node moves only the keys that belonged to it — roughly `1/N` instead of almost all.\n\n• **Virtual nodes** are the fix for imbalance: each physical node appears at many positions on the ring, so keys spread evenly and a dead node's load is split across many survivors instead of piling onto its neighbour.\n• Where you see it: Redis Cluster's 16 384 slots (a fixed-slot variant), DynamoDB, Cassandra, CDN request routing, and client-side sharding libraries.\n\n• Caveats: it balances *keys*, not *load* — a hot key is hot on one node no matter how elegant the ring is. Some systems hash by key, others by key + replica so a shift is smoother.\n• Beware clients that cache the ring topology: after a membership change, old clients keep sending to the old owner until they refresh, which looks like intermittent errors for exactly one key range.",
    "Plain `hash(key) % N` mein ek brutal property hai: N badlo aur lagbhag har key doosre node par chali jaati hai — saara cache miss aur saara shard ek saath rebalance.\n\n**Consistent hashing** nodes ko ek ring par rakhta hai aur key ko clockwise next node deta hai. Node add/remove karne par sirf usi node ki keys move hoti hain — lagbhag `1/N`, almost sab nahi.\n\n• **Virtual nodes** imbalance ka fix hain: har physical node ring par kai jagah hota hai, isliye keys evenly spread hoti hain aur dead node ka load uske padosi par nahi, kai survivors mein bat jaata hai.\n• Kahan dikhta hai: Redis Cluster ke 16 384 slots (fixed-slot variant), DynamoDB, Cassandra, CDN routing, client-side sharding libraries.\n\n• Caveats: yeh *keys* balance karta hai, *load* nahi — hot key kisi bhi ring par ek hi node par hoti hai. Kuch systems key se hash karte hain, kuch key + replica se taaki shift smooth ho.\n• Aise clients se bacho jo ring topology cache karte hain: membership change ke baad purane clients purane owner ko bhejte rehte hain jab tak refresh na karein — exactly ek key range par intermittent errors jaisa dikhta hai.",
    ["web-load-balancer", "db-hot-partition", "web-caching"],
  ),
  L(
    "dist-crdt",
    "CRDTs and conflict-free replication",
    "distributed",
    ["what is a crdt", "how does google docs merge edits", "conflict free replicated data type", "offline sync without conflicts"],
    ["crdt", "conflict", "merge", "convergent", "g-counter", "or-set", "lamport", "offline", "collaborative"],
    "A **CRDT** (conflict-free replicated data type) is a data structure designed so that replicas that have seen the same set of updates *converge* to the same value — no coordinator, no last-write-wins coin flip, no conflict dialog.\n\n• **Convergent (state-based)**: replicas exchange state and merge with a commutative, associative, idempotent function (max, union, join). Order does not matter, so a delayed packet is harmless.\n• **Commutative (op-based)**: replicas exchange operations that must commute when delivered. Smaller messages, needs reliable causal delivery.\n\nExamples you already use:\n• **Counters** (G-Counter grows, PN-Counter grows and shrinks) — likes, view counts, quotas that must not go backwards.\n• **Sets** (OR-Set) — tags, memberships; adding and removing both work without a lost update.\n• **Text** (RGA/Yjs/Automerge) — collaborative editing a character at a time (this is what makes two people typing in one document not fight).\n• **Maps/registers** (LWW-Register) — last-write-wins per field, with time skew as the known weakness.\n\n• Where they shine: offline-first apps, multi-device sync, presence, collaborative editors, edge caches that accept writes.\n• Where they hurt: they cannot express \"this transfer must never overdraw the account\" — invariants need a coordinator. CRDTs make convergence easy and *correctness constraints* hard, so keep them for the data where convergence really is the requirement.\n• Metadata grows: tombstones and version vectors must eventually be garbage-collected, and that GC is the hard part in production.",
    "**CRDT** (conflict-free replicated data type) aisa data structure hai ki jo replicas same updates dekh chuke hon wo *converge* karte hain — koi coordinator nahi, last-write-wins ka sikka nahi, conflict dialog nahi.\n\n• **Convergent (state-based)**: replicas state exchange karte hain aur commutative, associative, idempotent function (max, union, join) se merge. Order maayne nahi rakhta, delayed packet harmless.\n• **Commutative (op-based)**: replicas operations exchange karte hain jo deliver hone par commute karein. Chhote messages, par reliable causal delivery chahiye.\n\nAap already jo use karte ho:\n• **Counters** (G-Counter badhta, PN-Counter ghatta-badhta) — likes, view counts, aise quotas jo peeche nahi jaane chahiye.\n• **Sets** (OR-Set) — tags, memberships; add aur remove dono bina update khoye kaam karte hain.\n• **Text** (RGA/Yjs/Automerge) — collaborative editing character-by-character (isi se do log ek document mein likhte hain to fight nahi hoti).\n• **Maps/registers** (LWW-Register) — per field last-write-wins, time skew iska known weakness hai.\n\n• Kahan shine karte hain: offline-first apps, multi-device sync, presence, collaborative editors, edge caches jo writes lete hain.\n• Kahan dard: \"is transfer se account overdraw na ho\" CRDT se express nahi hota — invariants ke liye coordinator chahiye. CRDT convergence aasan karte hain aur *correctness constraints* mushkil — inhe wahan rakho jahan convergence hi requirement hai.\n• Metadata badhta hai: tombstones aur version vectors garbage-collect karne padte hain, aur production mein GC hi hard part hai.",
    ["db-consistency-models", "web-realtime", "db-event-sourcing"],
  ),
  // ---------------------------------------------------------------- security, continued
  L(
    "security-zero-trust",
    "Zero trust",
    "security",
    ["what is zero trust", "never trust always verify", "zero trust architecture", "why is vpn not enough"],
    ["zero", "trust", "vpn", "perimeter", "verify", "microsegmentation", "device", "identity"],
    "Zero trust is a reaction to a fact: **the network perimeter is not a security boundary**. Laptops live in cafés, workloads run in three clouds, and one phished session inside the VPN is inside everything.\n\n\"Never trust, always verify\" means every request is authenticated and authorised on its own merits, regardless of where it comes from:\n• **Identity is the perimeter** — MFA, short-lived tokens, device posture. A request from the office network gets no bonus points.\n• **Least privilege per request**, not per employment contract: scopes granted just in time, expiring, and logged.\n• **Microsegmentation** — service-to-service calls authenticated (mTLS/service mesh), so compromising one pod does not hand over the network.\n• **Assume breach**: log everything, alert on anomalies, and make lateral movement loud (which is the point of segmentation and short-lived credentials).\n\n• What it is not: a product you buy, or a reason to abandon network controls. It is a direction — VPNs remain useful for reaching a private network, but they stop being the thing that grants trust.\n• The honest metric: how many systems can a single stolen session token reach, and how long does the token live? Drive those numbers down.",
    "Zero trust ek fact ka reaction hai: **network perimeter security boundary nahi hai**. Laptops café mein hote hain, workloads teen clouds mein chalte hain, aur VPN ke andar ek phished session ke andar sab kuch hai.\n\n\"Never trust, always verify\" matlab har request apne merit par authenticate/authorise ho, chahe kahan se aaye:\n• **Identity hi perimeter hai** — MFA, short-lived tokens, device posture. Office network se aayi request ko koi extra point nahi.\n• **Per-request least privilege**, per employment contract nahi: scopes just-in-time, expire hone wale, logged.\n• **Microsegmentation** — service-to-service calls authenticated (mTLS/service mesh), to ek pod compromise poora network nahi deta.\n• **Assume breach**: sab log karo, anomalies par alert, lateral movement ko loud banao (segmentation aur short-lived credentials ka yahi point hai).\n\n• Ye kya nahi hai: kharidne wala product, ya network controls chhodne ki wajah. Yeh ek direction hai — VPN private network tak pahunchne ke liye theek hai, par trust dene wali cheez nahi rahi.\n• Imaandar metric: ek chori hua session token kitne systems tak pahunch sakta hai, aur kitni der zinda rehta hai? In numbers ko neeche lao.",
    ["security-network", "security-authn-authz", "security-rbac"],
  ),
  L(
    "security-jwt-sessions",
    "JWT, sessions and cookies",
    "security",
    ["what is jwt", "jwt vs session", "where to store a jwt", "how to invalidate a jwt", "access token vs refresh token"],
    ["jwt", "session", "token", "access", "refresh", "stateless", "revoke", "cookie", "bearer"],
    "**Sessions** keep state on the server: the cookie holds an opaque id, and logout/invalidation is one row delete. **JWTs** keep state in the token: any service can verify it offline, but \"logout everywhere\" becomes genuinely hard.\n\nDecision guide:\n• Same app, one backend, normal web app → **server session** in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. It is the simplest thing that is correct, and revocation is free.\n• Many services/APIs, mobile clients, short lifetimes → **short-lived access token (5–15 min) + refresh token** that is stored server-side and *is* revocable.\n\n• **Where to store it** is the recurring mistake: `localStorage` is readable by any injected script, so an XSS becomes a permanent token theft. Prefer an `HttpOnly` cookie for browsers, and keep tokens out of URLs and logs.\n• **JWT caveats**: the payload is base64, not encrypted — never put secrets in it. Always verify `alg`/`iss`/`aud`/`exp` (\"alg: none\" and confused-deputy bugs are classics), and remember a stolen JWT is valid until it expires, which is exactly why lifetimes are short.\n• Needs immediate revocation (ban, password change, role change)? Keep a denylist of token ids (jti) or check a token version column — a few extra milliseconds buys real control.",
    "**Sessions** server par state rakhte hain: cookie mein opaque id, aur logout/invalidation ek row delete. **JWTs** state token ke andar rakhte hain: koi bhi service offline verify kar sakti hai, par \"sab jagah logout\" sach mein mushkil ho jaata hai.\n\nDecision guide:\n• Same app, ek backend, normal web app → **server session** `HttpOnly`, `Secure`, `SameSite=Lax` cookie mein. Jo sabse simple sahi cheez hai, aur revocation free.\n• Kai services/APIs, mobile clients, chhoti lifetime → **short-lived access token (5–15 min) + refresh token** jo server-side store ho aur *revocable* ho.\n\n• **Kahan store karna** wahi galti baar-baar hoti hai: `localStorage` kisi bhi injected script se readable hai, to XSS permanent token theft ban jaata hai. Browser ke liye `HttpOnly` cookie prefer karo, aur tokens URL ya logs mein mat rakho.\n• **JWT caveats**: payload base64 hai, encrypted nahi — usme secrets kabhi mat daalo. `alg`/`iss`/`aud`/`exp` hamesha verify karo (\"alg: none\" aur confused-deputy bugs classic hain), aur yaad rakho chori hua JWT expire hone tak valid hai — isliye lifetime chhoti rakho.\n• Turant revocation chahiye (ban, password change, role change)? Token ids (jti) ki denylist rakho ya token version column check karo — thodi extra latency asli control deti hai.",
    ["security-oauth-oidc", "web-cookies-storage", "security-authn-authz"],
  ),
  L(
    "security-injection",
    "Injection attacks (XSS, CSRF, SQLi)",
    "security",
    ["what is xss", "what is csrf", "how to prevent sql injection", "stored vs reflected xss"],
    ["xss", "csrf", "sqli", "injection", "sanitize", "escape", "parameterized", "prepared", "samesite"],
    "All three are the same mistake in three places: **trusting input as code**.\n\n• **SQL injection** — input becomes SQL. Fix by using **parameterised queries/prepared statements** everywhere (`db.query('… WHERE id = $1', [id])`), never string concatenation. ORMs do this for you *unless* you drop to raw SQL with interpolation. An allow-list is required for things that cannot be parameters (table names, sort direction).\n• **XSS** — input becomes HTML/JS in someone else's browser. Fix by context-aware output encoding (React/Vue escape by default — `dangerouslySetInnerHTML` is the door you must consciously open), sanitising rich text with a maintained library, and a strict **CSP** as a second layer. *Stored* XSS (persisted in a comment/incident note) is far worse than *reflected*.\n• **CSRF** — the browser attaches the victim's cookie to a request the attacker's page initiated. Fix with `SameSite=Lax/Strict` cookies (mostly closes it), plus a token or double-submit check for state-changing endpoints, and never GET for side effects.\n\n• The unifying habit: validate on input, **encode on output**, parameterise on query, and treat every string from a client, a webhook or an LLM as hostile until proven otherwise.\n• Framework protections are not a strategy: React does not protect your SQL, and parameterised queries do not protect your HTML.",
    "Teeno ek hi galti hain, teen jagah: **input ko code maan lena**.\n\n• **SQL injection** — input SQL ban jaata hai. Fix: har jagah **parameterised queries/prepared statements** (`db.query('… WHERE id = $1', [id])`), string concatenation kabhi nahi. ORM yeh khud karti hai *jab tak* aap interpolation ke saath raw SQL na likho. Jo parameter nahi ban sakta (table names, sort direction) uske liye allow-list chahiye.\n• **XSS** — input kisi aur ke browser mein HTML/JS ban jaata hai. Fix: context-aware output encoding (React/Vue default escape karte hain — `dangerouslySetInnerHTML` wo darwaza hai jo jaan-boojh kar kholte ho), rich text ko maintained library se sanitise karo, aur second layer ke liye strict **CSP**. *Stored* XSS (comment/incident note mein save) *reflected* se kaafi kharab hai.\n• **CSRF** — browser victim ka cookie us request ke saath bhej deta hai jo attacker ke page ne shuru ki. Fix: `SameSite=Lax/Strict` cookie (zyadatar band), state-changing endpoints par token/double-submit check, aur side effects ke liye kabhi GET nahi.\n\n• Unifying habit: input par validate, **output par encode**, query par parameterise, aur client, webhook ya LLM se aayi har string ko hostile maano jab tak prove na ho.\n• Framework protection strategy nahi hai: React aapke SQL ko nahi bachata, aur parameterised queries aapke HTML ko nahi.",
    ["security-owasp", "web-cors", "security-secrets"],
  ),
  L(
    "security-password-hashing",
    "Storing passwords",
    "security",
    ["how to store passwords", "bcrypt vs argon2", "why not sha256 for passwords", "salting passwords", 'how does bcrypt work', 'what is bcrypt'],
    ["password", "hash", "bcrypt", "argon2", "scrypt", "salt", "pepper", "sha256", "credential"],
    "Passwords must be **hashed with a deliberately slow, salted function** — never encrypted (reversible) and never with a fast general-purpose hash.\n\n• **Why not SHA-256/MD5**: they are designed to be fast. A GPU computes billions per second, so a leaked table of SHA-256 hashes is cracked in hours. `bcrypt`, `scrypt` and `Argon2id` are designed to be slow and memory-hungry; Argon2id is the current recommendation, bcrypt (cost ≥ 12) is still perfectly fine.\n• **Salting** (automatic in all three) makes identical passwords hash differently, so one rainbow table cannot hit every user, and identical hashes do not reveal shared passwords.\n• **Pepper** (a secret key mixed in, stored outside the database) helps if the database leaks but the app secret does not — worth it, not a substitute for the rest.\n\n• Tuning: pick parameters so one hash takes ~100–500 ms on your hardware. That is invisible at login and ruinous for an attacker with a stolen dump. Record the parameters with the hash so you can re-hash on next login when you raise them.\n• Related hygiene: enforce length over complexity (passphrases beat `P@ss1`), check against breach lists, rate-limit and lock out slowly, support MFA, and give users a session invalidation path after a password change.\n• Never log passwords or password-reset tokens; never email a password; use a single-use, expiring reset link.",
    "Passwords ko **deliberately slow, salted function** se hash karo — encrypt (reversible) kabhi nahi, aur fast general-purpose hash se bhi nahi.\n\n• **SHA-256/MD5 kyun nahi**: wo fast hone ke liye bane hain. GPU billions per second nikaalta hai, to leaked SHA-256 table ghanton mein crack ho jaati hai. `bcrypt`, `scrypt`, `Argon2id` slow aur memory-hungry bane hain; Argon2id current recommendation, bcrypt (cost ≥ 12) abhi bhi theek.\n• **Salting** (teeno mein automatic) same passwords ko alag hash karta hai, to ek rainbow table sab users par nahi chalti, aur same hashes se shared passwords ka pata nahi chalta.\n• **Pepper** (secret key jo database se bahar rehti hai) database leak hone par madad karta hai jab app secret na leak ho — worth it, par baaki ka substitute nahi.\n\n• Tuning: parameters aise chuno ki ek hash ~100–500 ms le. Login par invisible, chori hui dump ke liye tabahi. Parameters hash ke saath record karo taaki badhane par next login par re-hash kar sako.\n• Related hygiene: complexity ki jagah length par zor (passphrase `P@ss1` se behtar), breach lists check, rate-limit aur slow lockout, MFA support, aur password change ke baad session invalidation.\n• Passwords ya reset tokens kabhi log mat karo; password email mat karo; single-use expiring reset link do.",
    ["security-encryption", "security-mfa", "db-backups"],
  ),
  L(
    "security-rbac",
    "RBAC, ABAC and permissions",
    "security",
    ["what is rbac", "rbac vs abac", "how to design permissions", "role based access control"],
    ["rbac", "abac", "role", "permission", "policy", "scope", "subject", "authorization"],
    "**RBAC** assigns permissions to roles and roles to users: `viewer` can read incidents, `responder` can update them, `admin` can manage the org. It is the default because it is explainable to auditors and users (\"why can I do this?\" → \"because you are a responder\").\n\n• **The classic failures**: role explosion (hundreds of bespoke roles), roles that only make sense for one team, and \"admin\" granted as the path of least resistance — which quietly makes your security model one role deep.\n• **ABAC / policy** evaluates attributes: \"can edit incident *if* same-tenant *and* on-call *and* not frozen\". More expressive, harder to reason about; reach for it only for rules RBAC genuinely cannot express (multi-tenant ownership, time windows, data classification).\n• **Always authorise on the server, per resource**, not per page: the UI hiding a button is UX, not security. Check ownership in the same query that fetches the row (`WHERE id = $1 AND org_id = $2`) so an object reference from another tenant simply returns nothing.\n\n• Design rules that keep it sane: permissions are verbs on resources (`incident:update`), roles are bundles of those, checks live in one layer, and every action is logged with subject, resource and decision.\n• Test it: a matrix of (role × endpoint × own/other tenant) is the cheapest regression suite a security review will ever ask for.",
    "**RBAC** permissions roles ko deta hai aur roles users ko: `viewer` incidents padh sakta hai, `responder` update kar sakta hai, `admin` org manage karta hai. Yeh default hai kyunki auditors aur users ko samajh aata hai (\"mujhe yeh kyun karne diya?\" → \"kyunki tum responder ho\").\n\n• **Classic failures**: role explosion (hazaaron custom roles), aise roles jo sirf ek team ke liye theek hain, aur \"admin\" de dena sabse aasan raasta — jo chup-chaap security model ko ek role gehra bana deta hai.\n• **ABAC / policy** attributes evaluate karta hai: \"incident edit kar sakta hai *agar* same-tenant *aur* on-call *aur* frozen nahi\". Zyada expressive, samajhna mushkil; sirf un rules ke liye jao jo RBAC sach mein express nahi kar sakta (multi-tenant ownership, time windows, data classification).\n• **Hamesha server par, per resource authorise karo**, per page nahi: UI par button chhupana UX hai, security nahi. Ownership usi query mein check karo jo row laati hai (`WHERE id = $1 AND org_id = $2`) taaki doosre tenant ka id khaali result de.\n\n• Sane design: permissions verbs on resources (`incident:update`), roles unke bundles, check ek hi layer mein, aur har action subject, resource, decision ke saath log.\n• Test karo: (role × endpoint × own/other tenant) ka matrix sabse sasta security regression suite hai jo review mein maanga jaata hai.",
    ["security-authn-authz", "security-zero-trust", "eng-design-doc"],
  ),
  L(
    "security-audit-logging",
    "Audit logging",
    "security",
    ["what is an audit log", "audit log vs application log", "what to log for compliance", "tamper proof logs"],
    ["audit", "logging", "trail", "compliance", "tamper", "who", "forensic", "immutable", "retention"],
    "An **audit log** answers \"who did what, when, to which object, and did it succeed\" — an application log answers \"what is the program doing\". They have different readers, retention and requirements.\n\n• **What to record**: actor (user/service + tenant), action (`incident.update`), target (type + id), timestamp, result, and the *change* (old → new) or at least references to it. Add request id, source IP/device and the auth method — the forensic questions always end up being these.\n• **Never log secrets or personal data you do not need** (tokens, full payloads, passwords): the audit log is copied to a SIEM, alerted on and kept for years, so it multiplies every leak.\n• **Tamper resistance**: append-only storage, a separate account the application cannot delete from, object-lock/versioning, and ideally a hash chain so a removed entry is detectable. If an attacker with app credentials can edit the trail, you have no trail.\n• **Retention and access**: define the period by regulation *and* by investigation needs (usually 1–7 years), restrict reading it, and alert on the log pipeline stopping — a silent audit pipeline is worse than an obvious one.\n\n• Access to the audit log is itself audited; otherwise the first insider move is to read who is watching.\n• For workspace apps, the audit trail is also the product: customers ask \"who resolved this and when\" — the same table serves support, compliance and postmortems.",
    "**Audit log** batata hai \"kisne kya kiya, kab, kis object par, aur safal hua\" — application log batata hai \"program kya kar raha hai\". Dono ke readers, retention aur requirements alag hain.\n\n• **Kya record karo**: actor (user/service + tenant), action (`incident.update`), target (type + id), timestamp, result, aur *change* (old → new) ya uske references. Request id, source IP/device aur auth method bhi — forensic sawaal aakhir mein yahi hote hain.\n• **Secrets ya bekaar personal data kabhi log mat karo** (tokens, poore payloads, passwords): audit log SIEM mein copy hota hai, alert banta hai aur saalon rehta hai, to har leak multiply ho jaata hai.\n• **Tamper resistance**: append-only storage, alag account jahan se application delete na kar sake, object-lock/versioning, aur ideally hash chain taaki hatayi gayi entry detect ho. App credentials wala attacker trail edit kar sake — to trail hai hi nahi.\n• **Retention aur access**: period regulation *aur* investigation se tay karo (aksar 1–7 saal), padhna restrict karo, aur log pipeline rukne par alert karo — chup audit pipeline obvious se kharab hai.\n\n• Audit log ka access bhi audited ho; warna insider ka pehla move yahi hota hai ki kaun dekh raha hai.\n• Workspace apps ke liye audit trail product bhi hai: customers poochte hain \"kisne kab resolve kiya\" — wahi table support, compliance aur postmortem teeno ko serve karti hai.",
    ["ops-observability", "security-rbac", "ops-change-management"],
  ),
  L(
    "security-threat-modeling",
    "Threat modelling",
    "security",
    ["what is threat modeling", "stride methodology", "how to do a security review", "attack surface"],
    ["threat", "modeling", "modelling", "stride", "attack", "surface", "trust", "boundary", "mitigate"],
    "Threat modelling is a **design-time** conversation, not a scanner: you draw the system, mark where trust changes, and ask what could go wrong — before shipping.\n\nA workable hour-long version:\n1. **Diagram** the data flow: users, services, data stores, and the trust boundaries between them (internet → app, app → database, tenant A → tenant B).\n2. **Ask the STRIDE questions** at each boundary: *Spoofing* (can I pretend to be someone?), *Tampering* (modify data in transit/at rest?), *Repudiation* (can someone deny an action? is it logged?), *Information disclosure* (can tenant A read B's data? is a URL guessable?), *Denial of service* (what is the cheapest way to exhaust this?), *Elevation of privilege* (can this input become code / this user become admin?).\n3. **Rank and decide**: for each real threat, mitigate, accept with a reason, transfer (insurance/vendor) or eliminate the feature. Write it down with an owner — an unowned mitigation is a wish.\n\n• The productive targets are usually unglamorous: IDOR and missing tenant scoping, unauthenticated webhooks, permissive CORS, secrets in logs, an admin endpoint on the public internet, business-logic abuse (free-tier farming) — not exotic zero-days.\n• Repeat it cheaply: a 20-minute model per new feature beats one annual workshop. Attach it to the design doc, review changes to the trust boundaries first, and let the model feed the test plan (each threat becomes one test or one alert).",
    "Threat modelling ek **design-time** baat-cheet hai, scanner nahi: system ka diagram banao, jahan trust badalta hai wahan mark karo, aur poochho kya bura ho sakta hai — ship karne se pehle.\n\nEk ghante ka practical version:\n1. **Data flow diagram**: users, services, data stores, aur beech ke trust boundaries (internet → app, app → database, tenant A → tenant B).\n2. Har boundary par **STRIDE sawaal**: *Spoofing* (kisi aur ka bhes?)?, *Tampering* (transit/at-rest data badal sakta hai?), *Repudiation* (action deny ho sakti hai? logged hai?), *Information disclosure* (tenant A, B ka data padh sakta hai? URL guessable?), *Denial of service* (sabse sasta exhaust tarika?), *Elevation of privilege* (input code ban sakta hai / user admin?).\n3. **Rank aur decide**: har asli threat par mitigate, accept (reason ke saath), transfer (insurance/vendor) ya feature hatao. Owner ke saath likho — unowned mitigation ek wish hai.\n\n• Productive targets aksar unglamorous hote hain: IDOR aur missing tenant scoping, unauthenticated webhooks, permissive CORS, logs mein secrets, public internet par admin endpoint, business-logic abuse (free-tier farming) — exotic zero-days nahi.\n• Sasta repeat karo: har naye feature par 20-minute model annual workshop se behtar hai. Design doc ke saath attach karo, trust boundary changes pehle review karo, aur model se test plan nikalo (har threat → ek test ya ek alert).",
    ["security-owasp", "security-zero-trust", "arch-decisions"],
  ),
  // ---------------------------------------------------------------- engineering, continued
  L(
    "eng-tdd",
    "TDD and where it pays",
    "engineering",
    ["what is test driven development", "red green refactor", "tdd vs writing tests after", "is tdd worth it"],
    ["tdd", "red", "green", "refactor", "driven", "first", "cycle", "test"],
    "**TDD** is a design technique that happens to produce tests: write a failing test (red), make it pass the ugliest way that works (green), then clean up with the test as a safety net (refactor).\n\n• What it actually buys: you feel the API from the caller's side before it exists (which is why TDD improves interfaces), you never write untested code by accident, and the suite grows alongside the behaviour instead of being bolted on later.\n• What it costs: a constant small overhead, and it is a poor fit for exploratory work where you do not yet know the shape of the answer — spike first, then TDD the stable part.\n\n• Use it where the logic is knotty and the inputs are known: money and pricing, date/time rules, parsers, state machines, permission checks, retry/backoff, incident state transitions. Skip the ceremony for glue code and pure UI layout.\n• TDD does not replace the other kinds of testing: it says nothing about whether the migration works on real data, whether the page loads in 2 s, or whether the SQL is right. It replaces only the \"did I call the right function\" layer.\n\n• Anti-pattern to watch: tests that assert on internals (mocks of mocks). They go red on every refactor and give you the worst of both worlds — brittle tests and untested behaviour.",
    "**TDD** ek design technique hai jo saath mein tests bana deti hai: pehle failing test likho (red), phir jo bhi gandagi se pass karwao (green), phir test ko safety net maan kar clean karo (refactor).\n\n• Kya deta hai: code exist karne se pehle API caller ki taraf se feel karte ho (isliye TDD interfaces behtar karti hai), bina test ka code galti se nahi likha jaata, aur suite behaviour ke saath badhti hai, baad mein thopi nahi jaati.\n• Keemat: chhota constant overhead, aur exploratory kaam ke liye fit nahi jahan answer ka shape pata nahi — pehle spike karo, phir stable part par TDD.\n\n• Jahan logic knotty hai aur inputs confirmed hain wahan use karo: money aur pricing, date/time rules, parsers, state machines, permission checks, retry/backoff, incident state transitions. Glue code aur pure UI layout par ceremony chhodo.\n• TDD baaki testing ki jagah nahi leti: migration asli data par chalega ya nahi, page 2 s mein load hoga ya nahi, SQL sahi hai ya nahi — in par TDD kuch nahi kehti. Sirf \"sahi function call hua\" layer replace karti hai.\n\n• Anti-pattern: internals par assert karne wale tests (mocks ke mocks). Har refactor par red hote hain aur dono cheezon ka worst dete hain — brittle tests aur untested behaviour.",
    ["testing-pyramid", "eng-code-review", "testing-load"],
  ),

  L(
    "eng-debugging",
    "Debugging a hard bug",
    "engineering",
    ["how to debug a bug", "production debugging", "debugger vs print statements", "intermittent bug", 'how to debug a production bug', 'debugging production issues'],
    ["debug", "debugging", "debugger", "breakpoint", "reproduce", "bisect", "hypothesis", "intermittent", "bisect"],
    "Debugging is **the scientific method with a deadline**: observe, hypothesise, test the cheapest hypothesis, repeat.\n\n• **Reproduce first.** A bug you can trigger on demand is 80% solved — the remaining work is mechanical. If you cannot reproduce, gather the exact inputs (request id, user, timestamp, build version) and make the repro a test. Intermittent bugs get *worse* with guessing: suspect time, order, concurrency, uninitialised state, external calls and caching.\n• **Narrow the search space** rather than reading code hopefully: binary-search the commit history (`git bisect`, usually a dozen steps for hundreds of commits), bisect the input (halve the payload until it stops failing), or bisect the system (does it fail in staging with prod data? with one tenant? one region?).\n• **Make the invisible visible**: a debugger with breakpoints and watch expressions when you can run it locally; structured logs with a request/trace id when you cannot; a profiler or `EXPLAIN` when it is slowness; a failing assertion when it is data. Printing a variable is not a technique — *deciding which variable will discriminate between your hypotheses* is.\n\n• **Change one thing at a time** and write down what you expected. Shotgun debugging (three fixes at once) teaches you nothing and leaves you unsure which change worked — and which bug is still hiding.\n• **When stuck, explain it to someone** (or to a rubber duck) out loud; the act of narrating forces the assumption you never checked to surface. Then check that assumption first.\n\n• After the fix: add the regression test, ask why the bug was *possible* (missing test, unclear API, silent failure), and fix that too. The bug is the symptom; the design that allowed it is the cause.",
    "Debugging **deadline ke saath scientific method** hai: observe karo, hypothesis banao, sabse sasta hypothesis test karo, repeat.\n\n• **Pehle reproduce karo.** Jo bug demand par trigger ho jaaye wo 80% solve hai — baaki kaam mechanical hai. Reproduce na ho to exact inputs jama karo (request id, user, timestamp, build version) aur repro ko test bana do. Intermittent bugs andaze se *kharab* hote hain: time, order, concurrency, uninitialised state, external calls aur caching par shak karo.\n• **Search space chhota karo**, code ummeed se mat padho: commit history par binary search (`git bisect`, sau commits ke liye aksar dozen steps), input par bisect (payload aadha karte jao jab tak fail hona band na ho), ya system par bisect (staging mein prod data ke saath fail hota hai? ek tenant? ek region?).\n• **Jo dikhta nahi use dikhao**: locally chala sakte ho to breakpoints aur watch wala debugger; nahi chala sakte to structured logs with request/trace id; slowness ho to profiler ya `EXPLAIN`; data ho to failing assertion. Variable print karna technique nahi — *kaunsa variable aapke hypotheses mein fark karega* yeh decide karna technique hai.\n\n• **Ek baar mein ek cheez badlo** aur likho kya expect kiya tha. Shotgun debugging (teen fix ek saath) kuch nahi sikhata, aur yeh bhi nahi pata chalta ki kaunsa change kaam kiya — aur kaunsa bug ab bhi chhupa hai.\n• **Atak jao to kisi ko samjhao** (ya rubber duck ko) bol kar; bolne se wahi assumption surface hoti hai jo aapne kabhi check hi nahi ki. Us assumption ko pehle check karo.\n\n• Fix ke baad: regression test add karo, poocho bug *possible* kyun tha (missing test, unclear API, silent failure) aur wo bhi fix karo. Bug symptom hai; jo design ise allow karta hai wo cause hai.",
    ["ops-runbook", "infra-linux-troubleshooting", "perf-profiling"],
  ),
  L(
    "eng-documentation",
    "Documentation that stays useful",
    "engineering",
    ["how to write good documentation", "what is docs as code", "readme best practices", "why does documentation go stale"],
    ["documentation", "docs", "readme", "adr", "comment", "runbook", "changelog", "stale", "diagram"],
    "Documentation fails in a predictable way: it is written once for a launch, never for the person who arrives in six months, and nothing tells you it is now wrong.\n\n• **Write for the reader's moment**: *learning* (tutorial — works in 10 minutes), *doing* (how-to — solves one task), *looking up* (reference — accurate, complete), *understanding* (explanation — why it is built this way). One page trying to be all four is the page nobody reads.\n• **The four documents that pay**: a `README` that says what this is, how to run it and where the code lives; **ADRs** for decisions (context, options, decision, consequences) so future-you knows why the obvious alternative was rejected; **runbooks** for anything that pages (see the runbook entry); a `CHANGELOG` for what changed and when.\n• **Docs as code**: keep them in the repo, review them with the change, link them from the code, and build/deploy them like anything else. Documentation on a wiki nobody owns drifts within weeks — the usual fix is making the PR that changes behaviour update the doc *in the same change*.\n\n• **Comments explain why, not what.** `// increment i` is noise; `// retry once: the upstream cache is stale for ~2s after a write` is the kind of thing code cannot say. If a comment is needed because the code is unreadable, fix the code.\n• **Freshness beats volume**: a short, correct page with an owner and a last-reviewed date beats a beautiful wiki with 400 stale pages. Delete documentation that is wrong — wrong docs are worse than none, because people still trust them.\n• Practical test: a new engineer follows your README on a fresh machine and ships a change without asking anyone. Every question they have to ask is a documentation task.",
    "Documentation predictable tarike se fail hota hai: launch ke liye ek baar likha jaata hai, chhe mahine baad aane wale insaan ke liye nahi, aur yeh batane wala koi nahi ki ab wo galat hai.\n\n• **Reader ke moment ke liye likho**: *seekhna* (tutorial — 10 minute mein chale), *karna* (how-to — ek task solve kare), *dekhna* (reference — accurate, complete), *samajhna* (explanation — aisa kyun banaya). Jo page chaaron banne ki koshish karta hai, use koi nahi padhta.\n• **Chaar documents jo kharcha nikalte hain**: `README` jo bataye yeh kya hai, kaise chalayein, code kahan hai; **ADRs** decisions ke liye (context, options, decision, consequences) taaki aage aapko pata rahe ki obvious alternative kyun reject hua; **runbooks** har us cheez ke liye jo page karti hai; aur `CHANGELOG` ki kya badla aur kab.\n• **Docs as code**: repo mein rakho, change ke saath review karo, code se link karo, aur baaki sab ki tarah build/deploy karo. Jis wiki ka owner koi nahi, wo hafton mein drift karti hai — aam fix: behaviour badalne wala PR usi change mein doc bhi update kare.\n\n• **Comments *kyun* batate hain, *kya* nahi.** `// increment i` shor hai; `// ek baar retry: upstream cache write ke ~2s baad stale rehta hai` wo baat hai jo code nahi keh sakta. Comment isliye likhna pad raha hai ki code unreadable hai, to code theek karo.\n• **Freshness volume se behtar hai**: chhota, sahi, owner aur last-reviewed date wala page 400 stale pages wali khoobsurat wiki se behtar hai. Galat documentation delete karo — galat docs na hone se kharab hain, log un par bharosa karte hain.\n• Practical test: naya engineer fresh machine par README follow karke bina kisi se poochhe change ship kar de. Har sawaal jo unhe poochna pada, wo ek documentation task hai.",
    ["eng-design-doc", "eng-ways-of-working", "arch-decisions"],
  ),

  // ---------------------------------------------------------------- data & analytics
  L(
    "data-etl-pipeline",
    "ETL and ELT pipelines",
    "data",
    ["what is etl", "etl vs elt", "how to build a data pipeline", "orchestrate a data pipeline"],
    ["etl", "elt", "pipeline", "transform", "extract", "load", "orchestrate", "dbt", "airflow"],
    "**ETL** extracts from sources, transforms on the way, loads into the warehouse. **ELT** loads raw first and transforms *inside* the warehouse with SQL — which is what cloud warehouses made cheap, and why dbt-style modelling became the default.\n\n• **Extract**: batch (nightly snapshot, `updated_at` watermark) or CDC (stream the write-ahead log) when you need minutes, not hours. Whatever you choose, record the watermark so a rerun resumes instead of re-reading everything.\n• **Transform**: keep it in version control, tested on sample data, and idempotent per partition — a pipeline that writes `INSERT INTO fact` twice a day will double your numbers. Prefer writing whole partitions atomically (`DELETE + INSERT`, or a table swap).\n• **Load**: land raw data first (bronze), then cleaned (silver), then business-shaped (gold). When a number looks wrong, that layering is what lets you find out where.\n\n• **Orchestration** (Airflow, Dagster, Prefect) gives you scheduling, retries, backfills and lineage. Backfills are the real test of a pipeline: can you rebuild six months without breaking production dashboards?\n• **Observability**: freshness (\"last load 04:10\"), volume (\"rows dropped 40%\"), schema changes and null rates. Alert on the data being wrong, not only on the job failing — a green job that loaded zero rows is the classic silent outage.\n• Small files and small batches are the usual performance killer: read/write fewer, larger chunks.",
    "**ETL** sources se extract karta hai, raste mein transform, aur warehouse mein load. **ELT** pehle raw load karta hai aur transform *warehouse ke andar* SQL se — cloud warehouses ne ise sasta banaya, isliye dbt-style modelling default ho gaya.\n\n• **Extract**: batch (raat ka snapshot, `updated_at` watermark) ya CDC (write-ahead log stream) jab ghante nahi, minutes chahiye. Jo bhi chuno, watermark record karo taaki rerun resume kare, sab dobara na padhe.\n• **Transform**: version control mein rakho, sample data par test karo, aur per partition idempotent — jo pipeline din mein do baar `INSERT INTO fact` karti hai, numbers double kar degi. Partition atomically likho (`DELETE + INSERT`, ya table swap).\n• **Load**: pehle raw (bronze), phir cleaned (silver), phir business shape (gold). Number galat lage to yahi layering batati hai kahan galat hua.\n\n• **Orchestration** (Airflow, Dagster, Prefect) scheduling, retries, backfills aur lineage deta hai. Backfill asli test hai: chhe mahine bina production dashboards tode rebuild kar sakte ho?\n• **Observability**: freshness (\"last load 04:10\"), volume (\"rows 40% gire\"), schema changes aur null rates. Sirf job fail par nahi, data galat hone par alert karo — green job jisne zero rows load kiye, wahi classic silent outage hai.\n• Bahut chhote files aur chhote batches sabse aam performance killer hain: kam, bade chunks padho/likho.",
    ["data-warehouse-lake", "infra-queues", "db-timeseries"],
  ),
  L(
    "data-warehouse-lake",
    "Warehouse, lake and lakehouse",
    "data",
    ["data warehouse vs data lake", "what is a lakehouse", "where to store analytics data", "columnar storage"],
    ["warehouse", "lake", "lakehouse", "columnar", "parquet", "snowflake", "bigquery", "analytics", "olap"],
    "Three words that get mixed up, with a simple rule each:\n\n• **Data warehouse** (Snowflake, BigQuery, Redshift, Postgres + star schema): structured, schema-on-write, SQL, fast for aggregations, expensive per byte. The answer for \"numbers the business reports\".\n• **Data lake** (S3/GCS + Parquet/Iceberg/Delta): cheap storage for everything raw — logs, events, images, JSON dumps — schema-on-read. Powerful and easy to turn into a swamp: no schema, no owners, no quality = nobody trusts it.\n• **Lakehouse**: lake storage with warehouse-like tables (Iceberg/Delta/Hudi give ACID, schema evolution and time travel on top of object storage). Often the pragmatic middle — open formats, one copy, SQL engines on top.\n\n• **Why columnar matters**: analytics reads a few columns over many rows. Parquet/ORC store data by column and compress it, so a query touching 2 of 60 columns reads ~3% of the bytes. Row stores are for lookups, column stores are for scans.\n• **Do not run analytics on the production OLTP database**: a heavy reporting query takes locks, evicts caches and competes with customer traffic. Replicate into the analytical store (logical replication, CDC, or a nightly export) and query there.\n• Model for the question: star schemas (facts + dimensions) stay understandable for years; a wide denormalised table is fast until the second question arrives. Add a semantic layer so \"revenue\" means one thing everywhere.",
    "Teen shabd jo mix ho jaate hain, har ek ka simple rule:\n\n• **Data warehouse** (Snowflake, BigQuery, Redshift, Postgres + star schema): structured, schema-on-write, SQL, aggregations fast, per byte mehnga. \"Business jo numbers report karta hai\" ka jawab.\n• **Data lake** (S3/GCS + Parquet/Iceberg/Delta): sab kuch raw rakhne ki sasti storage — logs, events, images, JSON dumps — schema-on-read. Powerful, par swamp ban jaata hai: koi schema, owner, quality nahi = kisi ko bharosa nahi.\n• **Lakehouse**: lake storage + warehouse jaise tables (Iceberg/Delta/Hudi object storage par ACID, schema evolution, time travel dete hain). Aksar pragmatic middle — open formats, ek copy, upar SQL engines.\n\n• **Columnar kyun maayne rakhta hai**: analytics kuch columns ko bahut rows par padhta hai. Parquet/ORC column-wise store aur compress karte hain, to 60 mein se 2 columns wali query ~3% bytes padhti hai. Row store lookups ke liye, column store scans ke liye.\n• **Production OLTP database par analytics mat chalao**: bhaari reporting query locks leti hai, caches evict karti hai aur customer traffic se compete karti hai. Analytical store mein replicate karo (logical replication, CDC, nightly export) aur wahan query karo.\n• Sawaal ke hisaab se model karo: star schema (facts + dimensions) saalon tak samajh aata hai; wide denormalised table doosra sawaal aane tak fast rehta hai. Semantic layer add karo taaki \"revenue\" ka matlab sab jagah ek ho.",
    ["db-oltp-olap", "data-etl-pipeline", "db-partitioning"],
  ),
  L(
    "data-stream-processing",
    "Stream processing (Kafka, Flink, Spark Streaming)",
    "data",
    ["what is stream processing", "kafka streams vs flink", "how do event time windows work", "streaming vs batch"],
    ["stream", "streaming", "flink", "spark", "window", "watermark", "event time", "stateful", "kafka"],
    "Stream processing computes over data as it arrives instead of in a nightly job. The mental shift is that **time is now ambiguous**.\n\n• **Event time vs processing time**: an event that happened at 10:00 can arrive at 10:07 (mobile offline, retry, a slow producer). Windows can close on *event* time, but then you need a **watermark** — the engine's estimate that \"no events older than T will arrive\" — and a policy for late events (drop, update the window, or send to a side output).\n• **State is the hard part**: aggregations, joins and dedup keep state, and that state must survive restarts, rebalances and scaling. Engines either checkpoint it (Flink) or rebuild it from a compacted log (Kafka Streams, with a state store per task).\n• **Windows** come in flavours: tumbling (fixed, non-overlapping), sliding (overlapping), session (gap-based). \"Hourly counts\" with tumbling windows and a 5-minute allowed lateness is the usual starting point.\n\n• Choose by need: continuous metrics, fraud and alerting want streams; daily reporting wants batch on the warehouse where it is cheaper and simpler to debug.\n• **Streaming is not a cheaper batch job** — it is an always-on service with checkpoints, backpressure and its own failure modes. If the answer is acceptable an hour later, batch wins on cost and sanity.\n• Test with out-of-order arrivals, duplicates and a restart mid-window — that is the path where streaming code actually breaks.",
    "Stream processing data aane par compute karta hai, raat ke batch job mein nahi. Mental shift yeh hai ki **time ab ambiguous hai**.\n\n• **Event time vs processing time**: 10:00 ka event 10:07 par aa sakta hai (mobile offline, retry, slow producer). Windows *event* time par band ho sakti hain, par phir **watermark** chahiye — engine ka estimate \"T se purane events nahi aayenge\" — aur late events ki policy (drop, window update, side output).\n• **State hard part hai**: aggregations, joins, dedup state rakhte hain, aur wo state restarts, rebalances aur scaling jhelni chahiye. Engines ise checkpoint karti hain (Flink) ya compacted log se rebuild karti hain (Kafka Streams, per-task state store).\n• **Windows** kai tarah ke: tumbling (fixed, non-overlapping), sliding (overlapping), session (gap-based). \"Hourly counts\" ke liye tumbling windows + 5-minute allowed lateness usual starting point hai.\n\n• Zaroorat se chuno: continuous metrics, fraud, alerting → stream; daily reporting → batch on warehouse (sasta aur debug karna aasan).\n• **Streaming sasta batch job nahi hai** — wo always-on service hai, checkpoints, backpressure aur apne failure modes ke saath. Jawab ek ghante baad bhi theek ho, to batch cost aur sanity par jeetta hai.\n• Out-of-order arrivals, duplicates aur mid-window restart se test karo — asli streaming code isi path par tootta hai.",
    ["infra-queues", "dist-message-ordering", "db-event-sourcing"],
  ),
  L(
    "data-quality",
    "Data quality and lineage",
    "data",
    ["what is data quality", "how to validate data", "data lineage", "why are dashboards wrong"],
    ["quality", "lineage", "validation", "freshness", "null", "schema", "test", "contract", "trust"],
    "Dashboards do not lie — pipelines do. Data quality is the practice of catching that before a human does.\n\n• **The five checks that pay for themselves**: *freshness* (was it updated when it should be?), *volume* (did the row count move plausibly?), *schema* (did a column change type or vanish?), *nulls/uniqueness* (is `order_id` ever null or duplicated?), *distribution* (did the value range or category mix shift overnight?).\n• **Test the data, not only the code**: assert `unique(order_id)`, `not_null(paid_at)`, `accepted_values(status)`. Run them after every load, treat a failure like a failing test — quarantine the partition instead of publishing it.\n• **Lineage** answers \"where did this number come from\": table → table → dashboard. Without it, an incident review spends its first hour reconstructing which job wrote the broken column. Most orchestrators capture it automatically if you let them own the job definitions.\n• **Data contracts** push the fix upstream: the producing team publishes a schema and a freshness promise, and breaking them fails *their* CI, not the analyst's Monday morning.\n\n• Culture beats tooling: one owner per table, an alert on the *assertion*, and a rule that a dashboard's number must be reproducible from the raw table.\n• Alert fatigue is the failure mode here too: dedupe, and suppress downstream alert storms when an upstream table is known broken.",
    "Dashboards jhooth nahi bolte — pipelines bolti hain. Data quality wo practice hai jo yeh insaan se pehle pakad leti hai.\n\n• **Paanch checks jo kharcha nikal dete hain**: *freshness* (jab update hona chahiye tha hua?), *volume* (row count plausible move hua?), *schema* (column type badla ya gayab?), *nulls/uniqueness* (`order_id` kabhi null ya duplicate?), *distribution* (raat bhar value range ya category mix badla?).\n• **Data ko test karo, sirf code ko nahi**: `unique(order_id)`, `not_null(paid_at)`, `accepted_values(status)` assert karo. Har load ke baad chalao, failure ko failing test ki tarah lo — partition publish karne ki jagah quarantine karo.\n• **Lineage** batata hai \"number kahan se aaya\": table → table → dashboard. Iske bina incident review ka pehla ghanta yeh nikalne mein jaata hai ki kaunsi job ne kharab column likha. Zyadatar orchestrators ise automatically capture karte hain agar job definitions unke paas ho.\n• **Data contracts** fix upstream bhejte hain: producing team schema aur freshness promise publish karti hai, aur todne par *unki* CI fail hoti hai, analyst ka Monday morning nahi.\n\n• Culture tooling se badhkar hai: ek table ka ek owner, *assertion* par alert, aur rule ki dashboard ka number raw table se reproduce ho sakta hai.\n• Alert fatigue yahan bhi failure mode hai: dedupe karo, aur upstream table broken hone par downstream alert storm suppress karo.",
    ["data-etl-pipeline", "ops-observability", "data-governance"],
  ),
  L(
    "data-governance",
    "Data governance, PII and retention",
    "data",
    ["what is data governance", "how to handle pii", "data retention policy", "right to be forgotten"],
    ["governance", "pii", "personal", "retention", "gdpr", "consent", "catalog", "classification", "delete"],
    "Governance is the boring answer to \"where is our data, who can see it, and when do we delete it\". Regulation makes it mandatory; incidents make it urgent.\n\n• **Classify first**: what is public, internal, confidential, PII (name, email, IP, device id, location, free-text notes!), and what is regulated. Classification is what lets everything else be a rule instead of a debate per table.\n• **Minimise**: do not collect what you do not use, and do not copy what you do not need — analytics and logs are where PII quietly multiplies, because a log pipeline copies production data to five more systems.\n• **Access**: least privilege, purpose-based, audited (see audit logging). Row-level security in the warehouse so an analyst sees their region, not everyone's.\n• **Retention**: a documented period per data type, enforced by a job that deletes or anonymises — and backups that age out too. \"Keep everything forever\" is a liability, not a strategy.\n• **Subject rights**: export and deletion need to work across all copies, including the warehouse, the search index, the cache and derived features. The practical trick is to key everything by an internal id and keep the directly identifying fields in one place.\n\n• Anonymisation must be irreversible: hashing an email with a fixed salt is pseudonymisation, and it is reversible by brute force.\n• Practical test: pick a real customer and produce every row that mentions them, then delete them — time how long it takes. That exercise finds the governance gaps faster than any policy document.",
    "Governance \"hamara data kahan hai, kaun dekh sakta hai, kab delete karenge\" ka boring jawab hai. Regulation ise mandatory banata hai, incidents urgent.\n\n• **Pehle classify karo**: public, internal, confidential, PII (naam, email, IP, device id, location, free-text notes!) aur regulated. Classification se baaki sab per-table bahas ki jagah rule ban jaata hai.\n• **Minimise**: jo use nahi karte wo collect mat karo, jo zaroorat nahi uski copy mat banao — analytics aur logs mein PII chup-chaap multiply hota hai, kyunki log pipeline production data paanch systems mein copy kar deti hai.\n• **Access**: least privilege, purpose-based, audited (audit logging dekho). Warehouse mein row-level security taaki analyst apna region dekhe, sabka nahi.\n• **Retention**: har data type ka documented period, delete/anonymise karne wali job se enforce, aur backups bhi age out hon. \"Sab kuch hamesha rakho\" liability hai, strategy nahi.\n• **Subject rights**: export aur deletion har copy par kaam kare — warehouse, search index, cache aur derived features samet. Practical trick: sab kuch internal id se key karo aur directly identifying fields ek jagah rakho.\n\n• Anonymisation irreversible honi chahiye: fixed salt se email hash karna pseudonymisation hai, brute force se reversible.\n• Practical test: ek asli customer pick karo, uske saare rows nikaalo, phir delete karo — time note karo. Yeh exercise kisi bhi policy document se jaldi governance gaps dhoondhta hai.",
    ["security-audit-logging", "db-backups", "data-quality"],
  ),
  // ---------------------------------------------------------------- AI & ML, continued
  L(
    "ai-transformers",
    "How transformers work",
    "ai",
    ["how do transformers work", "what is self attention", "why do llms need gpus", "attention mechanism"],
    ["transformer", "attention", "token", "embedding", "context", "kv cache", "self-attention", "gpu", "parameter"],
    "A transformer reads a sequence of **tokens** and predicts the next one. Everything else — chat, code, summarisation — is that loop repeated.\n\n• **Tokens** are chunks of text (roughly ¾ of a word). The text becomes vectors (**embeddings**) plus position information, because attention itself is order-blind.\n• **Self-attention** lets every token look at every other token and decide which ones matter for its meaning: in \"the bank approved the loan because **it** had good credit\", attention is the mechanism that ties \"it\" to \"bank\". Each attention head learns a different relationship (syntax, coreference, position), and they run in parallel.\n• **Feed-forward layers** between attention blocks transform values per token; the model is dozens of these blocks stacked, so meaning is refined layer by layer.\n• **Generation is autoregressive**: predict a token, append it, repeat. This is why output streams word by word and why cost scales with output length, not just input.\n\n• **Why GPUs/TPUs**: all of that is giant matrix multiplication — thousands of parallel operations that a GPU does far better than a CPU. **VRAM** is the real constraint: the weights and the **KV cache** (the stored attention state of the prompt so far) must fit, and long contexts make the cache, not the weights, the limit.\n• **Context window** is the maximum tokens the model can attend to at once; exceeding it means summarising, chunking or forgetting. Bigger context is not free — attention cost grows with the square of sequence length in the naive implementation.\n\n• Practical consequences: prompts have a fixed token budget, output has a price and latency you can predict, and \"the model forgot\" is usually \"the information fell out of the context window\".",
    "Transformer **tokens** ka sequence padhta hai aur agla token predict karta hai. Baaki sab — chat, code, summarisation — usi loop ka repeat hai.\n\n• **Tokens** text ke chunks hain (lagbhag ¾ shabd). Text vectors (**embeddings**) ban jaata hai plus position info, kyunki attention khud order-blind hai.\n• **Self-attention** har token ko har doosre token ko dekhne deta hai aur decide karne deta hai kaunsa maayne rakhta hai: \"the bank approved the loan because **it** had good credit\" mein attention hi \"it\" ko \"bank\" se jodta hai. Har head alag relationship seekhta hai (syntax, coreference, position) aur sab parallel chalte hain.\n• **Feed-forward layers** attention blocks ke beech per-token values transform karti hain; model aise dozens blocks ka stack hai, to meaning layer-by-layer refine hoti hai.\n• **Generation autoregressive hai**: token predict, append, repeat. Isliye output word-by-word stream hota hai aur cost output length se scale karta hai, sirf input se nahi.\n\n• **GPU/TPU kyun**: yeh sab giant matrix multiplication hai — hazaaron parallel operations, jo GPU CPU se kaafi behtar karta hai. Asli constraint **VRAM** hai: weights aur **KV cache** (prompt ka stored attention state) fit hona chahiye, aur lamba context hone par limit weights nahi, cache banta hai.\n• **Context window** maximum tokens hai jitne model ek baar attend kar sakta hai; usse zyada = summarise, chunk ya bhoolna. Bada context free nahi — naive implementation mein attention cost sequence length ke square se badhta hai.\n\n• Practical nateeje: prompts ka fixed token budget hota hai, output ki price aur latency predict ho sakti hai, aur \"model bhool gaya\" aksar \"information context window se bahar chali gayi\" hota hai.",
    ["ai-llm-basics", "ai-embeddings-vector-db", "ai-local-vs-api"],
  ),
  L(
    "ai-embeddings-vector-db",
    "Embeddings and vector search",
    "ai",
    ["what are embeddings", "what is a vector database", "how does semantic search work", "hnsw vs ivf"],
    ["embedding", "embeddings", "vector", "similarity", "cosine", "ann", "hnsw", "ivf", "semantic", "nearest"],
    "An **embedding** turns text (or an image, or a user) into a vector where distance means similarity: \"reset my password\" and \"I cannot log in\" land close together even with no shared words. That is what makes semantic search possible when keyword search returns nothing.\n\n• **How you get them**: a model (local or API) maps input to, say, 768–1536 floats. The same model must embed the documents and the query — mixing models produces silent garbage.\n• **Search**: exact nearest-neighbour over millions of vectors is too slow, so vector databases use **ANN** indexes. **HNSW** (graph) is fast and accurate, more memory; **IVF** (clusters) is cheaper to build, tunes recall with how many clusters you probe. Every one of them trades recall for speed, which is why recall is a number you must measure, not assume.\n• **Dimensions and chunking matter more than the index**: chunk longs texts with overlap, prepend the title/section to each chunk for context, and store metadata (tenant, source, date) so you can filter *before* searching — filtering after top-k is the classic bug that returns irrelevant or cross-tenant results.\n\n• **Where it fits**: retrieval-augmented generation (RAG), dedupe, recommendations, clustering, anomaly detection, support-ticket routing.\n• **Pitfalls**: similarity is not correctness (\"closest\" can still be wrong), normalise vectors or use cosine distance consistently, and re-embed everything when you change models — plan a versioned index and a re-embed job.\n\n• For a small corpus, a plain in-memory dot-product over a few thousand vectors beats standing up another service; reach for a vector database when filtering, scale or persistence demands it.",
    "**Embedding** text (ya image, ya user) ko aise vector mein badalta hai jahan distance similarity batati hai: \"reset my password\" aur \"I cannot log in\" paas hote hain chahe koi shabd common na ho. Isi se semantic search possible hoti hai jab keyword search kuch nahi deti.\n\n• **Kaise milte hain**: model (local ya API) input ko 768–1536 floats mein map karta hai. Documents aur query dono usi model se embed karo — models mix karne par chup-chaap kachra milta hai.\n• **Search**: millions vectors par exact nearest-neighbour bahut slow hai, isliye vector DBs **ANN** indexes use karti hain. **HNSW** (graph) fast aur accurate, memory zyada; **IVF** (clusters) build sasta, recall is baat par depend karta hai ki kitne clusters probe karo. Sab recall ko speed se trade karte hain — isliye recall ek number hai jo measure karna padta hai, maan nahi sakte.\n• **Dimensions aur chunking index se zyada maayne rakhte hain**: lambe text ko overlap ke saath chunk karo, har chunk se pehle title/section lagao context ke liye, aur metadata (tenant, source, date) store karo taaki search se *pehle* filter ho — top-k ke *baad* filtering wahi classic bug hai jo irrelevant ya cross-tenant results deta hai.\n\n• **Kahan fit**: RAG, dedupe, recommendations, clustering, anomaly detection, ticket routing.\n• **Pitfalls**: similarity correctness nahi hai (\"closest\" bhi galat ho sakta hai), vectors normalise karo ya cosine consistently use karo, aur model badalne par sab re-embed karo — versioned index aur re-embed job ka plan rakho.\n\n• Chhote corpus ke liye kuch hazaar vectors par plain in-memory dot-product naya service khada karne se behtar hai; vector DB tab lo jab filtering, scale ya persistence maange.",
    ["ai-rag", "db-indexes", "ai-transformers"],
  ),
  L(
    "ai-finetuning",
    "Fine-tuning, prompting and RAG",
    "ai",
    ["when to fine tune", "fine tuning vs rag", "fine tuning vs prompting", "lora explained"],
    ["fine-tune", "finetune", "fine", "tuning", "lora", "adapter", "prompt", "rag", "distill", "custom"],
    "Three ways to make a model behave, in increasing cost and commitment:\n\n1. **Prompting** — instructions, examples, formatting rules. Changes nothing, costs a token budget on every call, and is where you should start. If a clear prompt plus good examples works, stop here.\n2. **RAG** — retrieve relevant documents and put them in the context. The answer for *knowledge*: it can cite, it can change daily, and you do not retrain anything. Most \"the model does not know about our product\" problems are RAG problems.\n3. **Fine-tuning** — continue training on your examples, usually with **LoRA/adapters** (train small matrices, keep the base frozen) so it fits on one GPU and costs tens of dollars, not millions. The answer for *behaviour*: a fixed output format, a domain tone, a classification task, or shortening prompts by distilling instructions into weights.\n\n• **Fine-tuning does not add facts reliably.** A model trained on your docs can still hallucinate them, and it cannot cite. Knowledge → RAG; style, format, task behaviour → fine-tune; both → do both.\n• **You need data**: hundreds to thousands of high-quality examples in the exact input/output shape, with a held-out set. The usual failure is a dataset that is 80% duplicates — the model memorises instead of generalising.\n• Evaluate before and after on your own task, not a leaderboard, and include a regression set of the cases the old version got right. Fine-tunes drift, and an adapter is another artefact to version, test and roll back.\n\n• Cost comparison: prompting is free to change but pays per call; RAG pays for the vector store and extra tokens; fine-tuning pays once (plus hosting) and can *reduce* per-call cost by shrinking prompts — which is often the real business case.",
    "Model ko behave karane ke teen tarike, badhte cost aur commitment ke saath:\n\n1. **Prompting** — instructions, examples, format rules. Kuch badalta nahi, har call par token budget kharch karta hai, aur shuruaat yahin se karo. Saaf prompt + acche examples chal jaayein to yahin ruk jao.\n2. **RAG** — relevant documents retrieve karke context mein daalo. *Knowledge* ka jawab: cite kar sakta hai, roz badal sakta hai, kuch retrain nahi hota. \"Model ko hamare product ka pata nahi\" wali zyadatar problem RAG ki problem hai.\n3. **Fine-tuning** — apne examples par training continue, aksar **LoRA/adapters** se (chhoti matrices train, base frozen) taaki ek GPU par fit ho aur kharche tens of dollars hon, millions nahi. *Behaviour* ka jawab: fixed output format, domain tone, classification task, ya instructions ko weights mein distill karke prompts chhote karna.\n\n• **Fine-tuning facts bharosemand tarike se nahi jodta.** Apne docs par trained model unhe hallucinate bhi kar sakta hai aur cite nahi kar sakta. Knowledge → RAG; style, format, behaviour → fine-tune; dono chahiye → dono karo.\n• **Data chahiye**: usi input/output shape ke sau-hazaaron high-quality examples, held-out set ke saath. Aam failure: dataset 80% duplicates — model generalise karne ki jagah ratto rat memorise karta hai.\n• Apne task par before/after evaluate karo, leaderboard par nahi, aur purane version ke sahi cases ka regression set rakho. Fine-tunes drift karte hain, aur adapter ek aur artefact hai jo version, test aur rollback maangta hai.\n\n• Cost comparison: prompting badalna free par per call pay; RAG vector store aur extra tokens pay; fine-tuning ek baar (plus hosting) aur prompts chhote karke per-call cost *ghata* bhi sakta hai — asli business case aksar yahi hota hai.",
    ["ai-llm-basics", "ai-rag", "ai-local-vs-api"],
  ),
  L(
    "ai-mlops",
    "MLOps",
    "ai",
    ["what is mlops", "how to deploy a model", "model monitoring", "machine learning lifecycle"],
    ["mlops", "deploy", "model", "registry", "drift", "monitor", "feature", "retrain", "pipeline", "version"],
    "MLOps is \"DevOps for models\", plus the part that makes it harder: **the software does not change, but its behaviour does**, because the world moved.\n\n• **Lifecycle**: data → features → training → evaluation → registry → deployment → monitoring → retrain. Each step needs a version: data snapshot, code commit, hyperparameters, and the resulting artefact. Reproducing a model a year later is the minimum bar in a regulated setting.\n• **Feature stores** exist to stop training/serving skew: the same feature definition, computed the same way, for a batch job and an online request. Skew is the most common reason a model looks great offline and useless in production.\n• **Deployment patterns**: shadow (score silently), canary (small % of traffic), A/B (compare business metrics), and bandit for exploration. Roll back on a metric, not on vibes — and keep the previous model warm.\n• **Monitoring is different from software monitoring**: latency and errors still matter, but so do *input drift* (are the features today shaped like training data?), *prediction drift* (are outputs shifting?) and *outcome quality* (accuracy measured against labels that arrive later). Without labels you cannot measure accuracy — so log the inputs and join them to outcomes when they land.\n\n• **Data quality is model quality**: a missing column at inference is an incident, not a small bug. Validate schemas at the boundary.\n• Start small: a versioned artefact, a reproducible training script, a canary deploy and a drift dashboard cover most of the value. Full platforms can wait until the second model.",
    "MLOps \"models ke liye DevOps\" hai, plus woh hissa jo ise mushkil banata hai: **software nahi badalta, uska behaviour badalta hai**, kyunki duniya badal gayi.\n\n• **Lifecycle**: data → features → training → evaluation → registry → deployment → monitoring → retrain. Har step ka version chahiye: data snapshot, code commit, hyperparameters aur resulting artefact. Saal baad model reproduce kar pana minimum bar hai, regulated setting mein to zaroori.\n• **Feature stores** training/serving skew rokne ke liye hain: wahi feature definition, wahi tarika, batch job aur online request dono ke liye. Skew sabse aam wajah hai ki model offline shaandaar aur production mein bekaar lage.\n• **Deployment patterns**: shadow (chup-chaap score), canary (chhota % traffic), A/B (business metrics compare), aur exploration ke liye bandit. Metric par rollback karo, vibe par nahi — aur purana model warm rakho.\n• **Monitoring software monitoring se alag hai**: latency aur errors to maayne rakhte hain, par *input drift* (aaj ke features training data jaise hain?), *prediction drift* (outputs shift ho rahe?) aur *outcome quality* (accuracy, labels baad mein aate hain) bhi. Labels ke bina accuracy measure nahi hoti — to inputs log karo aur outcomes aane par join karo.\n\n• **Data quality hi model quality hai**: inference par gayab column incident hai, chhota bug nahi. Boundary par schemas validate karo.\n• Chhote se shuru karo: versioned artefact, reproducible training script, canary deploy aur drift dashboard — value ka zyadatar hissa cover ho jaata hai. Full platform doosre model tak wait kar sakti hai.",
    ["ai-eval", "ai-classic-ml", "infra-cicd"],
  ),
  L(
    "ai-agents",
    "AI agents and tool use",
    "ai",
    ["what is an ai agent", "how do ai agents work", "tool calling explained", "why do agents fail"],
    ["agent", "agents", "agentic", "tool", "calling", "planning", "loop", "autonomy", "mcp", "orchestration"],
    "An **agent** is a model in a loop with tools: it decides what to do next, calls a tool (search, code, an API), reads the result, and continues until it has an answer or hits a limit.\n\n• **The ingredients**: a model, a set of clearly-described tools with strict schemas, a scratchpad/state, and a stopping rule (max steps, max cost, success check). Remove any one and you get a demo, not a system.\n• **Where it works today**: tasks with a verifiable end state and cheap retries — writing and running code, extracting structured data, triaging tickets with a retrieval step, routine multi-step API work with a human approving side effects.\n• **Where it fails**: long horizons with no feedback (errors compound — 95% per step across 20 steps is ~36%), tasks needing judgement about consequences, and anything where one wrong write cannot be undone. Autonomy without a verification step is a licence to make confident mistakes.\n\n• **Engineering rules that matter more than the model choice**: make tools **idempotent** and safe to retry; require confirmation for destructive actions; log every thought/step (you will need it in the incident review); cap steps, tokens and wall-clock time; and give the agent a way to say \"I do not know\" or hand back to a human.\n• **Prompt-injection is a real attack surface** here: any page, email or document the agent reads can contain instructions. Never let untrusted content grant permissions — the agent acts with *its* credentials, not the document's.\n\n• The honest framing: agents are automation with a probabilistic planner. Budget for a human in the loop, measure task success rate end-to-end, and roll out by making the read-only version excellent first.",
    "**Agent** ek model hai loop mein, tools ke saath: wo decide karta hai aage kya karna hai, tool call karta hai (search, code, API), result padhta hai, aur answer milne ya limit hit hone tak chalta hai.\n\n• **Ingredients**: ek model, saaf-described tools strict schemas ke saath, scratchpad/state, aur stopping rule (max steps, max cost, success check). Ek bhi hatao to demo milega, system nahi.\n• **Aaj kahan kaam karta hai**: aise tasks jahan end state verifiable ho aur retry sasta — code likhna-chalana, structured data extract, retrieval step ke saath ticket triage, routine multi-step API kaam jismein human side effects approve kare.\n• **Kahan fail karta hai**: lambe horizon bina feedback (errors compound hote hain — 20 steps par 95% per step ~36% banta hai), consequences ki samajh wale tasks, aur jahan ek galat write undo nahi hota. Verification ke bina autonomy confident galtiyan karne ka licence hai.\n\n• **Model choice se zyada yeh engineering rules maayne rakhte hain**: tools **idempotent** aur retry-safe banao; destructive actions ke liye confirmation maango; har step/thought log karo (incident review mein chahiye hoga); steps, tokens aur wall-clock par cap lagao; aur agent ko \"mujhe nahi pata\" bolne ya human ko handover karne ka raasta do.\n• **Prompt-injection yahan asli attack surface hai**: agent jo bhi page, email ya document padhta hai usme instructions ho sakti hain. Untrusted content ko permissions dene wala mat banao — agent *apni* credentials se act karta hai, document ki nahi.\n\n• Imaandar framing: agents probabilistic planner ke saath automation hain. Human-in-the-loop ka budget rakho, end-to-end task success rate measure karo, aur rollout pehle read-only version ko excellent bana kar karo.",
    ["ai-rag", "ai-eval", "ai-hallucination"],
  ),
  L(
    "ai-cost-guardrails",
    "AI cost, latency and guardrails",
    "ai",
    ["how to reduce llm cost", "why is my ai slow", "how to guardrail an llm feature", "token cost control"],
    ["cost", "latency", "token", "cache", "guardrail", "budget", "stream", "fallback", "batching", "quota"],
    "An LLM feature is a **cost and latency budget you design**, not a bill you discover.\n\n• **Cost levers, in order of effect**: (1) smaller/cheaper model for easy requests — route by difficulty; (2) shorter prompts — drop boilerplate, summarise history instead of resending it, retrieve only the top-k chunks; (3) **caching** — exact-match cache for repeated questions, provider prompt-caching for a stable prefix, and semantic cache for near-duplicates; (4) cap `max_tokens` and constrain output format; (5) batch offline work.\n• **Latency levers**: stream tokens so the user sees progress in ~300 ms; run independent calls in parallel; use a fast model for classification/routing and reserve the slow one for the final answer; and set timeouts with a fallback (cached or template answer) instead of letting a request hang.\n• **Guardrails**: validate input (length, rate limits, prompt-injection patterns), constrain output (schema/JSON validation, allow-lists for actions), verify before side effects, and always have a kill switch plus per-tenant quotas. \"Unlimited AI\" is not a feature, it is an outage waiting for a scraper.\n\n• **Observability**: log tokens in/out, cost per request, latency percentiles, cache hit rate, fallback rate and refusal rate — per tenant and per feature. A cost dashboard that surprises you at the end of the month is the most common AI incident, and the fix is a quota plus an alert at 70% of budget.\n\n• The cheapest token is the one you never send: if a lookup, a regex or a cached answer can serve the request, do that and keep the model for what actually needs it.",
    "LLM feature ek **cost aur latency budget hai jo aap design karte ho**, aisa bill nahi jo mahine ke end mein pata chalta hai.\n\n• **Cost levers, asar ke order mein**: (1) aasan requests ke liye chhota/sasta model — difficulty se route karo; (2) prompt chhote — boilerplate hatao, history resend karne ki jagah summarise karo, sirf top-k chunks retrieve karo; (3) **caching** — repeat questions ke liye exact cache, stable prefix ke liye provider prompt-caching, near-duplicates ke liye semantic cache; (4) `max_tokens` cap aur output format constrain; (5) offline kaam batch karo.\n• **Latency levers**: tokens stream karo taaki user ~300 ms mein progress dekhe; independent calls parallel chalao; classification/routing ke liye fast model aur final answer ke liye slow; aur timeouts ke saath fallback (cached ya template answer) rakho, request latakne na do.\n• **Guardrails**: input validate (length, rate limits, prompt-injection patterns), output constrain (schema/JSON validation, actions ke liye allow-lists), side effects se pehle verify, aur hamesha kill switch plus per-tenant quotas. \"Unlimited AI\" feature nahi, scraper ke liye khuli outage hai.\n\n• **Observability**: tokens in/out, cost per request, latency percentiles, cache hit rate, fallback rate aur refusal rate log karo — per tenant aur per feature. Mahine ke end par surprise dene wala cost dashboard sabse aam AI incident hai, aur fix hai quota + budget ke 70% par alert.\n\n• Sabse sasta token wahi hai jo bheja hi na jaye: lookup, regex ya cached answer request serve kar sakta hai to wahi karo, model sirf uske liye rakho jise sach mein zaroorat hai.",
    ["ai-eval", "cloud-cost", "ai-local-vs-api"],
  ),
  // ---------------------------------------------------------------- performance, continued
  L(
    "perf-profiling",
    "Profiling and flame graphs",
    "performance",
    ["how to profile an application", "what is a flame graph", "find the slow function", "profiler tools"],
    ["profile", "profiling", "profiler", "flame", "graph", "sample", "hot", "path", "trace", "deep"],
    "\"It is slow somewhere\" is not a finding. Profiling turns that into \"this function is 60% of the time in this path\", and the difference is usually one afternoon versus one week.\n\n• **Sample vs instrument**: sampling profilers (perf, py-spy, async-profiler, Node's `--cpu-prof`) record the stack periodically and add ~1% overhead — safe in production. Instrumenting profilers wrap every call; more detail, much more overhead. Start with sampling.\n• **Flame graphs** read bottom-up: the widest bars are where CPU time went, and the stack above them shows who called them. Look for the *deepest wide* bar — that is your hot path, not the widest single function in isolation. Colour usually encodes language or randomness; width is what matters.\n• **CPU is not the whole story**: off-CPU time (I/O, locks, GC, waiting on a pool) does not appear in a CPU profile. Pair a CPU profile with a wall-clock view (traces, `off-CPU` profiles) or you will \"optimise\" code that was only waiting.\n\n• **Method**: measure the metric the user cares about (p50/p95 latency, throughput, allocations), profile the *slow* case (not the average), change one thing, re-measure the same workload. Keep a benchmark/load test so improvements are provable and regressions are caught.\n• Do not guess from the code: the offending line is routinely something innocent-looking that runs a million times, or a regex that backtracks, or an N+1 query. The profile is the evidence; the fix follows the evidence.",
    "\"Kahin slow hai\" finding nahi hai. Profiling ise \"yeh function is path mein 60% time le raha hai\" bana deti hai, aur fark aksar ek dopahar vs ek hafte ka hota hai.\n\n• **Sample vs instrument**: sampling profilers (perf, py-spy, async-profiler, Node `--cpu-prof`) stack periodically record karte hain aur ~1% overhead daalte hain — production mein safe. Instrumenting profilers har call wrap karte hain; zyada detail, kaafi zyada overhead. Sampling se shuru karo.\n• **Flame graphs** neeche se upar padho: sabse chaudi bars wahan hain jahan CPU time gaya, aur unke upar ka stack batata hai kisne call kiya. *Sabse gehra chauda* bar dhoondho — wahi hot path hai, alag se sabse chaudi single function nahi. Colour language ya randomness se aata hai; width maayne rakhti hai.\n• **CPU poori kahani nahi**: off-CPU time (I/O, locks, GC, pool ka wait) CPU profile mein nahi dikhta. CPU profile ke saath wall-clock view (traces, off-CPU profile) rakho warna aap aise code ko \"optimise\" karoge jo sirf wait kar raha tha.\n\n• **Method**: wahi metric measure karo jo user ko chahiye (p50/p95 latency, throughput, allocations), *slow* case profile karo (average nahi), ek cheez badlo, wahi workload dobara measure karo. Benchmark/load test rakho taaki improvement prove ho aur regression pakda jaye.\n• Code se andaza mat lagao: guilty line aksar koi masoom dikhne wali cheez hoti hai jo million baar chalti hai, ya backtracking regex, ya N+1 query. Profile evidence hai; fix evidence ke peeche aata hai.",
    ["perf-latency", "sys-gc-memory", "ops-observability"],
  ),
  L(
    "perf-query-tuning",
    "Tuning a slow SQL query",
    "performance",
    ["how to optimise a slow query", "what is explain analyze", "how to fix n+1 queries", "why is my query slow"],
    ["explain", "analyze", "query", "slow", "seq", "scan", "n+1", "plan", "index", "cardinality"],
    "The method, and it is mostly reading a plan rather than guessing:\n\n1. **Measure the query alone** (`EXPLAIN (ANALYZE, BUFFERS)`): estimated rows vs actual rows, time per node, and how many buffers were read. The first node where estimate and actual diverge wildly is where the planner went wrong.\n2. **Read the access path**: `Seq Scan` on a large table with a selective `WHERE` means a missing index (or a function/cast on the column, or a type mismatch that makes it unusable). Nested loops over huge row counts suggest bad estimates or a missing index. A hash join spilling to disk suggests low `work_mem`.\n3. **`EXPLAIN` tells you why**: `rows=1` estimated but 200 000 actual is the classic — usually a stale statistic (`ANALYZE`), a correlated column, or a `LIKE '%x%'` that cannot use an index.\n\n• **N+1** is not a database problem: one query per row in a loop. Fix in the ORM (eager load / `include`), or fetch the set with `WHERE id = ANY($1)`. It hides well because each query is fast — it is the count that kills.\n• **Indexes**: index the columns you filter and join on, in the right order (most selective first is not universal — equality before range). A covering index with `INCLUDE` avoids the table lookup. More indexes slow writes, so delete the unused ones (`pg_stat_user_indexes`).\n• **Other usual wins**: select only the columns you need (no `SELECT *`), paginate (keyset, not `OFFSET 100000`), avoid functions on indexed columns, and mind the connection pool — queueing at the pool looks exactly like a slow query.\n\n• Re-measure after each change with the same data distribution; a plan that helps at 10 000 rows can hurt at 10 million.",
    "Method, aur yeh zyadatar plan padhne ki baat hai, andaze ki nahi:\n\n1. **Query akeli measure karo** (`EXPLAIN (ANALYZE, BUFFERS)`): estimated vs actual rows, per node time, aur kitne buffers padhe gaye. Jahan estimate aur actual bahut diverge karte hain, wahi planner galat gaya.\n2. **Access path padho**: badi table par selective `WHERE` ke saath `Seq Scan` matlab missing index (ya column par function/cast, ya type mismatch jo index unusable kar deta hai). Huge row counts par nested loops → bad estimates ya missing index. Hash join disk par spill kare → `work_mem` kam.\n3. **`EXPLAIN` wajah batata hai**: `rows=1` estimate par 200 000 actual classic hai — aksar stale statistic (`ANALYZE`), correlated column, ya `LIKE '%x%'` jo index use nahi kar sakta.\n\n• **N+1** database ki problem nahi: loop mein per row ek query. ORM mein fix karo (eager load / `include`), ya set `WHERE id = ANY($1)` se lao. Yeh chhupta hai kyunki har query fast lagti hai — count hi maarta hai.\n• **Indexes**: filter aur join wale columns par index, sahi order mein (\"sabse selective pehle\" universal nahi hai — equality range se pehle). `INCLUDE` ke saath covering index table lookup bacha deta hai. Zyada indexes writes slow karte hain, to unused delete karo (`pg_stat_user_indexes`).\n• **Baaki usual wins**: sirf zaroori columns (`SELECT *` nahi), pagination (keyset, `OFFSET 100000` nahi), indexed columns par functions se bacho, aur connection pool ka dhyan — pool par queueing bilkul slow query jaisa dikhta hai.\n\n• Har change ke baad usi data distribution par re-measure karo; 10 000 rows par help karne wala plan 10 million par nuksan de sakta hai.",
    ["db-indexes", "db-locks", "db-connection-pool"],
  ),
  // ---------------------------------------------------------------- web & engineering, continued
  L(
    "web-accessibility",
    "Accessibility (a11y)",
    "web",
    ["what is web accessibility", "wcag levels", "how to make a site accessible", "screen reader testing"],
    ["accessibility", "a11y", "wcag", "screen reader", "keyboard", "contrast", "aria", "focus", "alt"],
    "Accessibility is usability for people who use a keyboard, a screen reader, a magnifier, or no mouse — and it makes the product better for everyone (mobile, sunlight, captions).\n\n• **The four WCAG principles (POUR)**: *Perceivable* (text alternatives, captions, 4.5:1 contrast for body text — 3:1 for large), *Operable* (everything reachable by keyboard, visible focus, no keyboard traps), *Understandable* (labels, errors that say what went wrong and how to fix it), *Robust* (correct semantic HTML so assistive tech can interpret it). Levels A → AA → AAA: **AA is the usual legal and practical bar**.\n\n• **The highest-value fixes, in order**: real semantic elements (`button`, `label`, `nav`, `h1`–`h3`) instead of clickable `div`s; a visible focus ring and logical tab order; alt text that conveys purpose (empty `alt=\"\"` for decorative images); form errors tied to the field with `aria-describedby`; and no information conveyed by colour alone.\n• **ARIA is a patch, not a base**: `aria-label` when there is no visible text, `aria-live` for toasts and async updates, `role` only when semantics genuinely do not exist. Incorrect ARIA is worse than none — a `role=\"button\"` on a `div` still needs keyboard handling.\n\n• **Testing**: keyboard-only walkthrough (can you complete the main flow with Tab/Enter/Esc?), automated axe/Lighthouse checks in CI (they catch ~30–40%), and one screen-reader pass (VoiceOver/NVDA) on the critical path. Automated tools cannot tell whether alt text makes sense.\n\n• It is cheaper than it looks when designed in: get the component library accessible once, and every feature inherits it. Retrofitting a design system is where the cost explodes — and remediation requests have a habit of arriving with a legal deadline.",
    "Accessibility un logon ke liye usability hai jo keyboard, screen reader, magnifier use karte hain, ya mouse nahi — aur yeh sabke liye product behtar karta hai (mobile, dhoop, captions).\n\n• **WCAG ke chaar principles (POUR)**: *Perceivable* (text alternatives, captions, body text ke liye 4.5:1 contrast — bade text par 3:1), *Operable* (sab keyboard se pahunchne layak, visible focus, koi keyboard trap nahi), *Understandable* (labels, errors jo batayein kya galat hua aur kaise theek karein), *Robust* (sahi semantic HTML taaki assistive tech samajh sake). Levels A → AA → AAA: **AA usual legal aur practical bar hai**.\n\n• **Sabse zyada value wale fixes, order mein**: clickable `div` ki jagah asli semantic elements (`button`, `label`, `nav`, `h1`–`h3`); visible focus ring aur logical tab order; alt text jo purpose bataye (decorative images par khaali `alt=\"\"`); form errors `aria-describedby` se field se juda; aur sirf colour se information nahi.\n• **ARIA patch hai, base nahi**: `aria-label` jab visible text na ho, `aria-live` toasts aur async updates ke liye, `role` sirf jab semantics sach mein na ho. Galat ARIA na hone se kharab hai — `div` par `role=\"button\"` ko keyboard handling phir bhi chahiye.\n\n• **Testing**: sirf keyboard walkthrough (Tab/Enter/Esc se main flow poora ho sakta hai?), CI mein automated axe/Lighthouse (~30–40% pakadte hain), aur critical path par ek screen-reader pass (VoiceOver/NVDA). Automated tools nahi bata sakte ki alt text ka matlab ban raha hai ya nahi.\n\n• Design se karna sasta hai: component library ek baar accessible kar do, har feature inherit karti hai. Design system retrofit mein cost phatti hai — aur remediation requests aksar legal deadline ke saath aati hain.",
    ["testing-pyramid", "web-browser-perf", "eng-code-review"],
  ),
  L(
    "web-feature-flags",
    "Feature flags and progressive rollout",
    "web",
    ["what is a feature flag", "how to do a canary release", "kill switch", "flag debt"],
    ["flag", "flags", "toggle", "canary", "rollout", "experiment", "targeting", "kill", "switch"],
    "A **feature flag** decouples deploy from release: the code ships dark, and a flag decides who sees it. This turns \"release\" from an event into a knob you can turn.\n\n• **Types, and they age differently**: *release* flags (short-lived, delete after rollout), *ops* flags (kill switches for a dependency or a heavy feature — keep forever, test them), *experiment* flags (tied to an A/B test, deleted when decided), *permission* flags (entitlements for plans/tenants — these are configuration, not debt).\n• **Progressive rollout**: internal → 1% → 10% → 50% → 100%, watching error rate, latency and the business metric at each step. Roll forward or flip back in seconds — no redeploy, no revert PR, no waiting for the build.\n• **Rules that keep it healthy**: evaluate on the server for anything security-relevant (a client-side flag is a UI hint, not a control); make flags **sticky** per user or tenant so they do not flicker; default to *off* when the flag service is unreachable; and log which variant was served so a metric can be interpreted afterwards.\n\n• **Flag debt is real**: hundreds of boolean branches, tests that cover none of the combinations, and code nobody dares delete. Treat flag removal as part of the rollout task — a flag with no owner and no expiry date is a permanent branch.\n\n• Small-team version: a database-backed flag table plus a cached read in the app is enough; buy or build the fancy targeting UI when experimentation becomes a habit, not before.",
    "**Feature flag** deploy ko release se alag kar deta hai: code dark ship hota hai, aur flag decide karta hai kaun dekhega. Isse \"release\" ek event ki jagah knob ban jaata hai jise ghumaa sakte ho.\n\n• **Types, aur inki age alag hoti hai**: *release* flags (chhoti umar, rollout ke baad delete), *ops* flags (kill switches — hamesha rakho, test karo), *experiment* flags (A/B se bandhe, decision ke baad delete), *permission* flags (plans/tenants ki entitlements — yeh configuration hai, debt nahi).\n• **Progressive rollout**: internal → 1% → 10% → 50% → 100%, har step par error rate, latency aur business metric dekhte hue. Aage badho ya seconds mein palto — redeploy nahi, revert PR nahi, build ka wait nahi.\n• **Healthy rakhne ke rules**: security se jude kuch bhi server par evaluate karo (client-side flag UI hint hai, control nahi); flags **sticky** rakho per user/tenant taaki flicker na ho; flag service unreachable ho to default *off*; aur kaunsi variant mili yeh log karo taaki baad mein metric interpret ho sake.\n\n• **Flag debt asli hai**: sau boolean branches, aise tests jo koi combination cover nahi karte, aur code jise delete karne ki himmat nahi. Flag removal ko rollout task ka hissa maano — bina owner aur bina expiry wala flag permanent branch hai.\n\n• Chhoti team ka version: database-backed flag table aur app mein cached read kaafi hai; fancy targeting UI tab lo jab experimentation habit ban jaaye, pehle nahi.",
    ["ops-deploy-strategies", "ops-change-management", "testing-pyramid"],
  ),
  L(
    "web-i18n",
    "Internationalization (i18n)",
    "web",
    ["what is internationalization", "how to support multiple languages", "i18n vs l10n", "date timezone formatting"],
    ["i18n", "l10n", "language", "locale", "translation", "translate", "timezone", "unicode", "rtl", "format"],
    "**Internationalization (i18n)** is preparing the software to work in any language and locale; **localization (l10n)** is the actual translation and regional adaptation. Retrofitting i18n is 10× the cost of doing it while building, mostly because of **strings baked into code**.\n\n• **Strings**: all user-facing text (including aria-labels, validation messages, emails, PDFs, error codes) goes through a lookup from day one, in the source language first. Do not concatenate — `\"Hello \" + name + \"!\"` cannot be translated into languages that change word order. Use placeholders with named arguments (`{count} files selected`) and **plural rules** (some languages have 4+ plural forms).\n• **Layout**: translated text is often 30–40% longer, so design for overflow; support **RTL** (Arabic, Hebrew) with logical CSS properties (`margin-inline-start`) rather than per-direction hacks; never bake text into images.\n• **Formats, and this is where bugs live**: dates, numbers, currency and units all come from the locale (`Intl` in JS) — `03/04/2026` is two different days depending on the reader. Store timestamps in UTC, convert for display, and keep the user's timezone as data, not as a guess from the browser.\n• **Unicode hygiene**: normalize and validate at the boundaries, count characters as user-perceived (`Intl.Segmenter`) not UTF-16 units, and expect emoji, combining accents and right-to-left marks in names — a naive `slice()` in the database corrupts profiles.\n\n• **Fallbacks and testing**: missing translation keys must fall back to the source language, never to a blank or a key (`incidents.title.new`); test with a pseudo-locale that exaggerates length, and with real RTL. Add a screenshot check for one long string in CI.",
    "**Internationalization (i18n)** software ko kisi bhi language aur locale ke liye tayyar karta hai; **localization (l10n)** asli translation aur regional adaptation hai. Baad mein i18n thopna banane se 10× mehnga hai, zyadatar **code mein bake strings** ki wajah se.\n\n• **Strings**: har user-facing text (aria-labels, validation messages, emails, PDFs, error codes samet) din-pehle se lookup se aani chahiye, shuru mein source language mein. Concat mat karo — `\"Hello \" + name + \"!\"` un languages mein translate nahi hota jo word order badalte hain. Named arguments wale placeholders (`{count} files selected`) aur **plural rules** (kuch languages mein 4+ plural forms) use karo.\n• **Layout**: translated text aksar 30–40% lamba hota hai, to overflow ke liye design karo; **RTL** (Arabic, Hebrew) support karo logical CSS properties se (`margin-inline-start`), per-direction hacks se nahi; text kabhi image mein bake mat karo.\n• **Formats, aur bugs yahin rehte hain**: dates, numbers, currency aur units sab locale se aane chahiye (JS mein `Intl`) — `03/04/2026` padhne wale ke hisaab se do alag din hai. Timestamps UTC mein store karo, display ke liye convert, aur user ka timezone data ki tarah rakho, browser se guess mat karo.\n• **Unicode hygiene**: boundaries par normalize aur validate karo, characters user-perceived count karo (`Intl.Segmenter`), UTF-16 units nahi, aur names mein emoji, combining accents aur RTL marks expect karo — database mein naive `slice()` profiles corrupt kar deta hai.\n\n• **Fallbacks aur testing**: missing translation key source language par fall back kare, blank ya key (`incidents.title.new`) par nahi; pseudo-locale se test karo jo length exaggerate kare, aur asli RTL se. CI mein ek lambi string ka screenshot check rakho.",
    ["web-cdn", "web-browser-perf", "eng-ways-of-working"],
  ),
  L(
    "web-seo",
    "SEO for web apps",
    "web",
    ["what is seo", "ssr vs csr for seo", "how to make a spa crawlable", "core web vitals"],
    ["seo", "crawl", "crawler", "sitemap", "canonical", "meta", "ssr", "vitals", "ranking", "index"],
    "Search engines answer questions; SEO is making your site a good candidate to be the answer. For an app behind a login, most of the work is on the **public** pages: marketing, docs, status page, help articles.\n\n• **Crawlability**: a crawler does not click buttons or run your JS reliably. Server-render (SSR/SSG) the pages you want indexed; keep real links (`<a href>`) instead of click handlers; provide `sitemap.xml`, `robots.txt`, and clean URLs. An SPA that renders nothing until a bundle loads shows up as an empty page.\n• **The three technical pillars**: *content* — one clear topic per page, real headings, text a human would read; *metadata* — unique `<title>` and description, canonical URL, structured data (JSON-LD) for articles/products/FAQ, and Open Graph tags for sharing; *performance* — Core Web Vitals (LCP, INP, CLS), because slow, jumpy pages lose users and rankings.\n• **Duplicates and history**: a canonical tag prevents `?utm=…` variants from splitting your ranking; 301 redirects (not 302) move equity when URLs change; deleted pages should 410/301, not 200-with-nothing.\n\n• **Honest limits**: SEO is not a substitute for being useful, and paid ads, backlinks and brand searches dominate many queries. Do not block crawlers on staging by accident and do not let them index preview deploys — `noindex` there is a one-line fix for a common self-inflicted wound.\n• **Measure in Search Console**: index coverage, queries, click-through and Core Web Vitals field data — the report tells you which fix matters, unlike guesswork.\n\n• For internal apps, put the effort where it compounds: public status pages and docs are indexed, dashboards are not.",
    "Search engines sawaalon ka jawab dete hain; SEO aapki site ko us jawab ka accha candidate banata hai. Login ke peeche wale app mein zyadatar kaam **public** pages par hai: marketing, docs, status page, help articles.\n\n• **Crawlability**: crawler buttons click nahi karta aur JS bharosemand tarike se nahi chalata. Jinko index karana hai unhe server-render (SSR/SSG) karo; click handlers ki jagah asli links (`<a href>`) rakho; `sitemap.xml`, `robots.txt`, saaf URLs do. Woh SPA jisme bundle load hone tak kuch render nahi hota, empty page dikhta hai.\n• **Teen technical pillars**: *content* — ek page, ek clear topic, asli headings, aisa text jo insaan padhe; *metadata* — unique `<title>` aur description, canonical URL, structured data (JSON-LD) articles/products/FAQ ke liye, aur sharing ke liye Open Graph tags; *performance* — Core Web Vitals (LCP, INP, CLS), kyunki slow aur jumpy pages users aur ranking dono khote hain.\n• **Duplicates aur history**: canonical tag `?utm=…` variants ko ranking todne se rokta hai; URL badalne par 301 redirects (302 nahi) equity le jaate hain; delete pages 410/301 hon, 200-with-kuch-nahi nahi.\n\n• **Imaandar limits**: SEO kaam ki cheez hone ka substitute nahi hai, aur kai queries par paid ads, backlinks aur brand search dominate karte hain. Galti se staging par crawlers block mat karo aur preview deploys index mat hone do — wahan `noindex` ek line ka fix hai.\n• **Search Console mein measure karo**: index coverage, queries, click-through aur Core Web Vitals field data — report batata hai kaunsa fix zaroori hai, guess nahi.\n\n• Internal apps ke liye mehnat wahan lagao jahan compound ho: public status pages aur docs index hote hain, dashboards nahi.",
    ["web-browser-perf", "web-cache-headers", "web-cdn"],
  ),
  // ---------------------------------------------------------------- emerging tech
  L(
    "emerging-quantum-computing",
    "Quantum computing",
    "emerging",
    ["what is quantum computing", "how do qubits work", "will quantum computers break encryption", "quantum vs classical"],
    ["quantum", "qubit", "superposition", "entangle", "shor", "grover", "annealing", "post-quantum"],
    "A classical bit is 0 or 1; a **qubit** holds a state that behaves like a blend of both until measured, and qubits can be **entangled** so their outcomes correlate. That enables algorithms no classical machine can match — for a *narrow* set of problems.\n\n• **What is genuinely faster**: integer factorisation (Shor's algorithm) and discrete-logarithms, which is why \"quantum breaks RSA/ECC\" is a real (if future-dated) statement; unstructured search gives a quadratic speed-up (Grover: 2¹²⁸ → 2⁶⁴); and simulating quantum chemistry/physics, where nature is the computer.\n• **What is not faster**: almost everything else — databases, web servers, machine learning as practised today. A quantum computer is not a faster processor, it is a different instrument.\n• **The hard part is decoherence**: qubits are fragile, so machines need error correction, and one logical qubit can cost thousands of physical ones. Today's devices are noisy, small (hundreds to thousands of physical qubits) and mostly demo-scale; useful cryptographically-relevant machines are an engineering programme, not a product you can schedule.\n\n• **What to do about it now**: inventory where long-lived secrets rely on RSA/ECC and plan **post-quantum cryptography** migration (lattice-based KEMs/signatures are standardised and deploying in browsers today). \"Harvest now, decrypt later\" means data stolen today matters — start with transport, then long-lived keys, and prefer crypto agility in your design.\n• Other plausible near-term uses: quantum-safe key distribution in special networks, optimisation heuristics (no proven advantage yet), and research partnerships. Treat vendor \"quantum AI\" claims with the same scepticism as any other benchmark-free claim.",
    "Classical bit 0 ya 1 hota hai; **qubit** aisi state rakhta hai jo measure hone tak dono ka blend jaisa behave karta hai, aur qubits **entangled** ho sakte hain taaki unke outcomes correlate karein. Isse aise algorithms bante hain jo classical machine match nahi kar sakti — *narrow* problems ke liye.\n\n• **Sach mein fast kya hai**: integer factorisation (Shor's algorithm) aur discrete logarithms, isliye \"quantum RSA/ECC tod dega\" ek asli (chahe future-dated) baat hai; unstructured search quadratic speed-up deta hai (Grover: 2¹²⁸ → 2⁶⁴); aur quantum chemistry/physics simulation, jahan nature hi computer hai.\n• **Fast kya nahi hai**: baaki lagbhag sab — databases, web servers, aaj wala machine learning. Quantum computer tez processor nahi, alag instrument hai.\n• **Mushkil hissa decoherence hai**: qubits nazuk hain, isliye error correction chahiye, aur ek logical qubit hazaaron physical qubits le sakta hai. Aaj ke devices noisy, chhote (hundreds-thousands physical qubits) aur zyadatar demo-scale hain; cryptographically useful machines ek engineering programme hain, schedule karne layak product nahi.\n\n• **Ab kya karna**: inventory karo kahan long-lived secrets RSA/ECC par depend karte hain aur **post-quantum cryptography** migration plan karo (lattice-based KEMs/signatures standardised hain aur aaj browsers mein deploy ho rahe hain). \"Harvest now, decrypt later\" matlab aaj chori hua data bhi maayne rakhta hai — transport se shuru karo, phir long-lived keys, aur design mein crypto agility rakho.\n• Baaki plausible near-term use: special networks mein quantum-safe key distribution, optimisation heuristics (abhi proven advantage nahi), aur research partnerships. Vendor ke \"quantum AI\" claims par wahi scepticism rakho jo kisi benchmark-free claim par rakhte ho.",
    ["security-encryption", "ai-local-vs-api", "perf-latency"],
  ),
  L(
    "emerging-blockchain",
    "Blockchains and smart contracts",
    "emerging",
    ["what is a blockchain", "how does a smart contract work", "when is blockchain useful", "proof of work vs stake"],
    ["blockchain", "block", "chain", "smart", "contract", "consensus", "proof", "stake", "work", "wallet", "defi"],
    "A blockchain is a **replicated append-only ledger** that a set of mutually distrusting parties agree on without one owner. Blocks are batches of transactions, chained by hashes, so changing history means redoing the consensus work.\n\n• **Consensus**: *proof of work* burns electricity to buy the right to propose a block; *proof of stake* makes validators deposit capital that is slashed for misbehaviour. Both aim at the same property: making a rewrite too expensive. Public chains trade throughput and latency for that property — hundreds to thousands of transactions per second, seconds to minutes of finality, versus tens of thousands per second in a normal database.\n• **Smart contracts** are programs that live at an address and run deterministically on every node: money-like logic, tokens, escrow, NFTs, governance. They are also *immutable by default* — bugs are permanent unless the contract was written with an upgrade path, and exploits are irreversible, which is exactly why audits matter and \"move fast\" gets expensive.\n\n• **When it genuinely helps**: no trusted central party exists or all parties must audit the same record — multi-org settlement, supply-chain provenance across competing companies, censorship-resistant payments, verifiable public commitments. When the participants already share an operator (your company's users), a normal database is faster, cheaper, private and far easier to fix.\n\n• If you do build: key management is the security (lose the key, lose the assets; leak it, lose them faster), gas/transaction fees are a product cost, off-chain data needs an oracle you then have to trust, and bridges between chains have been the biggest single source of stolen funds. Assume every public input is hostile and every RPC provider can lie — verify on-chain where it matters.",
    "Blockchain ek **replicated append-only ledger** hai jise kai ek doosre par bharosa na karne wale parties ek owner ke bina agree karte hain. Blocks transactions ke batches hain, hashes se chained — history badalne ka matlab consensus ka kaam dobara karna.\n\n• **Consensus**: *proof of work* block propose karne ka haq bijli jala kar kharidta hai; *proof of stake* validators se capital deposit karwata hai jo misbehaviour par slashed hoti hai. Dono ka target ek hi property: rewrite itna mehnga kar dena ki na ho. Public chains throughput aur latency us property ke liye trade karti hain — hundreds-thousands transactions per second, seconds-minutes finality, jabki normal database mein tens of thousands per second.\n• **Smart contracts** address par rehne wale programs hain jo har node par deterministically chalte hain: money-like logic, tokens, escrow, NFTs, governance. Ye *default se immutable* bhi hain — bugs permanent hain jab tak contract mein upgrade path na ho, aur exploits irreversible, isliye audits maayne rakhte hain aur \"move fast\" mehnga padta hai.\n\n• **Sach mein kahan help karta hai**: koi trusted central party na ho ya sab parties ko wahi record audit karna ho — multi-org settlement, competing companies ke beech provenance, censorship-resistant payments, verifiable public commitments. Jab participants ka operator already ek hi ho (aapki company ke users), normal database tez, sasta, private aur fix karna bahut aasan hai.\n\n• Build karo to: key management hi security hai (key gayi to assets gaye; leak hui to jaldi), gas/fees product cost hai, off-chain data ko oracle chahiye jis par phir bharosa karna padega, aur chains ke beech bridges ab tak sabse bada chori ka source rahe hain. Har public input ko hostile maano aur har RPC provider jhooth bol sakta hai — jahan maayne rakhe wahan on-chain verify karo.",
    ["db-consistency-models", "dist-consensus", "db-event-sourcing"],
  ),
  L(
    "emerging-iot-embedded",
    "IoT and embedded systems",
    "emerging",
    ["what is iot", "what is an embedded system", "how to secure iot devices", "mqtt explained"],
    ["iot", "embedded", "device", "sensor", "mqtt", "firmware", "ota", "edge", "microcontroller", "telemetry"],
    "**Embedded** means software on a device with a job, not a general-purpose computer: a microcontroller, constrained memory, often no screen and sometimes no user. **IoT** is those devices plus connectivity and a backend — the interesting engineering is at the seam.\n\n• **Constraints shape everything**: kilobytes of RAM, battery budgets, intermittent links, a device that may sit behind a NAT with no inbound connection. That is why the device **dials out** (or uses a broker) and why protocols are small: **MQTT** (pub/sub over TCP with QoS levels, the default choice), CoAP/UDP for tighter budgets, LoRaWAN/NB-IoT for long range and tiny data.\n• **Telemetry at scale is a data problem**: a fleet of 10 000 sensors each sending every 10 s is 86 million messages a day. Batch and compress on the device, send deltas, use a time-series store, and give each message an idempotent device+sequence key so retries do not double-count. Rate-limit per device and expect clock skew.\n• **Firmware updates are the lifetime feature**: without **OTA** you cannot patch a security hole in a device for ten years. Sign the images, verify signatures on the device, use A/B partitions with automatic rollback and a staged fleet rollout — a bricked device is a truck roll.\n\n• **Security must assume a hostile physical world**: a device in a customer's building can be opened, dumped and spoofed. Unique per-device keys in a secure element (not one shared key in the firmware image), mutual TLS, revocable identities, no open debug ports in production, and a plan for decommissioning. Attackers have turned IoT fleets into botnets precisely because these basics were skipped.\n• **Design for failure by default**: the network will drop, the backend will be down, the device will reboot. Buffer locally, retry with backoff, and make the backend's APIs idempotent; \"device is offline\" should be a normal state in your model, not an exception in your logs.",
    "**Embedded** matlab aise device par software jiska ek kaam hai, general-purpose computer nahi: microcontroller, kam memory, aksar screen nahi aur kabhi user nahi. **IoT** wo devices plus connectivity aur backend hai — mazedaar engineering isi seam par hoti hai.\n\n• **Constraints sab kuch shape karte hain**: kilobytes RAM, battery budget, intermittent link, NAT ke peeche device jahan inbound connection nahi. Isliye device **bahar dial karta hai** (ya broker use karta hai) aur protocols chhote hote hain: **MQTT** (TCP par pub/sub, QoS levels, default choice), tighter budget ke liye CoAP/UDP, long range aur chhote data ke liye LoRaWAN/NB-IoT.\n• **Scale par telemetry ek data problem hai**: 10 000 sensors har 10 s par bhejein to 8.6 crore messages din mein. Device par batch aur compress karo, deltas bhejo, time-series store use karo, aur har message ko idempotent device+sequence key do taaki retry double count na kare. Per-device rate limit rakho aur clock skew expect karo.\n• **Firmware updates lifetime feature hai**: **OTA** ke bina das saal tak kisi device mein security hole patch nahi kar sakte. Images sign karo, device par signature verify, A/B partitions with automatic rollback aur staged fleet rollout — brick hua device matlab truck roll.\n\n• **Security ko hostile physical duniya maan kar chalo**: customer ki building mein rakha device khola, dump aur spoof kiya ja sakta hai. Per-device unique keys secure element mein (firmware image mein ek shared key nahi), mutual TLS, revocable identities, production mein open debug ports nahi, aur decommissioning ka plan. Attackers ne IoT fleets ko botnet isliye banaya kyunki yahi basics skip hue.\n• **Failure ko default maan kar design karo**: network tootega, backend down hoga, device reboot karega. Locally buffer karo, backoff ke saath retry, aur backend APIs idempotent banao; \"device offline\" aapke model mein normal state ho, logs mein exception nahi.",
    ["sys-linux-basics", "web-tcp", "security-zero-trust"],
  ),
  L(
    "emerging-game-dev",
    "Game development",
    "emerging",
    ["how are games built", "what is a game loop", "unity vs unreal", "why do games need 60 fps"],
    ["game", "games", "loop", "frame", "render", "engine", "shader", "physics", "unity", "unreal", "fps"],
    "A game is a **loop that must finish inside a frame budget**: read input, update the world, render, repeat — 60 times a second, so about **16.6 ms** for everything (16 000 things if you have 1 000 objects). Everything else in game engineering follows from that deadline.\n\n• **Frame-rate independence**: movement is `position += velocity * deltaTime`, not `position += 1`, or the game runs at different speeds on different machines. Cap and smooth the frame time; a long frame (asset load, GC pause, shader compile) is visible as a stutter.\n• **Where the budget goes**: rendering (draw calls, overdraw, fill rate), physics, animation, AI, audio, and the memory traffic between them. Optimisations that matter: batching and instancing sprites/meshes (thousands of draw calls → tens), culling anything off-screen, atlas textures, object pools instead of allocating per frame (GC spikes are a classic stutter source), and level-of-detail for distance.\n• **Engines** (Unity, Unreal, Godot, or a web stack like Three.js/WebGL/WebGPU): they give you rendering, physics, animation, audio, asset pipelines, editors and multi-platform builds. Choose by target platform, team experience and licence terms — for a small 2D game, a lean framework can beat a heavyweight engine.\n\n• **It is a real-time distributed-ish system too**: netcode faces latency, prediction and reconciliation (client predicts, server corrects, interpolation hides jitter), and cheating — never trust the client for anything competitive. Server-authoritative logic with small messages is the usual answer.\n\n• **The web platform is now viable**: WebGL/WebGPU plus WASM runs 3D in a browser with no install, at the cost of longer loads, weaker access to threads and APIs, and a wide hardware spread. If a game runs at 60 fps on mid-range mobile, it will run almost anywhere.\n• Profile on the *slowest* target device from day one — 30 fps discovered at launch is a redesign, not a tweak.",
    "Game ek **loop hai jise frame budget mein poora hona chahiye**: input padho, duniya update karo, render karo, repeat — second mein 60 baar, matlab sab kuch ~**16.6 ms** mein (1 000 objects ho to 16 000 kaam). Game engineering ka baaki sab isi deadline se aata hai.\n\n• **Frame-rate independence**: movement `position += velocity * deltaTime`, `position += 1` nahi, warna game har machine par alag speed se chalta hai. Frame time cap aur smooth karo; ek lamba frame (asset load, GC pause, shader compile) stutter ban kar dikhta hai.\n• **Budget kahan jaata hai**: rendering (draw calls, overdraw, fill rate), physics, animation, AI, audio, aur unke beech memory traffic. Jo optimisations maayne rakhti hain: sprites/meshes ka batching aur instancing (hazaaron draw calls → das), off-screen culling, texture atlases, per-frame allocate ki jagah object pools (GC spikes classic stutter hain), aur distance ke liye level-of-detail.\n• **Engines** (Unity, Unreal, Godot, ya web stack Three.js/WebGL/WebGPU): rendering, physics, animation, audio, asset pipeline, editor aur multi-platform builds dete hain. Target platform, team experience aur licence terms se chuno — chhote 2D game ke liye lean framework bhaari engine se behtar ho sakta hai.\n\n• **Yeh ek real-time (lagbhag distributed) system bhi hai**: netcode mein latency, prediction aur reconciliation (client predict, server correct, interpolation jitter chhupata hai), aur cheating — competitive cheez mein client par kabhi bharosa mat karo. Server-authoritative logic aur chhote messages usual jawab hai.\n\n• **Web platform ab viable hai**: WebGL/WebGPU plus WASM browser mein 3D chalata hai, install ke bina, par load lamba, threads aur APIs tak kam pahunch, aur hardware spread bada. Mid-range mobile par 60 fps chal gaya to lagbhag har jagah chalega.\n• **Sabse slow target device par day one se profile karo** — launch par pata chala 30 fps matlab redesign, tweak nahi.",
    ["perf-latency", "sys-gc-memory", "language-c"],
  ),

  // ---------------------------------------------------------------- computer science fundamentals
  L(
    "cs-data-structures",
    "Data structures and Big-O",
    "fundamentals",
    ["what is a hash table", "how does a hash map work", "array vs linked list", "what is big o notation", "which data structure should i use", 'how does a hash table work', 'what is a hash map'],
    ["hash", "table", "map", "array", "linked", "list", "tree", "graph", "stack", "queue", "heap", "big-o", "complexity", "lookup"],
    "**Big-O** describes how the work grows with the input: `O(1)` constant (hash lookup), `O(log n)` halving (balanced tree, binary search), `O(n)` one pass, `O(n log n)` good sorting, `O(n²)` nested loops over the same data. It ignores constants — which is why an `O(n)` pass over 100 items can beat \"smarter\" code with a bad constant.\n\nThe workhorses and what they are actually good at:\n• **Array / dynamic array**: O(1) index access, cache-friendly, O(n) insert in the middle. The default container — reach for it first.\n• **Hash table** (map/dict): O(1) average lookup, insert, delete by key. Needs a good hash and a sane load factor; worst case O(n) on collisions, and it does not keep order (that is why ordered maps exist).\n• **Linked list**: O(1) insert/remove when you already hold the node, O(n) lookup, poor cache locality. Rarely worth it outside LRU-style structures.\n• **Tree** (balanced BST / B-tree): O(log n) with sorted order and range queries — what database indexes are made of.\n• **Heap**: O(1) peek at the min/max, O(log n) push/pop — priority queues, schedulers, top-k.\n• **Stack / queue**: LIFO/FIFO discipline; queues plus workers are the backbone of any job system.\n\n• Choosing is about the *operations you need most*: lookup by key → hash map; keep it sorted or range-scan → tree; membership over small sets → a plain array scan is often fastest; shortest path or relationships → graph.\n• Two habits that matter more than memorising: measure with your real data sizes (a constant factor can dominate), and know the memory cost — a hash map trades memory for speed, and a tree of small objects costs more than it looks.",
    "**Big-O** batata hai ki input badhne par kaam kaise badhta hai: `O(1)` constant (hash lookup), `O(log n)` aadha-aadha (balanced tree, binary search), `O(n)` ek pass, `O(n log n)` achhi sorting, `O(n²)` same data par nested loops. Yeh constants ignore karta hai — isliye 100 items ka `O(n)` pass kabhi \"samajhdar\" code se fast hota hai jiska constant kharab ho.\n\nKaam ke structures aur wo kis cheez mein achhe hain:\n• **Array / dynamic array**: O(1) index access, cache-friendly, beech mein insert O(n). Default container — pehle yahi lo.\n• **Hash table** (map/dict): average O(1) lookup, insert, delete key se. Achha hash aur sane load factor chahiye; collisions par worst case O(n), aur order nahi rakhta (isliye ordered maps hote hain).\n• **Linked list**: node already haath mein ho to O(1) insert/remove, lookup O(n), cache locality kharab. LRU jaisi cheezon ke alawa aksar worth nahi.\n• **Tree** (balanced BST / B-tree): O(log n) ke saath sorted order aur range queries — database indexes isi se bane hain.\n• **Heap**: min/max peek O(1), push/pop O(log n) — priority queues, schedulers, top-k.\n• **Stack / queue**: LIFO/FIFO discipline; queues plus workers kisi bhi job system ki reedh hain.\n\n• Chunaav us par hai ki kaunse *operations sabse zyada chahiye*: key se lookup → hash map; sorted rakhna ya range scan → tree; chhote set par membership → plain array scan aksar fastest; shortest path ya relationships → graph.\n• Do habits yaad rakhne se zyada maayne rakhti hain: apne asli data sizes par measure karo (constant factor dominate kar sakta hai), aur memory cost jaano — hash map speed ke liye memory trade karta hai, chhote objects ka tree dikhne se mehnga padta hai.",
    ["language-c", "db-indexes", "perf-latency"],
  ),
  L(
    "cs-compilers",
    "How compilers work",
    "fundamentals",
    ["what is a compiler", "compiler vs interpreter", "what is an ast", "how does compilation work"],
    ["compiler", "compile", "lexer", "parser", "ast", "token", "jit", "transpile", "optimise", "bytecode", "linker"],
    "A compiler turns source text into something else that runs — machine code, bytecode, or another language — in stages, and each stage is a separate field of engineering:\n\n1. **Lexing** (tokenise): characters become tokens (`let`, `x`, `=`, `1`, `;`).\n2. **Parsing**: tokens become a syntax tree (**AST**) according to the grammar. This is where syntax errors come from, and where a helpful error message is genuinely hard.\n3. **Semantic analysis**: names, types, scope. \"Undefined variable\", \"type mismatch\" and most IDE squiggles live here.\n4. **IR + optimisation**: an intermediate representation (LLVM IR, bytecode) is rewritten — constant folding, dead code elimination, inlining, vectorisation — mostly *without* changing behaviour.\n5. **Code generation + linking**: emit machine/bytecode, resolve symbols, produce the artefact (`ld`, dynamic linking, relocation).\n\n• **Interpreter vs compiler vs JIT** is a spectrum, not a binary: an interpreter executes the AST/bytecode directly (fast start, slower steady state); a compiler emits code ahead of time (slow start, fast steady state); a **JIT** starts interpreting and compiles the hot paths at runtime (this is the JVM's and V8's answer to \"both\").\n• **Bytecode** is the portable middle: compile once to bytecode, run on any VM that implements it (JVM, CPython, WebAssembly's design).\n• **Transpilers** (TypeScript → JavaScript, Babel, Sass → CSS) are compilers whose target is another high-level language; the pipeline is the same, minus the machine-specific backend.\n\n• Practical consequences you actually feel: the compiler cannot prove things you did not express (types, const, purity), optimisation is limited by undefined behaviour and aliasing, and *the error messages come from whichever stage failed* — so \"why is this SQL query slow\" is a planner problem, not a parser problem.\n• If you are writing one: get the AST right and test the lexer/parser round-trip first; a compiler is a long series of small, testable transformations — which is why it is such a good exercise in clean code.",
    "Compiler source text ko aisi cheez mein badalta hai jo chalti hai — machine code, bytecode ya doosri language — stages mein, aur har stage apne aap mein ek engineering field hai:\n\n1. **Lexing** (tokenise): characters tokens ban jaate hain (`let`, `x`, `=`, `1`, `;`).\n2. **Parsing**: tokens grammar ke hisaab se syntax tree (**AST**) banate hain. Syntax errors yahan se aate hain, aur helpful error message sach mein mushkil kaam hai.\n3. **Semantic analysis**: names, types, scope. \"Undefined variable\", \"type mismatch\" aur IDE ke zyadatar squiggles yahan rehte hain.\n4. **IR + optimisation**: intermediate representation (LLVM IR, bytecode) rewrite hoti hai — constant folding, dead code elimination, inlining, vectorisation — zyadatar *behaviour badle bina*.\n5. **Code generation + linking**: machine/bytecode emit, symbols resolve, artefact banta hai (`ld`, dynamic linking, relocation).\n\n• **Interpreter vs compiler vs JIT** spectrum hai, binary nahi: interpreter AST/bytecode seedha chalata hai (fast start, steady state slow); compiler ahead-of-time code emit karta hai (slow start, fast steady); **JIT** interpret karke hot paths runtime par compile karta hai (JVM aur V8 ka \"dono\" wala jawab).\n• **Bytecode** portable middle hai: ek baar bytecode compile karo, kisi bhi VM par chalao (JVM, CPython, WebAssembly ka design).\n• **Transpilers** (TypeScript → JavaScript, Babel, Sass → CSS) aise compilers hain jinka target doosri high-level language hai; pipeline wahi hai, bas machine-specific backend nahi.\n\n• Practical nateeje jo feel hote hain: compiler wo cheezein prove nahi kar sakta jo aapne express nahi ki (types, const, purity), optimisation undefined behaviour aur aliasing se limited hai, aur *error messages us stage se aate hain jo fail hui* — isliye \"SQL query slow kyun hai\" planner ki problem hai, parser ki nahi.\n• Khud likh rahe ho to: pehle AST sahi karo aur lexer/parser round-trip test karo; compiler chhote, testable transformations ki lambi series hai — isliye yeh clean code ki itni acchi exercise hai.",
    ["language-compiled-interpreted", "language-c", "language-java-jvm"],
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
  // Tokens come from `normalise`, not `clean`: punctuation must already be gone, or "redis kaise
  // kaam karta hai?" leaves "hai?" behind and stops looking like a one-word question.
  const words = normalise(question)
    .trim()
    .split(' ')
    .filter((word) => word.length >= 3 && !QUESTION_FILLERS.has(word));
  if (words.length !== 1) return null;
  const [word] = words;
  if (!word) return null;
  const candidates = TECH_FACTS.filter((fact) => fact.keywords.some((keyword) => keyword === word || keyword === `${word}s`));
  if (candidates.length === 1) return candidates[0]!;
  // The topic whose *title* is the word ("CDNs" for "cdn", "Redis" for "redis") is the one being asked
  // about — a topic that only mentions the word in an alias can never win that comparison.
  const titled = candidates.filter((fact) => {
    const first = normalise(fact.title).trim().split(' ')[0] ?? '';
    return first === word || first === `${word}s` || first.replace(/s$/, '') === word;
  });
  if (titled.length === 1) return titled[0]!;
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

/** Words that show up in every other question ("what is a good..."), so they never *suggest* a topic. */
const GENERIC_WORDS = new Set([
  'good', 'best', 'better', 'bad', 'worse', 'right', 'wrong', 'fast', 'slow', 'easy', 'hard',
  'simple', 'complex', 'new', 'old', 'same', 'different', 'first', 'last', 'next', 'more', 'less',
  'many', 'much', 'large', 'small', 'help', 'need', 'want', 'make', 'take', 'give', 'know', 'think',
  'type', 'kind', 'thing', 'stuff', 'time', 'people', 'team', 'code', 'data', 'user', 'users',
]);

/**
 * Closest topics to a question the pack does *not* cover.
 *
 * The unknown answer is honest ("I do not have that one"), but a dead end is not helpful — when the
 * question shares real vocabulary with a topic (`gpu`, `embedding`, `partition`) we point at the
 * nearest entries instead of leaving the member with nothing. This is a *hint*, never an answer: it
 * is only consulted after `matchTechFact` has already refused, and a match is never promoted to an
 * answer on the strength of it.
 */
export function suggestTechTopics(question: string, count = 3): TechFact[] {
  const haystack = normalise(question);
  const words = new Set(
    clean(question)
      .split(' ')
      .filter((word) => word.length >= 4 && !QUESTION_FILLERS.has(word) && !GENERIC_WORDS.has(word))
      .flatMap((word) => [word, word.replace(/s$/, '')]),
  );
  const ranked = TECH_FACTS.map((fact) => {
    let score = 0;
    // A word the topic claims as its own ("gpu", "partition") is the strongest hint.
    for (const keyword of fact.keywords) if (hasPhrase(haystack, keyword)) score += keywordWeight(keyword);
    // Partial alias overlap: "how do I shard a table?" shares "shard" with a two-word alias.
    for (const alias of fact.aliases) {
      const parts = clean(alias).split(' ').filter((word) => word.length >= 4);
      if (parts.length < 2) continue;
      const hits = parts.filter((word) => words.has(word) || words.has(word.replace(/s$/, ''))).length;
      if (hits > 0) score += hits * 2;
    }
    for (const titleWord of clean(fact.title).split(' ')) if (titleWord.length >= 5 && words.has(titleWord)) score += 2;
    return { fact, score };
  })
    .filter((entry) => entry.score >= 1)
    .sort((a, b) => b.score - a.score || a.fact.id.localeCompare(b.fact.id));
  return ranked.slice(0, count).map((entry) => entry.fact);
}

/** The ways engineers join two topics in one question. `and`/`or` are here on purpose: "difference
 * between caching and CDN" is the same question as "caching vs CDN". */
const COMPARISON_SEPARATOR = /\s+(?:vs\.?|versus|or|and)\s+/i;

/**
 * Two different pack topics named side by side: "redis vs postgres", "how do load balancers and
 * caching differ?". Only exact split points count, only recognised topics qualify, and both sides
 * must resolve to *different* entries — when a single entry already covers both (REST vs GraphQL,
 * Docker vs Kubernetes) its own text is the better answer than an artificial stitch of two.
 */
export function matchTechComparison(question: string): { left: TechFact; right: TechFact } | null {
  const parts = question.split(COMPARISON_SEPARATOR);
  if (parts.length !== 2) return null;
  const leftPart = (parts[0] ?? '').trim();
  const rightPart = (parts[1] ?? '').trim();
  // A clause on either side ("...whatever we should do tonight") is not a topic name.
  if (leftPart.split(' ').length > 8 || rightPart.split(' ').length > 8) return null;
  const left = matchComparisonSide(leftPart);
  const right = matchComparisonSide(rightPart);
  if (!left || !right || left.fact.id === right.fact.id) return null;
  return { left: left.fact, right: right.fact };
}

/**
 * Match one side of a comparison, tolerating the clause engineers add after the topic name:
 * "redis vs postgres — which should I use?" still ends the right side on "postgres".
 */
function matchComparisonSide(side: string): TechMatch | null {
  const direct = matchTechFact(side);
  if (direct) return direct;
  const words = side.split(/\s+/).filter(Boolean);
  for (let end = words.length - 1; end >= 1; end -= 1) {
    const match = matchTechFact(words.slice(0, end).join(' '));
    if (match) return match;
  }
  return null;
}

/** The usable core of one entry: its definition paragraph plus its first bullets. */
function digest(fact: TechFact, locale: 'en' | 'hi', bullets = 2): string {
  const blocks = (locale === 'hi' ? fact.hi : fact.en)
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean);
  const lead = blocks[0] ?? fact.title;
  const points = blocks.filter((block) => block.startsWith('•')).slice(0, bullets);
  return [lead, ...points].join('\n');
}

/**
 * Side-by-side answer for a comparison question.
 *
 * It is a *composition of two pack entries*, not a generated verdict: each side keeps its own
 * wording, and the closing line says so. That is the honest version of a comparison at zero vendor
 * cost — quoting both halves of the question with their own trade-offs instead of inventing one.
 */
export function techComparisonDigest(left: TechFact, right: TechFact, locale: 'en' | 'hi'): string {
  const heading =
    locale === 'hi'
      ? `**${left.title}** aur **${right.title}** — dono mere built-in tech pack mein hain, to dono ka apna summary neeche hai.`
      : `**${left.title}** and **${right.title}** — both are in my built-in tech pack, so here is each one's own summary.`;
  const closing =
    locale === 'hi'
      ? '• Kya chunna hai yeh upar wale trade-offs par depend karta hai — main dono pack entries quote kar raha hoon, apna verdict bana kar nahi de raha.'
      : '• Which one to pick depends on the trade-offs above — I am quoting both pack entries rather than inventing a verdict.';
  const body = [left, right].map((fact) => `**${fact.title}**\n${digest(fact, locale)}`).join('\n\n');
  return `${heading}\n\n${body}\n\n${closing}`;
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
  distributed: 'distributed systems',
  data: 'data & analytics',
  emerging: 'emerging tech',
  fundamentals: 'computer science fundamentals',
};

export const TECH_PACK_STATS = {
  topics: TECH_FACTS.length,
  categories: [...new Set(TECH_FACTS.map((fact) => fact.category))],
} as const;
