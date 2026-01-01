import * as z from "zod";

import { type RowDataPacket } from "mysql2/promise";

const Hydrant = z.object({
  hydrant: z.string(),
  location: z.string(),
  inspection_date: z.nullable(z.date()),
  defects: z.nullable(z.string()),
  checked_by: z.nullable(z.string()),
});

interface HydrantResp extends z.input<typeof Hydrant> {
  id: number;
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

export { Hydrant, type HydrantResp, type HydrantRow };
