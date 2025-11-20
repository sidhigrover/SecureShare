# SecureShare Server

Environment variables:

- PORT: default 4000
- REDIS_URL: redis://localhost:6379 or memory:// for in-memory dev fallback
- CORS_ORIGINS: comma-separated list, default allows all in dev

Dev quickstart:

```sh
cp .env.sample .env
# Optionally use memory store
# echo "REDIS_URL=memory://" >> .env
npm install
npm run dev
```
