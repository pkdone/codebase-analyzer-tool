/**
 * Tests for the pure rendering functions in flowchart-renderer.ts.
 * These test the syntax generation logic in isolation from the builder state management.
 */

import {
  renderFlowchart,
  type FlowchartRenderData,
} from "../../../../src/common/diagrams/mermaid/flowchart-renderer";

describe("flowchart-renderer", () => {
  describe("renderFlowchart", () => {
    it("should render a minimal flowchart", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        nodes: [],
        edges: [],
        styles: [],
        subgraphs: [],
        subgraphStyles: [],
      };

      const result = renderFlowchart(data);

      expect(result).toBe("flowchart TB");
    });

    it("should include init directive when provided", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        initDirective: "%%{init: {'flowchart': {'padding': 10}}}%%",
        nodes: [],
        edges: [],
        styles: [],
        subgraphs: [],
        subgraphStyles: [],
      };

      const result = renderFlowchart(data);

      expect(result).toContain("%%{init:");
      expect(result.split("\n")[0]).toBe("%%{init: {'flowchart': {'padding': 10}}}%%");
    });

    it("should include style definitions when provided", () => {
      const data: FlowchartRenderData = {
        direction: "LR",
        styleDefinitions: "classDef myClass fill:#fff",
        nodes: [],
        edges: [],
        styles: [],
        subgraphs: [],
        subgraphStyles: [],
      };

      const result = renderFlowchart(data);

      expect(result).toContain("classDef myClass fill:#fff");
    });

    it("should render nodes and edges", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        nodes: [
          { id: "a", label: "A", shape: "rectangle" },
          { id: "b", label: "B", shape: "rectangle" },
        ],
        edges: [{ from: "a", to: "b", type: "solid" }],
        styles: [],
        subgraphs: [],
        subgraphStyles: [],
      };

      const result = renderFlowchart(data);

      expect(result).toContain('a["A"]');
      expect(result).toContain('b["B"]');
      expect(result).toContain("a --> b");
    });

    it("should render subgraphs", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        nodes: [],
        edges: [],
        styles: [],
        subgraphs: [
          {
            id: "cluster",
            label: "Cluster",
            nodes: [{ id: "inner", label: "Inner", shape: "rectangle" }],
            edges: [],
            styles: [],
          },
        ],
        subgraphStyles: [],
      };

      const result = renderFlowchart(data);

      expect(result).toContain('subgraph cluster["Cluster"]');
      expect(result).toContain("end");
    });

    it("should render node styles", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        nodes: [{ id: "node1", label: "Node", shape: "rectangle" }],
        edges: [],
        styles: [{ nodeId: "node1", className: "highlight" }],
        subgraphs: [],
        subgraphStyles: [],
      };

      const result = renderFlowchart(data);

      expect(result).toContain("class node1 highlight");
    });

    it("should render subgraph styles", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        nodes: [],
        edges: [],
        styles: [],
        subgraphs: [],
        subgraphStyles: [{ subgraphId: "sub1", styleString: "fill:transparent" }],
      };

      const result = renderFlowchart(data);

      expect(result).toContain("style sub1 fill:transparent");
    });

    it("should render complete flowchart with all elements in correct order", () => {
      const data: FlowchartRenderData = {
        direction: "TB",
        initDirective: "%%{init: {}}%%",
        styleDefinitions: "classDef default fill:#fff",
        nodes: [{ id: "top", label: "Top", shape: "rectangle" }],
        edges: [{ from: "top", to: "bottom", type: "solid" }],
        styles: [{ nodeId: "top", className: "default" }],
        subgraphs: [
          {
            id: "sub",
            label: "Sub",
            nodes: [{ id: "bottom", label: "Bottom", shape: "rectangle" }],
            edges: [],
            styles: [],
          },
        ],
        subgraphStyles: [{ subgraphId: "sub", styleString: "stroke:#000" }],
      };

      const result = renderFlowchart(data);
      const lines = result.split("\n");

      // Check ordering
      expect(lines[0]).toBe("%%{init: {}}%%");
      expect(lines[1]).toBe("flowchart TB");
      expect(lines[2]).toBe("classDef default fill:#fff");

      // The rest of the elements should be present
      expect(result).toContain('top["Top"]');
      expect(result).toContain("top --> bottom");
      expect(result).toContain('subgraph sub["Sub"]');
      expect(result).toContain("class top default");
      expect(result).toContain("style sub stroke:#000");
    });
  });
});
