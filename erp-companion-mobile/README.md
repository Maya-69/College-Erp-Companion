# Companion App (Mobile + Companion Backend)

## What this project does
This is the companion application layer for the ERP system.
It includes:
- A React Native mobile app (`erp-companion-mobile`) for quick student actions.
- A separate companion backend (`erp-companion-app`) that manages app accounts and securely proxies ERP API-key calls.

The companion system does not access ERP MongoDB directly.

## How to run

### 1) Start ERP backend (required)
```bash
cd ../college-erp-mern/server
node index.js
```

### 2) Start companion backend
```bash
cd ../erp-companion-app
npm install
npm run start
```

### 3) Start mobile app
```bash
cd ../erp-companion-mobile
npm install
npm run start
```

For physical phones, use:
```bash
npm run start:tunnel
```

## URLs
- ERP backend API: `http://localhost:5000`
- Companion backend API: `http://localhost:5001`
- Expo dev server: usually `http://localhost:8081`

## Login information

### Mobile app account
- Created inside app (register flow)
- Separate from ERP account

### ERP account (for generating API key)
- Example student: `vicky@vit.edu.in` / `student123`
- Generate API key in ERP web, then paste in mobile app.

## Database

### Companion backend local data files
- `erp-companion-app/server/data/companion-users.db`
- `erp-companion-app/server/data/companion-tokens.db`
- `erp-companion-app/server/data/companion-audit.db`

### ERP database
- Remains in ERP project MongoDB only.

## First launch flow
1. Enter Companion URL and ERP URL.
2. Register or log in app account.
3. Enter ERP API key.
4. Use sections: Events Calendar, Marksheet, Document.

## Troubleshooting
- If Expo Go fails/white screen: run `npm run start:tunnel`.
- If port conflict occurs: stop old process using that port and restart.
- If backend says `EADDRINUSE` on `5001`, another companion backend is already running.
