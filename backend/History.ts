import { type RowDataPacket } from "mysql2/promise";

interface HistoryRow extends RowDataPacket {
  id?: number;
  action?: "create" | "update" | "delete";
  previous_event_id?: number;
  hydrant?: string;
  location?: string;
  inspection_date?: Date;
  defects?: string;
  checked_by?: string;
}

export type { HistoryRow };
