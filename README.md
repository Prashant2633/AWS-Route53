# AWS Route 53 Console Clone

[🚀 Live Demo](https://aws-route53-tau.vercel.app)

A clone of the AWS Route 53 Console built with Next.js, FastAPI, and SQLite. It supports full CRUD operations on DNS Hosted Zones and records with routing policies (Simple, Weighted, Latency, Failover), search, pagination, dark/light modes, keyboard shortcuts, bulk operations, and BIND zone file import/export.

---

## Project Structure

```
ScalerAiLabs/
├── backend/
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── dashboard.py
│   │   ├── records.py
│   │   └── zones.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── route53.db
│   └── seed.py
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── health-checks/
│   │   │   └── page.tsx
│   │   ├── hosted-zones/
│   │   │   ├── [zoneId]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── profiles/
│   │   │   └── page.tsx
│   │   ├── resolver/
│   │   │   └── page.tsx
│   │   ├── traffic-policies/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Breadcrumb.tsx
│   │   ├── ComingSoon.tsx
│   │   ├── ConfirmDeleteModal.tsx
│   │   ├── DataTable.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── Modal.tsx
│   │   ├── Notification.tsx
│   │   ├── Pagination.tsx
│   │   ├── Providers.tsx
│   │   ├── SearchInput.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.tsx
│   │   └── validators.ts
│   └── package.json
├── .gitignore
└── README.md
```

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript), Tailwind CSS, React Query (TanStack Query)
- **Backend**: FastAPI (Python), SQLAlchemy 2.0 (Async), Uvicorn
- **Database**: SQLite (asynchronous via `aiosqlite`)

---

## Architecture

The application is built using a decoupled Client-Server Architecture:

```
+-----------------------------------+
|       Next.js Web Client          |  <-- (Port 3000)
+-----------------------------------+
                 |
        JSON HTTP Requests
        Authorization: Bearer <JWT>
                 v
+-----------------------------------+
|       FastAPI Python Server       |  <-- (Port 8000)
+-----------------------------------+
                 |
        Async SQL Queries
        (SQLAlchemy + aiosqlite)
                 v
+-----------------------------------+
|     SQLite Database (route53.db)  |
+-----------------------------------+
```

- **Frontend**: State caching, automatic refetching, and mutations are handled by React Query. Custom CSS variables are defined in globals.css to support light/dark modes.
- **Backend**: Uses SQLAlchemy async sessions with aiosqlite for database operations. Enforces request/response schemas using Pydantic v2.

---

## Workflow

1. **Login**: User enters credentials (`admin` / `password123`). The backend verifies the password hash, issues a JWT, and the frontend stores it in localStorage.
2. **Create Hosted Zone**: User adds a domain name. The backend validates the format, creates the zone, and automatically adds default `NS` and `SOA` records.
3. **Manage DNS Records**: User creates, edits, or deletes records (A, CNAME, MX, etc.). The backend validates value formats and CNAME coexistence rules.
4. **Configure Routing**: User selects a routing policy (Simple, Weighted, Latency, Failover) and provides the required fields (such as Weight, Region, or Failover status).
5. **Import / Export**: User can import records by pasting BIND zone file content, or export records as a BIND `.zone` file or JSON backup.

---

## Database Schema

The database consists of three tables in `route53.db`:

### 1. `users` Table
Stores user credentials for authentication.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Primary Key | Unique UUID |
| `username` | VARCHAR | Unique, Not Null | User login identifier |
| `password_hash`| VARCHAR | Not Null | Bcrypt hashed password |
| `created_at` | VARCHAR | Default: Current Time| Timestamp of registration |

### 2. `hosted_zones` Table
Stores DNS hosted zones.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Primary Key | Unique UUID |
| `name` | VARCHAR | Unique, Not Null | Domain name (e.g., `example.com`) |
| `type` | VARCHAR | Not Null | `Public` or `Private` |
| `comment` | VARCHAR | Nullable | Optional description |
| `record_count` | INTEGER | Default: 0 | Cached count of associated DNS records |
| `created_at` | VARCHAR | Default: Current Time| Timestamp of creation |

### 3. `dns_records` Table
Stores DNS records with cascade deletion when a hosted zone is deleted.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Primary Key | Unique UUID |
| `zone_id` | VARCHAR | Foreign Key -> `hosted_zones.id` (ON DELETE CASCADE) | Owner hosted zone |
| `name` | VARCHAR | Not Null | Record name (e.g., `www`) |
| `type` | VARCHAR | Not Null | `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `PTR`, `SRV`, `CAA` |
| `ttl` | INTEGER | Default: 300 | Time To Live in seconds |
| `value` | VARCHAR | Not Null | Target IP, hostname, or text value |
| `routing_policy`| VARCHAR | Default: `Simple` | `Simple`, `Weighted`, `Latency`, `Failover` |
| `weight` | INTEGER | Nullable (0-255) | Used for Weighted routing |
| `region` | VARCHAR | Nullable | Used for Latency routing |
| `failover` | VARCHAR | Nullable | `PRIMARY` or `SECONDARY` |
| `created_at` | VARCHAR | Default: Current Time| Timestamp of creation |
| `updated_at` | VARCHAR | Default: Current Time| Timestamp of last modification |

---

## API Endpoints

All API responses are wrapped in a standard JSON envelope:
```json
{
  "data": null,
  "message": "Status message",
  "error": null
}
```

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticates user and returns JWT.
- `POST /api/auth/logout`: Invalidates session.
- `GET /api/auth/me`: Retrieves current authenticated user profile.

### Hosted Zones (`/api/zones`)
- `GET /api/zones`: Lists hosted zones (supports pagination, search, and type filtering).
- `POST /api/zones`: Creates a hosted zone and automatically seeds default `NS` and `SOA` records.
- `GET /api/zones/{zone_id}`: Retrieves metadata for a specific zone.
- `PUT /api/zones/{zone_id}`: Updates a zone's comment.
- `DELETE /api/zones/{zone_id}`: Deletes a zone and all its records.

### DNS Records (`/api/zones/{zone_id}/records`)
- `GET /api/zones/{zone_id}/records`: Lists records (supports pagination, search, and type filtering).
- `POST /api/zones/{zone_id}/records`: Creates a DNS record (validates CNAME coexistence and format).
- `PUT /api/zones/{zone_id}/records/{record_id}`: Updates record details.
- `DELETE /api/zones/{zone_id}/records/{record_id}`: Deletes a record.
- `GET /api/zones/{zone_id}/records/export`: Exports records as BIND or JSON.
- `POST /api/zones/{zone_id}/records/import`: Imports records from a BIND zone file.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats`: Returns summary counts of zones, records, and public/private splits.

---

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the database seeder to create tables and populate initial admin user & sample domains:
   ```bash
   python seed.py
   ```
5. Start the FastAPI development server:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`. Interactive API docs are at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Default Credentials

Use the default seeded credentials to log in:
- **Username**: `admin`
- **Password**: `password123`

---

## Keyboard Shortcuts

- `N`: Open the **Create Hosted Zone** or **Create Record** modal from their respective dashboards.
- `/`: Focus the **Search** bar.
- `Escape`: Close any active modal.
- **Global Navigation Sequence (`g` then `<key>`)**:
  - `g` then `d` or `h`: Go to **Dashboard**
  - `g` then `z`: Go to **Hosted Zones**
  - `g` then `c`: Go to **Health Checks**
  - `g` then `t`: Go to **Traffic Policies**
  - `g` then `r`: Go to **Resolver**
  - `g` then `p`: Go to **Profiles**
- `Alt + L` (or `Option + L` on macOS): Toggle **Light / Dark Mode**.
