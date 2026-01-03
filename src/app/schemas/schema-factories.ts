import { z } from "zod";

/**
 * Factory function to create a Zod schema for name-description pairs.
 * This eliminates duplication of the common pattern where schemas define
 * name and description fields with similar descriptions.
 *
 * @param nameDescription - Description for the name field
 * @param descriptionDescription - Description for the description field
 * @returns A Zod object schema with name and description fields
 */
export function createNameDescSchema(
  nameDescription: string,
  descriptionDescription: string,
): z.ZodObject<{
  name: z.ZodString;
  description: z.ZodString;
}> {
  return z.object({
    name: z.string().describe(nameDescription),
    description: z.string().describe(descriptionDescription),
  });
}
