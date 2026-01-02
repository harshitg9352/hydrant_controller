import { after, afterEach, test } from "node:test";
import assert from "node:assert";

import "dotenv/config";
import * as z from "zod";
import mysql, { type PoolOptions, type ResultSetHeader } from "mysql2/promise";

import { Hydrant, type HydrantResp, type HydrantRow } from "./Hydrant.ts";
import { type HistoryRow } from "./History.ts";
import HydrantService from "./HydrantService.ts";

const dbHost: string =
  z.string().default("localhost").parse(process.env["DB_HOST"]);
const dbUser: string =
  z.string().default("root").parse(process.env["DB_USER"]);
const dbPassword: string =
  z.string().default("9352785297").parse(process.env["DB_PASSWORD"]);

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

afterEach(async () => {
  await pool.query<ResultSetHeader>("Delete From hydrants");
  await pool.query<ResultSetHeader>("Delete From history");
});

after(() => {
  pool.end();
});

async function getHistoryIdFromHydrant(): Promise<number> {
  const [hydrantRows] = await pool.query<HydrantRow[]>(
    `Select history_id
      From hydrants`,
  );
  const [hydrantRow] = hydrantRows;
  if (hydrantRow === undefined) {
    throw new Error("hydrants table is empty!");
  }
  if (hydrantRow.history_id === undefined) {
    throw new Error("Could not select hydrants.history_id");
  }
  return hydrantRow.history_id;
}

async function getHistoryId(): Promise<number> {
  const [historyRows] = await pool.query<HistoryRow[]>(
    `Select id
       From history`,
  );
  const [historyRow] = historyRows;
  if (historyRow === undefined) {
    throw new Error("history table is empty!");
  }
  if (historyRow.id === undefined) {
    throw new Error("Could not select history.id");
  }
  return historyRow.id;
}

test("on creating hydrant, hydrant gets history_id", async () => {
  const hydrantToCreate: z.infer<typeof Hydrant> = {
    hydrant: "hydrant 1",
    location: "location 1",
    inspection_date: null,
    defects: null,
    checked_by: null,
  };
  const hydrantCreateResp: Response = await fetch(
    "http://localhost:5001/api/hydrants",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(hydrantToCreate),
    },
  );
  assert.strictEqual(hydrantCreateResp.status, 201);

  const historyIdFromHydrant: number = await getHistoryIdFromHydrant();
  const historyId: number = await getHistoryId();

  assert.strictEqual(historyIdFromHydrant, historyId);
});

async function getHistoryIdFromUpdatedHydrant(
  hydrantId: number,
): Promise<number> {
  const [hydrantRows] = await pool.query<HydrantRow[]>(
    `Select history_id
      From hydrants
      Where id = ?`,
    [hydrantId],
  );
  const [hydrantRow] = hydrantRows;
  if (hydrantRow === undefined) {
    throw new Error("hydrants table is empty!");
  }
  if (hydrantRow.history_id === undefined) {
    throw new Error("Could not select hydrants.history_id");
  }
  return hydrantRow.history_id;
}

async function getLatestHistoryItem(): Promise<HistoryRow> {
  const [historyRows] = await pool.query<HistoryRow[]>(
    `Select id, action
       From history
       Order By id Desc
       Limit 1`,
  );
  const [historyRow] = historyRows;
  if (historyRow === undefined) {
    throw new Error("history table is empty!");
  }
  if (historyRow.id === undefined) {
    throw new Error("Could not select history.id");
  }
  if (historyRow.action === undefined) {
    throw new Error("Could not select history.action");
  }
  return historyRow;
}

test("on updating hydrant, hydrant gets latest history_id", async () => {
  const hydrantToCreate: z.infer<typeof Hydrant> = Hydrant.parse({
    hydrant: "hydrant 1",
    location: "location 1",
    inspection_date: null,
    defects: null,
    checked_by: null,
  });
  const createdHydrant: HydrantResp =
    await hydrantService.create(hydrantToCreate);

  const hydrantWithUpdatedValues: z.infer<typeof Hydrant> = {
    ...hydrantToCreate,
    hydrant: "hydrant updated",
    location: hydrantToCreate.location,
  };

  const hydrantUpdateResp: Response = await fetch(
    `http://localhost:5001/api/hydrants/${createdHydrant.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: createdHydrant.id, ...hydrantWithUpdatedValues }),
    },
  );
  assert.strictEqual(hydrantUpdateResp.status, 200);

  const historyIdFromUpdatedHydrant: number =
    await getHistoryIdFromUpdatedHydrant(createdHydrant.id);
  const latestHistoryItem: HistoryRow = await getLatestHistoryItem();

  assert.strictEqual(latestHistoryItem.action, "update");
  assert.strictEqual(historyIdFromUpdatedHydrant, latestHistoryItem.id);
});
