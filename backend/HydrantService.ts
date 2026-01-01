import mysql, { type ResultSetHeader } from "mysql2/promise";
import * as z from "zod";

import { Hydrant, type HydrantResp, type HydrantRow } from "./Hydrant.js";
import { type HistoryRow } from "./History.js";

class HydrantService {
  private pool: mysql.Pool;

  constructor(pool: mysql.Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<HydrantRow[]> {
    const [rows] = await this.pool.query<HydrantRow[]>(
      `SELECT *
      FROM hydrants
      ORDER BY id
      DESC`,
    );
    return rows;
  }

  async create(newHydrant: z.output<typeof Hydrant>): Promise<HydrantResp> {
    const [historyQueryResult] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO history
      (action, hydrant, location, inspection_date, defects, checked_by)
      VALUES ('create', ?, ?, ?, ?, ?)`,
      [
        newHydrant.hydrant,
        newHydrant.location,
        newHydrant.inspection_date,
        newHydrant.defects,
        newHydrant.checked_by,
      ],
    );

    const [creationQueryResult] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO hydrants
      (history_id, hydrant, location, inspection_date, defects, checked_by)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        historyQueryResult.insertId,
        newHydrant.hydrant,
        newHydrant.location,
        newHydrant.inspection_date,
        newHydrant.defects,
        newHydrant.checked_by,
      ],
    );

    return {
      id: creationQueryResult.insertId,
      ...newHydrant,
    };
  }

  async update(id: number, updatedHydrant: z.infer<typeof Hydrant>): Promise<HydrantResp | null> {
    const [hydrantRows] = await this.pool.query<HydrantRow[]>(
      `Select history_id
      From hydrants
      Where id = ?`,
      [id],
    );

    const [hydrantRow] = hydrantRows;
    if (hydrantRow === undefined) {
      return null;
    }

    const [historyQueryResult] = await this.pool.query<ResultSetHeader>(
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

    await this.pool.query<ResultSetHeader>(
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

    return {
      id,
      ...updatedHydrant
    }
  }

  async delete(id: number): Promise<boolean> {
    const [hydrantRows] = await this.pool.query<HydrantRow[]>(
      `Select history_id From hydrants
      Where id = ?`,
      [id],
    );

    const [hydrantRow] = hydrantRows;
    if (hydrantRow === undefined) {
      return false;
    }

    await this.pool.query<ResultSetHeader>(
      `INSERT INTO history (action, previous_event_id)
      VALUES ('delete', ?)`,
      [hydrantRow.history_id],
    );

    await this.pool.query<ResultSetHeader>("Delete From hydrants Where id = ?", [id]);

    return true;
  }

  async getHistory(): Promise<HydrantRow[]> {
    const [rows] = await this.pool.query<HistoryRow[]>(
      `SELECT *
      FROM history`
    );
    return rows;
  }
}

export default HydrantService;
