import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import "dotenv/config";
import * as z from "zod";
import mysql, { type PoolOptions } from "mysql2/promise";
import asyncHandler from "express-async-handler";

import { Hydrant, type HydrantResp, type HydrantRow } from "./Hydrant.ts";
import HydrantService from "./HydrantService.ts";

const app = express();
app.use(cors());
app.use(express.json());

const dbHost: string =
  z.string().default("localhost").parse(process.env["DB_HOST"]);
const dbUser: string =
  z.string().default("root").parse(process.env["DB_USER"]);
const dbPassword: string =
  z.string().default("9352785297").parse(process.env["DB_PASSWORD"]);
const port: number = z.coerce.number().default(5001).parse(process.env["PORT"]);

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

app.get("/api/hydrants", asyncHandler(async (_, res) => {
  const hydrants: HydrantRow[] = await hydrantService.findAll();
  res.json(hydrants);
}));

app.post("/api/hydrants", asyncHandler(async (req, res) => {
  const newHydrant: z.infer<typeof Hydrant> = Hydrant.parse(req.body);
  const createdHydrant: HydrantResp = await hydrantService.create(newHydrant);
  res.status(201).json(createdHydrant);
}));

app.put("/api/hydrants/:id", asyncHandler(async (req, res) => {
  const id = z.coerce.number().positive().parse(req.params["id"]);
  const updatedHydrant: z.infer<typeof Hydrant> = Hydrant.parse(req.body);

  const result: HydrantResp | null = await hydrantService.update(
    id,
    updatedHydrant,
  );

  if (result === null) {
    res.status(404).json(`Hydrant with id: ${id} not found`);
    return;
  }
  res.json(result);
}));

app.delete("/api/hydrants/:id", asyncHandler(async (req, res) => {
  const id = z.coerce.number().positive().parse(req.params["id"]);

  const success: boolean = await hydrantService.delete(id);

  if (success === false) {
    res.status(404).json(`Hydrant with id: ${id} not found`);
    return;
  }
  res.json({ message: "Hydrant deleted", id });
}));

app.get("/api/history", asyncHandler(async (_, res) => {
  const history = await hydrantService.getHistory();
  res.json(history);
}));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json(err.issues);
    return;
  }
  
  console.error(err);
  res.sendStatus(500);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
