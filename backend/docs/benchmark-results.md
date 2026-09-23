# Local API benchmark

Windows, Python 3.13.8, PostgreSQL 18, loopback; one worker, httpx ASGI transport; LLM disabled. Full canonical dataset (200 employees, 60 skills, 40 events, 2743 history records) plus synthetic demo. Imported employee used for calculations.

10 sequential samples after one warm-up per route. Includes auth and SQL; excludes network transport and startup. This is a local measurement, not an SLA.

| Route | Median ms | Max ms |
|---|---:|---:|
| GET /me | 3.89 | 4.07 |
| GET /me/career-map | 6.91 | 8.33 |
| GET /activities | 4.70 | 4.95 |
| POST /recommendations | 30.04 | 32.41 |
