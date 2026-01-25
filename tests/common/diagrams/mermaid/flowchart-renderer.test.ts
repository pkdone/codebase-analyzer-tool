/**
 * Tests for the pure rendering functions in flowchart-renderer.ts.
 * These test the syntax generation logic in isolation from the builder state management.
 */

import {
  renderNode,
  renderEdge,
  renderSubgraph,
  renderFlowchart,
  getShapeSyntax,
  getEdgeSyntax,
  type RenderableSubgraph,
  type FlowchartRenderData,
} from "../../../../src/common/diagrams/mermaid/flowchart-renderer";
import type {
  MermaidNode,
  MermaidEdge,
  NodeShape,
  EdgeType,
} from "../../../../src/common/diagrams/mermaid";

describe("flowchart-renderer", () => {
  describe("getShapeSyntax", () => {
    it("should return correct syntax for rectangle shape", () => {
      const syntax = getShapeSyntax("rectangle");
      expect(syntax).toEqual({ open: "[", close: "]" });
    });

    it("should return correct syntax for rounded shape", () => {
      const syntax = getShapeSyntax("rounded");
      expect(syntax).toEqual({ open: "(", close: ")" });
    });

    it("should return correct syntax for stadium shape", () => {
      const syntax = getShapeSyntax("stadium");
      expect(syntax).toEqual({ open: "([", close: "])" });
    });

    it("should return correct syntax for hexagon shape", () => {
      const syntax = getShapeSyntax("hexagon");
      expect(syntax).toEqual({ open: "{{", close: "}}" });
    });

    it("should return correct syntax for circle shape", () => {
      const syntax = getShapeSyntax("circle");
      expect(syntax).toEqual({ open: "((", close: "))" });
    });

    it("should return correct syntax for rhombus shape", () => {
      const syntax = getShapeSyntax("rhombus");
      expect(syntax).toEqual({ open: "{", close: "}" });
    });

    it("should fall back to rectangle syntax for unknown shapes", () => {
      const syntax = getShapeSyntax("unknown-shape" as NodeShape);
      expect(syntax).toEqual({ open: "[", close: "]" });
    });
  });

  describe("getEdgeSyntax", () => {
    it("should return correct syntax for solid edge", () => {
      expect(getEdgeSyntax("solid")).toBe("-->");
    });

    it("should return correct syntax for dotted edge", () => {
      expect(getEdgeSyntax("dotted")).toBe("-.->");
    });

    it("should return correct syntax for dashed edge", () => {
      expect(getEdgeSyntax("dashed")).toBe("-.-");
    });

    it("should return correct syntax for invisible edge", () => {
      expect(getEdgeSyntax("invisible")).toBe("~~~");
    });

    it("should fall back to solid syntax for unknown edge types", () => {
      expect(getEdgeSyntax("unknown-type" as EdgeType)).toBe("-->");
    });
  });

  describe("renderNode", () => {
    it("should render a basic rectangle node", () => {
      const node: MermaidNode = { id: "node1", label: "My Node", shape: "rectangle" };
      const result = renderNode(node, "    ");
      expect(result).toBe('    node1["My Node"]');
    });

    it("should render a stadium-shaped node", () => {
      const node: MermaidNode = { id: "svc", label: "Service", shape: "stadium" };
      const result = renderNode(node, "  ");
      expect(result).toBe('  svc(["Service"])');
    });

    it("should escape special characters in labels", () => {
      const node: MermaidNode = { id: "special", label: "Label <with> HTML", shape: "rectangle" };
      const result = renderNode(node, "");
      expect(result).toContain("#lt;");
      expect(result).toContain("#gt;");
    });

    it("should apply correct indentation", () => {
      const node: MermaidNode = { id: "test", label: "Test", shape: "rectangle" };
      const result = renderNode(node, "        ");
      expect(result.startsWith("        ")).toBe(true);
    });
  });

  describe("renderEdge", () => {
    it("should render a basic solid edge without label", () => {
      const edge: MermaidEdge = { from: "a", to: "b", type: "solid" };
      const result = renderEdge(edge, "    ");
      expect(result).toBe("    a --> b");
    });

    it("should render an edge with label", () => {
      const edge: MermaidEdge = { from: "a", to: "b", label: "connects", type: "solid" };
      const result = renderEdge(edge, "    ");
      expect(result).toBe('    a -->|"connects"| b');
    });

    it("should render a dotted edge", () => {
      const edge: MermaidEdge = { from: "x", to: "y", type: "dotted" };
      const result = renderEdge(edge, "");
      expect(result).toBe("x -.-> y");
    });

    it("should render a dashed edge", () => {
      const edge: MermaidEdge = { from: "x", to: "y", type: "dashed" };
      const result = renderEdge(edge, "");
      expect(result).toBe("x -.- y");
    });

    it("should escape special characters in edge labels", () => {
      const edge: MermaidEdge = { from: "a", to: "b", label: "label <special>", type: "solid" };
      const result = renderEdge(edge, "");
      expect(result).toContain("#lt;");
      expect(result).toContain("#gt;");
    });
  });

  describe("renderSubgraph", () => {
    it("should render a basic subgraph", () => {
      const subgraph: RenderableSubgraph = {
        id: "sub1",
        label: "My Subgraph",
        nodes: [{ id: "inner", label: "Inner Node", shape: "rectangle" }],
        edges: [],
        styles: [],
      };

      const lines = renderSubgraph(subgraph);

      expect(lines).toContain('    subgraph sub1["My Subgraph"]');
      expect(lines).toContain('        inner["Inner Node"]');
      expect(lines).toContain("    end");
    });

    it("should include direction override when specified", () => {
      const subgraph: RenderableSubgraph = {
        id: "horizontal",
        label: "Horizontal Layout",
        direction: "LR",
        nodes: [],
        edges: [],
        styles: [],
      };

      const lines = renderSubgraph(subgraph);

      expect(lines).toContain("        direction LR");
    });

    it("should render edges within subgraph", () => {
      const subgraph: RenderableSubgraph = {
        id: "sub",
        label: "Sub",
        nodes: [],
        edges: [{ from: "a", to: "b", type: "dashed" }],
        styles: [],
      };

      const lines = renderSubgraph(subgraph);

      expect(lines.some((line) => line.includes("a -.- b"))).toBe(true);
    });

    it("should render styles outside subgraph block", () => {
      const subgraph: RenderableSubgraph = {
        id: "sub",
        label: "Sub",
        nodes: [],
        edges: [],
        styles: [{ nodeId: "node1", className: "myStyle" }],
      };

      const lines = renderSubgraph(subgraph);
      const endIndex = lines.indexOf("    end");
      const styleIndex = lines.findIndex((line) => line.includes("class node1 myStyle"));

      expect(styleIndex).toBeGreaterThan(endIndex);
    });
  });

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
