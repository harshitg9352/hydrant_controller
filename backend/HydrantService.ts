import mysql, { type ResultSetHeader } from "mysql2/promise";
import * as z from "zod";

import { Hydrant, type HydrantResp, type HydrantRow } from "./Hydrant.ts";
import { type HistoryRow } from "./History.ts";

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
    const conn: mysql.PoolConnection = await this.pool.getConnection();
    await conn.beginTransaction();

    try {
      const [historyQueryResult] = await conn.query<ResultSetHeader>(
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

      const [creationQueryResult] = await conn.query<ResultSetHeader>(
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

      conn.commit();

      return {
        id: creationQueryResult.insertId,
        ...newHydrant,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async update(id: number, updatedHydrant: z.infer<typeof Hydrant>): Promise<HydrantResp | null> {
    const conn: mysql.PoolConnection = await this.pool.getConnection();
    await conn.beginTransaction();
    
    try {
      const [hydrantRows] = await conn.query<HydrantRow[]>(
        `SELECT history_id
        FROM hydrants
        WHERE id = ?`,
        [id],
      );

      const [hydrantRow] = hydrantRows;
      if (hydrantRow === undefined) {
        conn.rollback();
        return null;
      }

      const [historyQueryResult] = await conn.query<ResultSetHeader>(
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

      await conn.query<ResultSetHeader>(
        `UPDATE hydrants
        SET history_id = ?, hydrant = ?, location = ?, inspection_date = ?, defects = ?, checked_by = ?
        WHERE id = ?`,
        [
          historyQueryResult.insertId,
          updatedHydrant.hydrant,
          updatedHydrant.location,
          updatedHydrant.inspection_date,
          updatedHydrant.defects,
          updatedHydrant.checked_by,
          id,
        ],
      );

      conn.commit();

      return {
        id,
        ...updatedHydrant
      }
    } catch (error) {
      conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    const conn: mysql.PoolConnection = await this.pool.getConnection();
    await conn.beginTransaction();

    try {
      const [hydrantRows] = await conn.query<HydrantRow[]>(
        `SELECT history_id From hydrants
        WHERE id = ?`,
        [id],
      );

      const [hydrantRow] = hydrantRows;
      if (hydrantRow === undefined) {
        conn.rollback();
        return false;
      }

      await conn.query<ResultSetHeader>(
        `INSERT INTO history (action, previous_event_id)
        VALUES ('delete', ?)`,
        [hydrantRow.history_id],
      );

      await conn.query<ResultSetHeader>("Delete From hydrants Where id = ?", [id]);

      conn.commit();

      return true;
    } catch (error) {
      conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getHistory(): Promise<HistoryRow[]> {
    const [rows] = await this.pool.query<HistoryRow[]>(
      `SELECT *
      FROM history`
    );
    return rows;
  }
}

export default HydrantService;
