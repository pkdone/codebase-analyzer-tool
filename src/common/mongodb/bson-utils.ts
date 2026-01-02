import { Double } from "bson";

/**
 * Iterates through the numbers in the array and converts each one explicitly to a BSON Double.
 * This works around a MongoDB driver issue where number arrays are not properly converted.
 * @see https://jira.mongodb.org/browse/NODE-5714
 *
 * @param numbers The array of numbers to convert.
 * @returns The array of BSON Doubles.
 */
export function numbersToBsonDoubles(numbers: number[]): Double[] {
  return numbers.map((number) => new Double(number));
}

