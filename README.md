# College ERP System

A comprehensive educational resource planning platform with web, mobile, and companion app components. Designed for modern college administration with role-based access (admin/student), document management, grading, and event coordination.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    College ERP MERN Stack                   │
│            (Web Admin Portal + Student Dashboard)           │
│  - MongoDB + Express + React (Vite) + Node.js              │
│  - Port 5000 (API), 5173 (Frontend)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP API (JWT + API-key auth)
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────────┐   ┌─────▼────────────────┐
│ Companion App    │   │ Mobile Expo App      │
│ (Backend)        │   │                      │
│ Node + NeDB      │   │ React Native SDK 54  │
│ Port 5001        │   │ Port 8081 (Metro)    │
└────────────────┬─┘   └──────────────────────┘
                 │
                 └─────────────────────────────────┐
                           │ Proxies & Caches     │
                           └──────────────────────┘
```

## Folders

| Folder | Purpose |
|--------|---------|
| **college-erp-mern** | Main web ERP with admin panel and student dashboard |
| **erp-companion-app** | Express backend for mobile app (bridges mobile ↔ ERP) |
| **erp-companion-mobile** | Expo React Native mobile app |

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **ERP Web (Main System)**
   ```bash
   cd college-erp-mern
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

2. **Companion Backend**
   ```bash
   cd erp-companion-app
   npm install
   ```

3. **Mobile App**
   ```bash
   cd erp-companion-mobile
   npm install
   ```

### Running

**Terminal 1 - ERP Backend:**
```bash
cd college-erp-mern/server
node index.js
# API running on http://localhost:5000
```

**Terminal 2 - ERP Frontend:**
```bash
cd college-erp-mern/client
npm run dev
# Frontend on http://localhost:5173
```

**Terminal 3 - Companion Backend:**
```bash
cd erp-companion-app
npm start
# Companion on http://localhost:5001
```

**Terminal 4 - Mobile (optional):**
```bash
cd erp-companion-mobile
npm start
# Metro Bundler opens, scan QR code with Expo Go
```

## Default Login Credentials

### Admin
- Email: `admin@vit.edu.in`
- Password: `admin123`

### Students (Seeded)
- `mayuresh@vit.edu.in` / `student123`
- `sunil@vit.edu.in` / `student123`
- `parag@vit.edu.in` / `student123`
- `rohit@vit.edu.in` / `student123`
- `vicky@vit.edu.in` / `student123`

## Features

### Admin Dashboard
- Student management (CRUD)
- Result/marksheet entry
- Document issuance
- Document request approval/rejection
- Event & holiday management
- Notices & announcements

### Student Portal
- View results and marksheets
- Apply for documents (bonafide, transcript, etc.)
- Track document request status
- View events and holidays
- Generate& manage API keys

### Mobile App (Companion)
- Cross-platform access (Expo Go or dev build)
- Offline support (local NeDB caching)
- Secure token storage
- Document request submission
- Marksheet viewing
- Calendar of events/holidays

## Database

- **ERP DB**: MongoDB (collections: users, results, documents, documentrequests, events, holidays, notices)
- **Companion DB**: NeDB files (local persistence in `server/data/`)
- Default MongoDB URI: `mongodb://localhost:27017/college_erp`

## Architecture Principles

- **API-Only Integration**: Systems communicate exclusively via HTTP APIs
- **Data Isolation**: Each app maintains its own database (no direct DB sharing)
- **Security**: JWT for web auth, API-key (SHA-256 hashed) for companion/mobile
- **Portability**: Companion data paths use absolute paths (`__dirname`-based)

## Key Endpoints

### Public (API-key auth)
- `GET /api/public/me` — Student profile
- `GET /api/public/marks?semester=N` — Marks by semester
- `GET /api/public/events` — Events list
- `GET /api/public/holidays` — Holidays list
- `POST /api/public/documents/request` — Submit document request
- `GET /api/public/documents/requests` — My document requests

### Admin (JWT + admin role)
- `GET /api/admin/document-requests` — All pending/approved/rejected requests
- `PATCH /api/admin/document-requests/:id` — Update request status
- `POST /api/documents` — Issue document
- `GET /api/documents` — View issued documents
- `/api/admin/stats` — Dashboard stats

### Student (JWT)
- `GET /api/results` — Personal results
- `POST /api/account/api-key/generate` — Generate API key
- `DELETE /api/account/api-key/revoke` — Revoke API key

## For Developers

- **ERP Server**: Node.js + Express + MongoDB with Mongoose ORM
- **ERP Client**: React 18 + Vite (fast HMR) + CSS-in-JS styling
- **Companion Server**: Express + NeDB (file-based DB, no external dependencies)
- **Mobile**: Expo SDK 54 + React Native with SecureStore & WebSocket support

All three need to run simultaneously for full functionality. Use separate terminals/tmux sessions.

## Security Notes

- API keys are SHA-256 hashed + salted before storage
- JWT tokens expire in 7 days
- Admin endpoints protected with role-based middleware
- Student can only see their own data (row-level filtering)
- Sensitive fields stripped from responses (passwords never sent)

