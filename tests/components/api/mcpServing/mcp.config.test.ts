import { mcpConfig } from "../../../../src/components/api/mcpServing/mcp.config";

describe("mcpConfig JSON-RPC constants", () => {
  it("should define JSONRPC_PARSE_ERROR", () => {
    expect(mcpConfig.JSONRPC_PARSE_ERROR).toBe(-32700);
  });
});
