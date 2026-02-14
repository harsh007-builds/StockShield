# Invictus PCB — Inventory Automation & Consumption Analytics

A production-ready web application for PCB manufacturing inventory management, automatic stock deduction on production, procurement trigger logic, and analytics.


---

## Tech Stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Frontend       | React.js                |
| Backend        | Node.js + Express.js    |
| Database       | PostgreSQL              |
| Authentication | JWT (jsonwebtoken)      |
| File Uploads   | Multer                  |
| Excel I/O      | ExcelJS                 |
| Charts         | Recharts                |

---

## Features

1. **Component Inventory CRUD** — Create, read, update, delete components with stock tracking  
2. **PCB–Component Mapping** — Define PCBs and map components with quantity-per-PCB  
3. **Automatic Stock Deduction** — On production entry, auto-deducts stock; blocks if insufficient; never allows negative stock  
4. **Procurement Triggers** — Auto-creates procurement alerts when stock < 20% of monthly required quantity  
5. **Analytics Dashboard** — KPIs, top consumed components, low-stock alerts, daily consumption charts  
6. **Excel Import/Export** — Import inventory from .xlsx; export inventory and consumption reports  
7. **JWT Authentication** — Secure login protecting all modification APIs  

---

## Prerequisites

- **Node.js** v16+ and npm
- **PostgreSQL** v13+ running locally
- A PostgreSQL user with database creation permissions (default: `postgres` / `postgres`)

---

## Setup Instructions

### 1. Clone / extract the project

```bash
cd invictus
```

### 2. Configure environment variables

Edit `server/.env` if your PostgreSQL credentials differ from the defaults:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invictus_pcb
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=invictus_pcb_secret_key_2026
JWT_EXPIRES_IN=24h
```

### 3. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Initialize the database

This creates the database, tables, and seeds an admin user:

```bash
cd server
npm run db:init
```

You should see:
```
Database "invictus_pcb" created.
Schema created successfully.
Admin user seeded (username: admin, password: admin123).
```

### 5. Start the application

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# or: npm start
```

**Terminal 2 — Frontend:**
```bash
cd client
npm start
```

The app opens at **http://localhost:3000**.

---

## Default Login

| Username | Password   |
| -------- | ---------- |
| admin    | admin123   |

---

## API Endpoints

### Auth
| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| POST   | /api/auth/login   | Login, returns JWT   |
| POST   | /api/auth/register| Register new user    |
| GET    | /api/auth/me      | Get current user     |

### Components
| Method | Endpoint              | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | /api/components       | List all (search, filter)|
| GET    | /api/components/:id   | Get single component     |
| POST   | /api/components       | Create component         |
| PUT    | /api/components/:id   | Update component         |
| DELETE | /api/components/:id   | Delete component         |

### PCBs
| Method | Endpoint                            | Description              |
| ------ | ----------------------------------- | ------------------------ |
| GET    | /api/pcbs                           | List all PCBs            |
| GET    | /api/pcbs/:id                       | Get PCB with components  |
| POST   | /api/pcbs                           | Create PCB               |
| PUT    | /api/pcbs/:id                       | Update PCB               |
| DELETE | /api/pcbs/:id                       | Delete PCB               |
| POST   | /api/pcbs/:id/components            | Map component to PCB     |
| PUT    | /api/pcbs/:id/components/:mappingId | Update mapping qty       |
| DELETE | /api/pcbs/:id/components/:mappingId | Remove mapping           |

### Production
| Method | Endpoint                         | Description                    |
| ------ | -------------------------------- | ------------------------------ |
| POST   | /api/production                  | Record production (auto-deduct)|
| GET    | /api/production/history          | Production history             |
| GET    | /api/production/:id/consumption  | Consumption details for entry  |

### Procurement
| Method | Endpoint                        | Description              |
| ------ | ------------------------------- | ------------------------ |
| GET    | /api/procurement                | List all triggers        |
| PUT    | /api/procurement/:id/resolve    | Mark trigger as resolved |

### Analytics
| Method | Endpoint                             | Description                |
| ------ | ------------------------------------ | -------------------------- |
| GET    | /api/analytics/dashboard             | Dashboard KPIs             |
| GET    | /api/analytics/consumption-summary   | Per-component consumption  |
| GET    | /api/analytics/top-consumed          | Top consumed components    |
| GET    | /api/analytics/low-stock             | Low-stock components       |
| GET    | /api/analytics/consumption-timeline  | Daily consumption chart    |

### Excel
| Method | Endpoint                      | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| POST   | /api/excel/import             | Import inventory from .xlsx  |
| GET    | /api/excel/export/inventory   | Export inventory to .xlsx    |
| GET    | /api/excel/export/consumption | Export consumption to .xlsx  |

---

## Excel Import Format

The import file (.xlsx) should have these columns in the first sheet:

| Column A         | Column B      | Column C      | Column D                  |
| ---------------- | ------------- | ------------- | ------------------------- |
| Component Name   | Part Number   | Current Stock | Monthly Required Quantity |

- Row 1 is treated as header and skipped  
- Existing components are matched by **Part Number** and updated  
- New part numbers create new component records  

---

## Project Structure

```
invictus/
├── server/
│   ├── config/db.js          # PostgreSQL connection pool
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── componentController.js
│   │   ├── pcbController.js
│   │   ├── productionController.js
│   │   ├── procurementController.js
│   │   ├── analyticsController.js
│   │   └── excelController.js
│   ├── middleware/auth.js     # JWT verification
│   ├── routes/               # Route definitions
│   ├── uploads/              # Uploaded Excel files
│   ├── db-init.js            # Database initialization script
│   ├── index.js              # Express server entry
│   ├── .env                  # Environment config
│   └── package.json
├── client/
│   ├── src/
│   │   ├── context/AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Components.js
│   │   │   ├── PCBs.js
│   │   │   ├── Production.js
│   │   │   ├── Procurement.js
│   │   │   ├── Analytics.js
│   │   │   └── ExcelIO.js
│   │   ├── api.js            # Axios instance with JWT interceptor
│   │   ├── App.js            # Router + layout
│   │   └── index.js
│   └── package.json
└── README.md
```

---

## Business Logic Highlights

- **Stock Deduction**: Uses PostgreSQL transactions — all components are validated before any deduction. If any single component is short, the entire production is blocked (atomic rollback).
- **Negative Stock Prevention**: Enforced at both application and database level (`CHECK (current_stock >= 0)`).
- **Procurement Triggers**: Automatically created when `current_stock < 20% × monthly_required_quantity`. Only one PENDING trigger per component at a time.
- **Consumption History**: Every production run records per-component stock-before and stock-after for full audit trail.
