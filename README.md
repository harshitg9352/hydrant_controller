Hydrant Controller Dashboard
===========================

This project contains a light-themed Hydrant Controller Dashboard frontend and an Express + MySQL backend.

Structure:
- frontend/index.html       -> Single-file frontend (Tailwind + Chart.js)
- backend/server.js         -> Express server with CRUD routes
- package.json              -> Node project config
- seed.sql                  -> SQL to create database/table and insert sample rows

Database defaults used in server.js:
- host: localhost
- user: root
- password: (empty string)
- database: hydrant_system

Quick setup:
1. Ensure MySQL is installed and running.
2. (Optional) Edit `backend/server.js` DB_CONFIG if you use a password.
3. Load sample data:
   mysql -u root -p < seed.sql
4. Install backend dependencies:
   npm install
5. Start server:
   npm run dev
6. Open `frontend/index.html` in your browser.

If you run into CORS or port issues, make sure the server is running on port 5001 and that your browser allows connecting to http://localhost:5000.
