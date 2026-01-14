import * as z from "zod";

const Hydrant = z.object({
  id: z.number(),
  hydrant: z.string(),
  location: z.string(),
  inspection_date: z.coerce.date(),
  defects: z.nullable(z.string()),
  checked_by: z.string(),
});

type HydrantDisplay = Omit<
  z.infer<typeof Hydrant>,
  "inspection_date" | "checked_by"
> & {
  srNo: number;
  date: Date;
  checkedBy: string;
};

export { Hydrant, type HydrantDisplay };
