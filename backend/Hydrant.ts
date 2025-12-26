import { type RowDataPacket } from "mysql2/promise";

interface Hydrant {
  hydrant: string;
  inspection_location: string;
  inspection_date: Date | null;
  defects: string | null;
  checked_by: string | null;
}

interface HydrantReq extends Omit<Hydrant, "inspection_location"> {
  location: string;
}

interface HydrantRow extends RowDataPacket {
  id?: number;
  history_id?: number;
  hydrant?: string;
  location?: string;
  inspection_date?: Date;
  defects?: string;
  checked_by?: string;
}

export type { Hydrant, HydrantReq, HydrantRow };
