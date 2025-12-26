import { after, afterEach, test } from "node:test";
import assert from "node:assert";

import mysql, { type ResultSetHeader } from "mysql2/promise";

import type { Hydrant, HydrantReq, HydrantRow } from "./Hydrant.ts";
import type { HistoryRow } from "./History.ts";

const DB_CONFIG: mysql.PoolOptions = {
  host: "localhost",
  user: "clove",
  password: "YZWNZq5HgnD9",
  database: "hydrant_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool: mysql.Pool = mysql.createPool(DB_CONFIG);

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
  const hydrantToCreate: HydrantReq = {
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
  assert.strictEqual(hydrantCreateResp.status, 200);

  const historyIdFromHydrant: number = await getHistoryIdFromHydrant();
  const historyId: number = await getHistoryId();

  assert.strictEqual(historyIdFromHydrant, historyId);
});

async function createHydrant(hydrant: Hydrant) {
  const [historyQueryResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO history
      (action, hydrant, location, inspection_date, defects, checked_by)
      VALUES ('create', ?, ?, ?, ?, ?)`,
    [
      hydrant.hydrant,
      hydrant.inspection_location,
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
      hydrant.inspection_location,
      hydrant.inspection_date,
      hydrant.defects,
      hydrant.checked_by,
    ],
  );

  return creationQueryResult;
}

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
  const hydrantToCreate: Hydrant = {
    hydrant: "hydrant 1",
    inspection_location: "location 1",
    inspection_date: null,
    defects: null,
    checked_by: null,
  };
  const creationQueryResult: mysql.QueryResult =
    await createHydrant(hydrantToCreate);

  const hydrantId: number = creationQueryResult.insertId;

  const hydrantWithUpdatedValues: HydrantReq = {
    ...hydrantToCreate,
    hydrant: "hydrant updated",
    location: hydrantToCreate.inspection_location,
  };

  const hydrantUpdateResp: Response = await fetch(
    `http://localhost:5001/api/hydrants/${hydrantId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: hydrantId, ...hydrantWithUpdatedValues }),
    },
  );
  assert.strictEqual(hydrantUpdateResp.status, 200);

  const historyIdFromUpdatedHydrant: number =
    await getHistoryIdFromUpdatedHydrant(hydrantId);
  const latestHistoryItem: HistoryRow = await getLatestHistoryItem();

  assert.strictEqual(latestHistoryItem.action, "update");
  assert.strictEqual(historyIdFromUpdatedHydrant, latestHistoryItem.id);
});
