# JSON Schema Unwrapping Fix

## Problem Diagnosis

The application received an error when processing an LLM response that returned a JSON Schema definition instead of the actual data. 

### Error Details

**Resource:** `buildSrc/src/main/resources/instructions/step13.txt.ftl`

**Error Message:** 
```
LLM response can be turned into JSON but doesn't validate with the supplied JSON schema.
Validation issues: 
- Expected "string" at path ["purpose"] but received "undefined"
- Expected "string" at path ["implementation"] but received "undefined"
```

**Problematic LLM Response:**
```json
{
  "type": "object",
  "properties": {
    "purpose": "This file serves as a template...",
    "implementation": "The file is implemented as..."
  }
}
```

**Expected Structure:**
```json
{
  "purpose": "This file serves as a template...",
  "implementation": "The file is implemented as..."
}
```

### Root Cause

The LLM mistakenly returned a JSON Schema structure (with `"type": "object"` and `"properties"` at the top level) instead of data conforming to the schema. This is a common LLM mistake where it confuses the schema definition with the data format.

## Solution Implemented

### 1. Post-Parse Transformation Function

Created a new module `/src/llm/json-processing/post-parse-transforms.ts` that contains:

- `unwrapJsonSchemaStructure()`: Detects when parsed JSON has the JSON Schema structure and extracts the actual data from the `properties` field.

**Key Features:**
- Only transforms when both `type: "object"` and `properties` exist
- Validates that `properties` is a non-empty object
- Returns unchanged input for all other cases
- Preserves data integrity by only unwrapping valid JSON Schema structures

### 2. Integration into Parsing Pipeline

Modified `/src/llm/json-processing/parse-and-validate-llm-json.ts` to apply the post-parse transformation:

1. **Fast Path**: Applied after direct JSON parsing but before validation
2. **Progressive Path**: Applied after all parsing strategies succeed but before validation

This ensures that JSON Schema structures are unwrapped before schema validation occurs, regardless of which parsing strategy succeeds.

### 3. String-Based Sanitizer (Backup)

Created `/src/llm/json-processing/sanitizers/unwrap-json-schema.ts`:

- A string-based sanitizer that parses JSON, detects the schema pattern, and re-stringifies the unwrapped data
- Added to the resilient sanitization pipeline
- Acts as a backup for cases where the JSON Schema structure appears after other sanitization steps

## Tests Added

### Unit Tests

1. **`tests/llm/sanitizers/unwrap-json-schema.test.ts`** (17 tests)
   - Tests the string-based sanitizer
   - Covers the exact error case from the log
   - Tests nested objects, arrays, and additional metadata fields
   - Validates edge cases that should not be transformed

2. **`tests/llm/json-processing/post-parse-transforms.test.ts`** (17 tests)
   - Tests the post-parse transformation function
   - Covers all transformation scenarios
   - Validates that unchanged inputs return the same object reference
   - Tests with primitives, null, undefined, arrays, and objects

### Integration Tests

3. **`tests/llm/json-processing/unwrap-json-schema-integration.test.ts`** (4 tests)
   - Tests the complete pipeline with the exact error case
   - Verifies JSON Schema with additional metadata fields
   - Ensures normal JSON responses still work correctly
   - Tests JSON Schema wrapped in code fences

**Total New Tests:** 38 tests
**All Tests Status:** ✅ 813 tests passing

## Verification

- ✅ All unit tests pass (813/813)
- ✅ No linting errors
- ✅ TypeScript compilation succeeds
- ✅ Integration tests confirm the exact error case is now handled correctly

## Files Modified

1. `/src/llm/json-processing/parse-and-validate-llm-json.ts` - Added post-parse transformation
2. `/src/llm/json-processing/post-parse-transforms.ts` - NEW: Post-parse transformation logic
3. `/src/llm/json-processing/sanitizers/unwrap-json-schema.ts` - NEW: String-based sanitizer
4. `/tests/llm/sanitizers/unwrap-json-schema.test.ts` - NEW: Unit tests for sanitizer
5. `/tests/llm/json-processing/post-parse-transforms.test.ts` - NEW: Unit tests for transforms
6. `/tests/llm/json-processing/unwrap-json-schema-integration.test.ts` - NEW: Integration tests

## Impact

This fix ensures that when LLMs mistakenly return JSON Schema definitions instead of data, the system automatically detects and corrects this pattern before validation, preventing errors and improving resilience.

The solution is:
- **Non-breaking**: Existing valid responses continue to work unchanged
- **Comprehensive**: Handles the issue at multiple points in the parsing pipeline
- **Well-tested**: 38 new tests cover the fix and edge cases
- **Maintainable**: Clear separation of concerns with dedicated modules

