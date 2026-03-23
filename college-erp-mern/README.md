# College ERP Web System

## What this project does
This is the primary College ERP web application built with MERN.
It supports manual ERP usage for administrators and students (login, profile, results, documents, events, holidays, notices), and also exposes secure API-key endpoints used by the companion mobile app.

## How to run

### Prerequisites
- Node.js 18+
- Local MongoDB running at `mongodb://localhost:27017` (or set `MONGO_URI`)

### Start backend
```bash
cd server
npm install
node index.js
```

### Start frontend
```bash
cd client
npm install
npm run dev
```

### Seed demo data
- Open the web app and click the seed button on landing page, or call `POST /api/seed`.

## URLs
- ERP Frontend: `http://localhost:5173`
- ERP Backend: `http://localhost:5000`
- API Base: `http://localhost:5000/api`

## Login information

### Admin
- Email: `admin@vit.edu.in`
- Password: `admin123`

### Students (seeded)
- `vicky@vit.edu.in` / `student123`
- `mayuresh@vit.edu.in` / `student123`
- `parag@vit.edu.in` / `student123`
- `sunil@vit.edu.in` / `student123`
- `rohit@vit.edu.in` / `student123`

## Database
- Primary DB: MongoDB
- Default connection: `mongodb://localhost:27017/college_erp`
- Main collections: users, results, documents, documentrequests, events, holidays, notices

## API summary

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`

### User API key management
- `GET /api/account/api-key/status`
- `POST /api/account/api-key/generate`
- `DELETE /api/account/api-key/revoke`

### API-key endpoints (for companion app)
- `GET /api/public/me`
- `GET /api/public/marks?semester=5`
- `GET /api/public/events`
- `GET /api/public/holidays`
- `POST /api/public/documents/request`
- `GET /api/public/documents/requests`

### ERP administration & student operations
- Students, results, documents, events, holidays, notices, admin stats, seed endpoint

## Security notes
- JWT auth for ERP sessions
- API key auth for companion integration
- API keys stored hashed (SHA-256 + salt)
- Password hashing with bcrypt
- Rate limiting on API routes
