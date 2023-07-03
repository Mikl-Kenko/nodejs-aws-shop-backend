import { z } from "zod";

export const schema = z.object({
  title: z.string(),
  autor: z.string().optional().default(""),
  price: z.number().positive().finite(),
  count: z.number().positive().int().finite(),
});
