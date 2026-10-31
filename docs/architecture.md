# Brightloop architecture

## System context

Brightloop is a multi-role SaaS billing platform. Admin and staff use the internal dashboard; customers use a constrained portal over the same versioned REST API. MongoDB is the system of record. Redis/BullMQ handles durable asynchronous billing, email, PDF, and retry work; cron only enqueues due work.

```text
React/Vite SPA -> Express API -> MongoDB Atlas
                         |          |
                         |          -> Object storage (invoice PDFs, optional)
                         -> Redis/BullMQ workers -> SMTP provider
                                      ^
                              cron enqueues jobs
```

## Code boundaries

- `routes`: HTTP routing and middleware composition only.
- `controllers`: validated request/response adaptation only.
- `services`: transactional business use-cases and calculations.
- `models`: schemas, indexes, and persistence concerns only.
- `validators`: request schemas; client validation is UX only, never trust.
- `jobs`: idempotent processors. No in-memory timer is a billing correctness dependency.

## Security and deployment

The request pipeline applies rate limiting, Helmet, body limits, cookie parsing, sanitization, CORS allowlisting, authentication, role/ownership checks, then service calls. Financial mutations use Mongo sessions, audit logs, and safe centralized errors.

- Frontend: Vercel static hosting.
- API and worker: independently scalable Render/Railway/AWS services.
- MongoDB Atlas: replica set required for transactions.
- Managed Redis: BullMQ queues, delayed jobs, and deduplication.
- Operations: structured logs, error tracking, queue failure alerts, uptime checks, and daily billing reconciliation.

## Folder structure

`client/src/{components,features,layouts,lib,pages,services,store,styles}`

`server/src/{config,controllers,jobs,middleware,models,routes,services,templates,utils,validators}`
