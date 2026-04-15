# 🏭 VATS — Retailer & Manufacturing ERP System

A full-stack **ERP (Enterprise Resource Planning) system** for retailer and manufacturing management, built with **React + TypeScript** on the frontend and **Node.js + Express** on the backend, powered by a **PostgreSQL** database.

VATS covers the complete production and retail workflow — from customer orders and inventory to procurement, production scheduling, quality control, and logistics — all in one unified dashboard.

---

## 📌 Overview

VATS is designed for small-to-medium manufacturers and retailers who need to manage:
- Incoming customer orders
- Raw material inventory and stock levels
- Material requirement and production planning
- Supplier procurement and purchase orders
- Shipment and logistics tracking
- Quality control inspections

---

## ✨ Modules

| Module | Description |
|---|---|
| 📊 **Dashboard** | Live overview of orders, inventory alerts, MRP shortfalls, and production status |
| 📦 **Inventory** | Track items, stock levels, locations, and reorder thresholds |
| 🛒 **Order Management** | Create and manage customer orders with delivery timelines |
| 🔩 **Material Requirement Planning (MRP)** | Map required materials to orders, check availability and shortfalls |
| 🗓️ **Master Production Schedule (MPS)** | Plan and track production runs with workstation and supervisor assignments |
| 🚚 **Procurement** | Raise purchase orders to suppliers and track delivery status |
| 📋 **Quality Control** | Log inspections, test results, defect counts, and batch records |
| 🚛 **Logistics** | Track shipments with carrier, origin, destination, and real-time status |

---

## 🗂️ Project Structure

```
retailer_management/
└── vats-main/
    ├── backend/
    │   ├── server.js              # Express server entry point
    │   ├── db.js                  # PostgreSQL connection pool
    │   ├── scripts.sql            # Full DB schema + seed data
    │   ├── .env                   # Environment variables
    │   ├── package.json
    │   └── routes/
    │       ├── inventory.js       # /api/inventory
    │       ├── control.js         # /api/customer-orders
    │       ├── mrp.js             # /api/mrp
    │       ├── mps.js             # /api/mps
    │       ├── procurement.js     # /api/procurement
    │       ├── logistics.js       # /api/logistics
    │       └── qualityControl.js  # /api/quality-control
    └── frontend/
        ├── index.html
        ├── vite.config.ts
        ├── tailwind.config.ts
        ├── package.json
        └── src/
            ├── App.tsx             # Routes
            ├── main.tsx
            ├── pages/
            │   ├── Dashboard.tsx
            │   ├── Inventory.tsx
            │   ├── OrderManagement.tsx
            │   ├── MaterialRequirementPlanning.tsx
            │   ├── MasterProductionSchedule.tsx
            │   ├── Procurement.tsx
            │   ├── Quality.tsx
            │   └── Logistics.tsx
            ├── components/
            │   ├── ERPLayout.tsx
            │   ├── ERPSidebar.tsx
            │   └── ui/             # shadcn/ui components
            ├── contexts/
            │   └── UserContext.tsx
            └── lib/
                ├── materialInventorySync.ts
                └── procurementInventorySync.ts
```

---

## 🏗️ Tech Stack

### Frontend
| Tech | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| shadcn/ui + Radix UI | Component library |
| React Router v6 | Client-side routing |
| TanStack Query | Server state & data fetching |
| Recharts | Charts and data visualization |
| React Hook Form + Zod | Form handling and validation |

### Backend
| Tech | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| PostgreSQL | Relational database |
| `pg` (node-postgres) | DB connection pool |
| dotenv | Environment config |
| cors | Cross-origin request handling |

---

## 🗄️ Database

**PostgreSQL** is used as the database under the schema `MANM`.

### Tables

| Table | Description |
|---|---|
| `customer_orders` | Customer order records with status and value |
| `inventory` | Item stock with min/max thresholds and location |
| `mrp` | Material requirements linked to orders and inventory |
| `mps` | Production schedules with workstations and supervisors |
| `procurement` | Purchase orders raised to suppliers |
| `quality_control` | QC inspection records with defect tracking |
| `logistics` | Shipment records with carrier and tracking info |

The full schema with seed data is in:
```
vats-main/backend/scripts.sql
```

---

## ▶️ How to Run

### Prerequisites
- Node.js v18+
- PostgreSQL 14+
- npm

---

### Step 1 — Set Up the Database

```sql
-- In psql or pgAdmin, run:
\i vats-main/backend/scripts.sql
```

This will create the `MANM` schema and populate all tables with sample data.

---

### Step 2 — Configure the Backend

Edit `vats-main/backend/db.js` with your PostgreSQL credentials:

```js
const pool = new Pool({
  user: 'your_postgres_user',
  host: 'localhost',
  database: 'MANM',
  password: 'your_password',
  port: 5432,
});
```

Or use the `.env` file if configured with `dotenv`.

---

### Step 3 — Start the Backend

```bash
cd vats-main/backend
npm install
npm start
```

Backend will run at: **http://localhost:5001**

Test the DB connection:
```
GET http://localhost:5001/api/db-ping
```

---

### Step 4 — Start the Frontend

```bash
cd vats-main/frontend
npm install
npm run dev
```

Frontend will run at: **http://localhost:5173**

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | List all inventory items |
| GET/POST/PUT/DELETE | `/api/customer-orders` | Manage customer orders |
| GET/POST/PUT/DELETE | `/api/mrp` | Material requirement planning |
| GET/POST/PUT/DELETE | `/api/mps` | Master production schedule |
| GET/POST/PUT/DELETE | `/api/procurement` | Purchase orders |
| GET/POST/PUT/DELETE | `/api/quality-control` | QC inspections |
| GET/POST/PUT/DELETE | `/api/logistics` | Shipment tracking |
| GET | `/api/db-ping` | Check DB connection health |

---

## 🔮 Planned Enhancements

- [ ] User authentication and role-based access (Admin / Staff)
- [ ] Dashboard charts using Recharts (revenue trends, stock levels)
- [ ] PDF invoice and report export
- [ ] Low-stock email/SMS notifications
- [ ] Multi-warehouse support
- [ ] Mobile-responsive layout improvements

---

## 👨‍💻 Author

**ShrivaThshaN**
GitHub: [@ShrivaThshaN](https://github.com/ShrivaThshaN)
