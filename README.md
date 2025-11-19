# SecureShare – Zero-Knowledge Secret Sharing (Mobile + Server)

SecureShare is a mobile-first app with a Node.js backend for zero-knowledge, one-time secret sharing. Secrets are encrypted on-device; the server stores only ciphertext with expiry in Redis.

## Stack

- Mobile app: React Native (Expo)
- Server: Node.js + Express
- Storage: Redis (TTL, ephemeral)
- Crypto (client): AES-256-CBC (crypto-js) with random key + IV generated on-device (expo-random)

## Features (MVP)

- Client-side AES-256 encryption, server never sees plaintext or key
- One-time retrieval: server deletes secrets on first read (GETDEL)
- Expiration: configurable TTL enforced by Redis
- Share link: includes only the decryption key in the URL fragment (never sent to server)
- QR code for sharing, paste/scan to view
- Optional biometric gate before showing decrypted content
- Optional offline viewing by storing decrypted secret in device secure storage

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Redis 6.2+ (for GETDEL) via Homebrew or Docker
- Xcode Simulator and/or Android Emulator (or a physical device with Expo Go)

### 1) Start Redis

Using Docker (recommended):

```sh
# macOS zsh
docker run --name secureshare-redis -p 6379:6379 -d redis:7-alpine
```

or with Homebrew:

```sh
brew install redis
brew services start redis
```

### 2) Run the server

```sh
cd server
cp .env.sample .env
npm install
npm run dev
```

- Server starts at http://localhost:4000

### 3) Run the mobile app (Expo)

```sh
cd ../app
npm install
npm run start
```

- Use Expo Go on your device or an emulator to open the app.
- The app assumes API_URL=http://localhost:4000 by default. To use a device on the same Wi‑Fi network, set API_URL in `app/app.config.js` to your machine’s LAN IP (e.g., http://192.168.1.10:4000) and restart.

---

## How it works

1. Create Secret

   - App generates random 32-byte key and 16-byte IV
   - App encrypts plaintext with AES-256-CBC and sends only {cipherText, iv, ttl} to the server
   - Server stores payload in Redis with TTL and returns an id
   - App builds share URL: `${BASE}/s/${id}#key=<key-b64>:<iv-b64>` (key stays in the fragment and is never sent to the server)

2. View Secret

   - Recipient opens app and pastes URL (or scans QR)
   - App extracts id and key/iv from the fragment, fetches ciphertext once, and decrypts locally
   - Server DELETEs atomically on first read (GETDEL) and Redis TTL cleans up expired entries

3. Optional: Offline viewing & biometrics
   - After decrypting, user can store plaintext into Secure Storage
   - Viewing can be gated behind Face ID/Touch ID using expo-local-authentication

---

## API

- POST /api/secret

  - body: { cipherText: string, iv: string, expiresIn?: number }
  - response: { id: string, expiresAt: number }

- GET /api/secret/:id
  - response: { cipherText: string, iv: string }
  - Side-effect: atomically deletes the entry (one-time)

---

## Security Notes

- Use HTTPS in production for both server and any hosted web endpoints.
- AES-256-CBC is used here for broad RN compatibility. For production-grade authenticated encryption, prefer AES-256-GCM or libsodium (XSalsa20-Poly1305) and include an auth tag. If using GCM, ensure a supported implementation in your RN stack.
- Never log ciphertexts, IVs, or keys in production logs.

---

## Next Steps

- Switch to AES-256-GCM or secretbox for AEAD
- Add rate limiting / abuse protection and audit logs
- Implement deep linking and hosted web fallback page for /s/:id
- Add organization/team vaults and bulk secret generation
- Push notifications for secret access events (sender opt-in)

---

## License

This project is provided for educational purposes. Adapt and review security choices before production.
