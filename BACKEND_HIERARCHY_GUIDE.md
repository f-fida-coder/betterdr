# Backend Hierarchy & Dashboard Implementation Guide

This guide outlines the steps to implement and verify the Admin -> Agent -> User hierarchy, separate dashboards, and self-creation logic.

## 1. Core Backend Hierarchy (Implemented)

The backend already supports the required hierarchy using the `User` model.

### Data Model (`User`)
- **Role**: `admin`, `agent`, `user`
- **Agent Assignment**: `agentId` field in `User` table links a User to an Agent.
  - If `agentId` is NULL and `role` is `user`, they are a direct Admin customer.
  - If `agentId` is set, they are managed by that Agent.

### API Endpoints

#### Admin (`/api/admin`)
- **Create Agent**: `POST /create-agent` (Creates user with `role: agent`)
- **Create User**: `POST /create-user` (Creates user with `role: user`, optional `agentId`)
- **View All**: `GET /users`, `GET /agents` (See everyone)

#### Agent (`/api/agent`)
- **Create User**: `POST /create-user` (Creates user with `role: user`, automatically assigns `agentId = req.user.id`)
- **View My Users**: `GET /my-users` (Returns only users where `agentId = req.user.id`)
- **Stats**: `GET /stats` (Returns stats only for their users)

#### User (`/api/auth`)
- **Self-Register**: `POST /register` (Creates user with `role: user`, no agent assigned by default unless referral logic is added)
- **Login**: `POST /login`
- **View Profile**: `GET /me`

## 2. Frontend Integration Steps

### A. Fix API Route Mismatch (Completed)
**Issue**: The frontend was calling `/api/agent/players` but the backend expected `/api/agent/create-user`.
**Fix**: Updated `src/api.js` to point to the correct backend endpoints.

### B. Separate Dashboards (To Be Implemented)
Currently, `AdminSidebar.jsx` filters menu items based on role, but `AdminDashboard.jsx` (the grid view) displays all items.

**Step 1: Centralize Role Logic**
- In `AdminPanel.jsx`, decode the token once to get the `role`.
- Pass `role` as a prop to `AdminSidebar` and `AdminDashboard`.

**Step 2: Update AdminDashboard.jsx**
- Accept `role` prop.
- Filter the `menuItems` array based on the role (similar to `AdminSidebar`).
- **Admin View**: See all items.
- **Agent View**: See only:
  - Dashboard
  - Pending
  - Customer Admin (My Players)
  - Add Customer
  - User Manual
  - (Hide: Game Admin, Agent Admin, Financials, etc.)

**Step 3: Update CustomerAdminView.jsx**
- Ensure it handles the "Agent" view correctly (already implemented with `getMyPlayers`).
- Verify "Add Customer" button redirects to the correct form.

### C. Self-Creation Logic (Implemented)
- **Admin**: Can create Agents and Users via `AddCustomerView` (uses `createUserByAdmin` / `createAgent`).
- **Agent**: Can create Users via `AddCustomerView` (uses `createPlayerByAgent`).
- **User**: Can self-register via the public Registration page (uses `registerUser`).

## 3. Verification Checklist

- [x] **Backend**: `User` model has `agentId`.
- [x] **Backend**: `agentController` enforces `agentId` filtering.
- [x] **Frontend**: `src/api.js` points to correct endpoints.
- [ ] **Frontend**: `AdminDashboard.jsx` filters grid items by role.
- [ ] **Frontend**: `AdminPanel.jsx` passes role to children.
- [ ] **Testing**:
  - Login as Admin -> Create Agent -> Success.
  - Login as Agent -> Create User -> Success.
  - Login as Agent -> View Users -> See only own users.
  - Login as Admin -> View Users -> See all users.

## 4. Next Steps for Coding Agent

1.  **Modify `src/components/AdminPanel.jsx`**:
    - Add state for `role`.
    - Decode token in `useEffect` and set `role`.
    - Pass `role` to `<AdminDashboard />` and `<AdminSidebar />`.

2.  **Modify `src/components/AdminDashboard.jsx`**:
    - Add `roles` array to each menu item (copy from Sidebar or centralize config).
    - Filter items before rendering.

3.  **Test Agent Flow**:
    - Log in as the Agent created in the test script.
    - Verify the Dashboard only shows allowed items.
    - Create a new user.
    - Verify the user appears in "Customer Admin".
