/**
 * Property name inference utilities for JSON sanitization.
 * Provides functions for inferring and validating property names using schema metadata.
 *
 * These utilities are used by replacement rules to intelligently repair truncated
 * or corrupted property names in malformed JSON.
 */

import { matchPropertyName, inferFromShortFragment } from "./property-name-matcher";

/**
 * Common property names used as fallback when no schema is available.
 * These are the most frequently occurring property names in JSON data structures.
 */
const COMMON_PROPERTY_NAMES = [
  "name",
  "type",
  "value",
  "id",
  "key",
  "kind",
  "text",
  "purpose",
] as const;

/**
 * Infers a property name from a truncated fragment using schema metadata when available.
 * Falls back to common short fragment inference or generic "name" default.
 *
 * Inference strategies (in order of preference):
 * 1. Dynamic matching against known properties from schema
 * 2. Inference from common short fragments (e.g., "na" -> "name")
 * 3. Fallback to "name" as the most common property name
 *
 * @param fragment - The truncated property name fragment
 * @param knownProperties - List of known property names from schema (optional)
 * @returns The inferred property name
 *
 * @example
 * // With schema properties
 * inferPropertyName("na", ["name", "namespace"]) // "name"
 *
 * @example
 * // Without schema (uses common patterns)
 * inferPropertyName("ty") // "type"
 *
 * @example
 * // Unknown fragment defaults to "name"
 * inferPropertyName("xyz") // "name"
 */
export function inferPropertyName(fragment: string, knownProperties?: readonly string[]): string {
  // Strategy 1: If we have known properties, try dynamic matching
  if (knownProperties && knownProperties.length > 0) {
    const matchResult = matchPropertyName(fragment, knownProperties);
    if (matchResult.matched && matchResult.confidence > 0.5) {
      return matchResult.matched;
    }
  }

  // Strategy 2: Try inference from common short fragments
  const inferred = inferFromShortFragment(fragment, knownProperties);
  if (inferred) {
    return inferred;
  }

  // Strategy 3: Fallback to "name" as the most common property name
  return "name";
}

/**
 * Checks if a property name is known based on schema metadata.
 * When no schema is available, falls back to checking against common property names.
 *
 * @param propertyName - The property name to check
 * @param knownProperties - List of known property names from schema (optional)
 * @returns True if the property is known or matches a common property name
 *
 * @example
 * // With schema
 * isKnownProperty("userId", ["userId", "email"]) // true
 * isKnownProperty("foo", ["userId", "email"]) // false
 *
 * @example
 * // Without schema (checks common properties)
 * isKnownProperty("name") // true
 * isKnownProperty("type") // true
 * isKnownProperty("foo") // false
 */
export function isKnownProperty(
  propertyName: string,
  knownProperties?: readonly string[],
): boolean {
  if (!knownProperties || knownProperties.length === 0) {
    // No schema available, use hardcoded common property names
    return COMMON_PROPERTY_NAMES.includes(
      propertyName.toLowerCase() as (typeof COMMON_PROPERTY_NAMES)[number],
    );
  }
  return knownProperties.some((p) => p.toLowerCase() === propertyName.toLowerCase());
}
