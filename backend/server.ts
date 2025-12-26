import express from "express";
import mysql, { type PoolOptions, type ResultSetHeader } from "mysql2/promise";
import cors from "cors";

import type { HydrantReq, HydrantRow } from "./Hydrant.ts";
import { type HistoryRow } from "./History.js";

const app = express();
app.use(cors());
app.use(express.json());

const DB_CONFIG: PoolOptions = {
  host: "localhost",
  user: "clove",
  password: "YZWNZq5HgnD9",
  database: "hydrant_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

app.get("/api/hydrants", async (_, res) => {
  const [rows] = await pool.query<HydrantRow[]>(
    `SELECT *
    FROM hydrants
    ORDER BY id
    DESC`,
  );
  res.json(rows);
});

async function createHydrant(hydrant: HydrantReq) {
  const [historyQueryResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO history
    (action, hydrant, location, inspection_date, defects, checked_by)
    VALUES ('create', ?, ?, ?, ?, ?)`,
    [
      hydrant.hydrant,
      hydrant.location,
      hydrant.inspection_date,
      hydrant.defects,
      hydrant.checked_by,
    ],
  );

  const [creationQueryResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO hydrants
    (history_id, hydrant, location, inspection_date, defects, checked_by)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      historyQueryResult.insertId,
      hydrant.hydrant,
      hydrant.location,
      hydrant.inspection_date,
      hydrant.defects,
      hydrant.checked_by,
    ],
  );

  return creationQueryResult;
}

app.post("/api/hydrants", async (req, res) => {
  const requiredProps = [
    "hydrant",
    "location",
    "inspection_date",
    "defects",
    "checked_by",
  ] as const;

  for (const property of requiredProps) {
    if (!(property in req.body)) {
      res
        .json(400)
        .json(`Required property ${property} missing in request body`);
      return;
    }
  }

  const newHydrant: HydrantReq = requiredProps.reduce<HydrantReq>(
    (acc, prop) => {
      acc[prop] = req.body[prop];
      return acc;
    },
    {} as HydrantReq,
  );

  if (newHydrant.hydrant === null || newHydrant.location === null) {
    if (req.body.hydrant === null) {
      return res.status(400).json("hydrant name cannot be null");
    } else {
      return res.status(400).json("inspection location cannot be null");
    }
  }

  const creationQueryResult: mysql.QueryResult = await createHydrant(req.body);

  return res.json({
    id: creationQueryResult.insertId,
    ...newHydrant,
  });
});

app.put("/api/hydrants/:id", async (req, res) => {
  const { id } = req.params;

  const requiredProps = [
    "hydrant",
    "location",
    "inspection_date",
    "defects",
    "checked_by",
  ] as const;

  for (const property of requiredProps) {
    if (!(property in req.body)) {
      res
        .status(400)
        .json(`Required property ${property} missing in request body`);
      return;
    }
  }

  const updatedHydrant: HydrantReq = requiredProps.reduce<HydrantReq>(
    (acc, prop) => {
      acc[prop] = req.body[prop];
      return acc;
    },
    {} as HydrantReq,
  );

  const [hydrantRows] = await pool.query<HydrantRow[]>(
    `Select history_id
    From hydrants
    Where id = ?`,
    [id],
  );

  const [hydrantRow] = hydrantRows;
  if (hydrantRow === undefined) {
    return res.status(400).json(`No hydrant with id: ${id}`);
  }

  const [historyQueryResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO history
    (action, previous_event_id, hydrant, location, inspection_date, defects, checked_by)
    VALUES ('update', ?, ?, ?, ?, ?, ?)`,
    [
      hydrantRow.history_id,
      updatedHydrant.hydrant,
      updatedHydrant.location,
      updatedHydrant.inspection_date,
      updatedHydrant.defects,
      updatedHydrant.checked_by,
    ],
  );

  await pool.query<ResultSetHeader>(
    `UPDATE hydrants
    SET history_id = ?, hydrant = ?, location = ?, inspection_date = ?, defects = ?, checked_by = ?
    WHERE id = ?`,
    [
      historyQueryResult.insertId,
      updatedHydrant.hydrant,
      updatedHydrant.location,
      updatedHydrant.inspection_date || null,
      updatedHydrant.defects || null,
      updatedHydrant.checked_by || null,
      id,
    ],
  );

  return res.json({ id, ...updatedHydrant });
});

app.delete("/api/hydrants/:id", async (req, res) => {
  const { id } = req.params;

  const [hydrantRows] = await pool.query<HydrantRow[]>(
    `Select history_id From hydrants
    Where id = ?`,
    [id],
  );

  const [hydrantRow] = hydrantRows;
  if (hydrantRow === undefined) {
    return res.status(400).json(`No hydrant with id: ${id}`);
  }

  await pool.query<ResultSetHeader>("Delete From hydrants Where id = ?", [id]);

  await pool.query<ResultSetHeader>(
    `INSERT INTO history (action, previous_event_id)
    VALUES ('delete', ?)`,
    [hydrantRow.history_id],
  );

  return res.json({ message: "Hydrant deleted", id });
});

app.get("/api/history", async (_, res) => {
  const [rows] = await pool.query<HistoryRow[]>("Select * From history");
  res.json(rows);
});

const pool: mysql.Pool = mysql.createPool(DB_CONFIG);

const PORT = process.env["PORT"] || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
