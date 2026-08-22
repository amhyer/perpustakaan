# Performance Monitoring Guide

Cara monitor performance Perpustakaan Jendela Ilmu di production.

## 📊 Web Vitals

Aplikasi otomatis track Core Web Vitals:

| Metric | Deskripsi | Target |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Waktu render konten utama | < 2.5s (good), < 4s (poor) |
| **INP** (Interaction to Next Paint) | Responsivitas interaksi | < 200ms (good), < 500ms (poor) |
| **CLS** (Cumulative Layout Shift) | Stabilitas visual | < 0.1 (good), < 0.25 (poor) |
| **FCP** (First Contentful Paint) | First paint | < 1.8s (good), < 3s (poor) |
| **TTFB** (Time to First Byte) | Server response | < 800ms (good), < 1.8s (poor) |

Dikirim ke `/api/analytics/vitals` via `navigator.sendBeacon` (reliable).

## 🔍 Server-side Logging

### Format

Production: JSON ke stdout
```json
{
  "timestamp": "2026-08-22T10:00:00.000Z",
  "level": "INFO",
  "message": "Book created",
  "bookId": "clx123",
  "userId": "user-1"
}
```

Development: Pretty dengan colors
```
[INFO] 2026-08-22T10:00:00.000Z Book created { bookId: "clx123", userId: "user-1" }
```

### Log Levels

Set via env: `LOG_LEVEL=DEBUG|INFO|WARN|ERROR|FATAL`

| Level | When to use |
|---|---|
| DEBUG | Detailed info untuk development |
| INFO | General operational events |
| WARN | Unexpected tapi recoverable |
| ERROR | Failures yang butuh attention |
| FATAL | Critical failures |

### Log Aggregation

Untuk production, redirect stdout ke:
- **GCP**: Cloud Logging
- **AWS**: CloudWatch Logs
- **Self-hosted**: Loki + Promtail
- **SaaS**: BetterStack, Logtail, Datadog

Contoh `docker-compose` untuk logging:
```yaml
services:
  app:
    # ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 📈 Database Performance

### Query Monitoring

Tambah `prisma.$on('query')` di `src/lib/db.ts` untuk log slow queries:

```typescript
prisma.$on("query", (e) => {
  if (e.duration > 100) {
    // Log slow query (> 100ms)
    console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
  }
});
```

### Index Analysis

Gunakan `EXPLAIN` untuk analyze query:

```sql
EXPLAIN QUERY PLAN
SELECT * FROM Loan
WHERE status = 'OVERDUE' AND dueDate < datetime('now');
```

Expected: Using index `idx_status_dueDate`.

### Database Size Monitoring

```bash
# Current size
ls -lh /var/lib/perpustakaan/data.db

# Table sizes (SQLite)
sqlite3 data.db "SELECT name, SUM(pgsize) FROM dbstat GROUP BY name ORDER BY 2 DESC LIMIT 10;"

# Vacuum (defragment)
sqlite3 data.db "VACUUM;"
```

## 🚀 Response Time Tracking

Setiap API route instrumented dengan `startTimer()`:

```typescript
export async function GET() {
  const timer = startTimer("GET /api/books");
  // ... do work
  timer.end({ count: books.length });
}
```

Cari slow endpoints:
```bash
# Filter log untuk slow operations
journalctl -u perpustakaan | grep "durationMs.*[5-9][0-9][0-9][0-9]"
```

## 🛠️ Profiling Tools

### 1. Database

```bash
# Enable query logging di dev
DATABASE_URL=file:./db/dev.db bun run dev

# Profile query
bunx prisma studio  # GUI inspector
```

### 2. Backend

```bash
# CPU/heap profiling dengan clinic.js
bun add -d clinic
clinic doctor -- bun run dev
clinic flame -- bun run dev  # Generate flame graph
```

### 3. Frontend

Chrome DevTools:
- Lighthouse (Performance audit)
- Performance tab (Record runtime)
- Network tab (Analyze requests)

Bundle analysis:
```bash
ANALYZE=true bun run build
```

### 4. Real User Monitoring (RUM)

Built-in via `web-vitals`. Untuk analytics dashboard:

```bash
# Option 1: PostHog (open source)
# Option 2: Plausible Analytics (privacy-friendly)
# Option 3: Google Analytics 4
```

## 📊 SLO / SLA

| Component | Target | Measurement |
|---|---|---|
| API response (p95) | < 500ms | Application log + APM |
| API response (p99) | < 2s | Application log + APM |
| LCP (p75) | < 2.5s | Web Vitals |
| Uptime | 99.5% | Uptime monitoring |
| Database queries (p95) | < 50ms | Prisma query log |

## 🔔 Alerting

Setup alerts untuk:

| Alert | Condition | Severity |
|---|---|---|
| API down | 5xx > 10/min | Critical |
| Slow response | p95 > 2s for 5min | Warning |
| Database locked | Connection errors | Critical |
| Disk full | Usage > 90% | Critical |
| Memory leak | RSS > 1GB | Warning |
| High error rate | Errors > 1% of requests | Warning |

### Tools:
- **Grafana + Prometheus** (self-hosted)
- **BetterStack** (SaaS, murah)
- **UptimeRobot** (uptime only, free)

## 🧪 Load Testing

Gunakan `k6` atau `autocannon` untuk stress test:

```bash
# Install k6
brew install k6

# Test login endpoint (100 VU, 30s)
k6 run --vus 100 --duration 30s - <<EOF
import http from 'k6/http';
export default function () {
  http.post('https://perpustakaan.sekolah.sch.id/api/auth/login',
    JSON.stringify({ email: 'test@school.id', password: 'test' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
EOF
```

Expected results:
- p95 < 500ms
- Error rate < 1%
- Throughput > 100 req/s (single instance)

## 📈 Capacity Planning

| Concurrent users | Spec | Cost (IDR) |
|---|---|---|
| < 50 | VPS 1GB | 50-100rb |
| 50-200 | VPS 2GB | 100-200rb |
| 200-500 | VPS 4GB | 200-400rb |
| 500-2000 | 2x VPS + Load Balancer | 500-1000rb |
| 2000+ | Multi-instance + PostgreSQL | 1-3jt |

## 🎯 Optimization Checklist (Quarterly)

- [ ] Review slow query log
- [ ] Update database indexes
- [ ] Verify cache hit rate > 80%
- [ ] Check bundle size (target < 200KB JS gzipped)
- [ ] Lighthouse score > 90
- [ ] Error rate < 0.5%
- [ ] No N+1 queries
- [ ] Database VACUUM

---

**Monitor dulu, optimize kemudian.** 📊
