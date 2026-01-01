import cors from "cors";
import express from "express";
import mysql, { type PoolOptions, type ResultSetHeader } from "mysql2/promise";
import * as z from "zod";
import "dotenv/config";

import HydrantService from "./HydrantService.ts";
import { Hydrant, type HydrantResp, type HydrantRow } from "./Hydrant.js";

const app = express();
app.use(cors());
app.use(express.json());

const dbHost: string =
  z.nullable(z.string()).parse(process.env["DB_HOST"]) ?? "localhost";
const dbUser: string =
  z.nullable(z.string()).parse(process.env["DB_USER"]) ?? "root";
const dbPassword: string =
  z.nullable(z.string()).parse(process.env["DB_PASSWORD"]) ?? "9352785297";

const DB_CONFIG: PoolOptions = {
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: "hydrant_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool: mysql.Pool = mysql.createPool(DB_CONFIG);
const hydrantService: HydrantService = new HydrantService(pool);

app.get("/api/hydrants", async (_, res) => {
  const hydrants: HydrantRow[] = await hydrantService.findAll();
  res.json(hydrants);
});

app.post("/api/hydrants", async (req, res) => {
  try {
    const newHydrant: z.infer<typeof Hydrant> = Hydrant.parse(req.body);
    const createdHydrant: HydrantResp = await hydrantService.create(newHydrant);
    return res.status(201).json(createdHydrant);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.issues);
    } else {
      throw error;
    }
  }
});

app.put("/api/hydrants/:id", async (req, res) => {
  try {
    const id = z.coerce.number().positive().parse(req.params["id"]);
    const updatedHydrant: z.infer<typeof Hydrant> = Hydrant.parse(req.body);

    const result: HydrantResp | null = await hydrantService.update(
      id,
      updatedHydrant,
    );

    if (result === null) {
      return res.status(404).json(`Hydrant with id: ${id} not found`);
    }
    return res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.issues);
    } else {
      throw error;
    }
  }
});

app.delete("/api/hydrants/:id", async (req, res) => {
  try {
    const id = z.coerce.number().positive().parse(req.params["id"]);

    const success: boolean = await hydrantService.delete(id);

    if (success === false) {
      return res.status(404).json(`Hydrant with id: ${id} not found`);
    }
    return res.json({ message: "Hydrant deleted", id });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.issues);
    } else {
      throw error;
    }
  }
});

app.get("/api/history", async (_, res) => {
  const history = await hydrantService.getHistory();
  res.json(history);
});

const PORT = process.env["PORT"] || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
