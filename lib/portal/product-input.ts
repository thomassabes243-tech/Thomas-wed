import { z } from "zod";

export const PortalProductInput = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.union([z.literal(""), z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)]).optional(),
}).strict();
