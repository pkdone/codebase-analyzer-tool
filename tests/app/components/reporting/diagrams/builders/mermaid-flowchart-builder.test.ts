/**
 * Tests for MermaidFlowchartBuilder.
 */

import {
  MermaidFlowchartBuilder,
  SubgraphBuilder,
} from "../../../../../../src/app/components/reporting/diagrams/builders/mermaid-flowchart-builder";
import { GraphValidationError } from "../../../../../../src/app/components/reporting/diagrams/builders/abstract-graph-builder";

describe("MermaidFlowchartBuilder", () => {
  describe("basic construction", () => {
    it("should create an empty flowchart with default direction TB", () => {
      const builder = new MermaidFlowchartBuilder();
      const result = builder.render();

      expect(result).toContain("flowchart TB");
      expect(result).toContain("%%{init:");
    });

    it("should create flowchart with specified direction", () => {
      const builderLR = new MermaidFlowchartBuilder("LR");
      expect(builderLR.render()).toContain("flowchart LR");

      const builderBT = new MermaidFlowchartBuilder("BT");
      expect(builderBT.render()).toContain("flowchart BT");

      const builderRL = new MermaidFlowchartBuilder("RL");
      expect(builderRL.render()).toContain("flowchart RL");
    });

    it("should include style definitions", () => {
      const builder = new MermaidFlowchartBuilder();
      const result = builder.render();

      expect(result).toContain("classDef boundedContext");
      expect(result).toContain("classDef aggregate");
      expect(result).toContain("classDef entity");
      expect(result).toContain("classDef service");
    });
  });

  describe("node creation", () => {
    it("should add a node with default rectangle shape", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("node1", "My Node");
      const result = builder.render();

      expect(result).toContain('node1["My Node"]');
    });

    it("should add nodes with different shapes", () => {
      const builder = new MermaidFlowchartBuilder();
      builder
        .addNode("rect", "Rectangle", "rectangle")
        .addNode("round", "Rounded", "rounded")
        .addNode("stad", "Stadium", "stadium")
        .addNode("hex", "Hexagon", "hexagon")
        .addNode("circ", "Circle", "circle")
        .addNode("rhomb", "Rhombus", "rhombus");

      const result = builder.render();

      expect(result).toContain('rect["Rectangle"]');
      expect(result).toContain('round("Rounded")');
      expect(result).toContain('stad(["Stadium"])');
      expect(result).toContain('hex{{"Hexagon"}}');
      expect(result).toContain('circ(("Circle"))');
      expect(result).toContain('rhomb{"Rhombus"}');
    });

    it("should escape special characters in node labels", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("special", 'Label with <html> & "quotes"');
      const result = builder.render();

      expect(result).toContain("#lt;");
      expect(result).toContain("#gt;");
      expect(result).toContain("#quot;");
    });
  });

  describe("edge creation", () => {
    it("should add a solid edge by default", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addEdge("a", "b");

      const result = builder.render();

      expect(result).toContain("a --> b");
    });

    it("should add edges with different types", () => {
      const builder = new MermaidFlowchartBuilder();
      builder
        .addNode("a", "A")
        .addNode("b", "B")
        .addNode("c", "C")
        .addNode("d", "D")
        .addNode("e", "E")
        .addEdge("a", "b", undefined, "solid")
        .addEdge("b", "c", undefined, "dotted")
        .addEdge("c", "d", undefined, "dashed")
        .addEdge("d", "e", undefined, "invisible");

      const result = builder.render();

      expect(result).toContain("a --> b");
      expect(result).toContain("b -.-> c");
      expect(result).toContain("c -.- d");
      expect(result).toContain("d ~~~ e");
    });

    it("should add edge with label", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addEdge("a", "b", "connects to");

      const result = builder.render();

      expect(result).toContain('a -->|"connects to"| b');
    });

    it("should escape special characters in edge labels", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addEdge("a", "b", "Label <with> special");

      const result = builder.render();

      expect(result).toContain("#lt;with#gt;");
    });
  });

  describe("style application", () => {
    it("should apply style to a node", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("svc", "My Service").applyStyle("svc", "service");

      const result = builder.render();

      expect(result).toContain("class svc service");
    });
  });

  describe("subgraph creation", () => {
    it("should create a basic subgraph", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addSubgraph("sub1", "My Subgraph", (sub) => {
        sub.addNode("inner1", "Inner Node 1");
        sub.addNode("inner2", "Inner Node 2");
      });

      const result = builder.render();

      expect(result).toContain('subgraph sub1["My Subgraph"]');
      expect(result).toContain('inner1["Inner Node 1"]');
      expect(result).toContain('inner2["Inner Node 2"]');
      expect(result).toContain("end");
    });

    it("should create subgraph with direction override", () => {
      const builder = new MermaidFlowchartBuilder("TB");
      builder.addSubgraph(
        "horizontal",
        "Horizontal Layout",
        (sub) => {
          sub.addNode("a", "A").addNode("b", "B");
        },
        "LR",
      );

      const result = builder.render();

      expect(result).toContain("direction LR");
    });

    it("should create subgraph with invisible label", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addSubgraph("invisible", " ", (sub) => {
        sub.addNode("a", "A");
      });

      const result = builder.render();

      expect(result).toContain('subgraph invisible[" "]');
    });

    it("should add edges within subgraph", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addSubgraph("sub", "Subgraph", (sub) => {
        sub.addNode("a", "A").addNode("b", "B").addEdge("a", "b", undefined, "dashed");
      });

      const result = builder.render();

      expect(result).toContain("a -.- b");
    });

    it("should apply styles within subgraph", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addSubgraph("sub", "Subgraph", (sub) => {
        sub.addNode("svc", "Service").applyStyle("svc", "service");
      });

      const result = builder.render();

      expect(result).toContain("class svc service");
    });

    it("should style subgraph container", () => {
      const builder = new MermaidFlowchartBuilder();
      builder
        .addSubgraph("sub", "Subgraph", (sub) => {
          sub.addNode("a", "A");
        })
        .styleSubgraph("sub", "fill:transparent,stroke:transparent");

      const result = builder.render();

      expect(result).toContain("style sub fill:transparent,stroke:transparent");
    });
  });

  describe("complex diagrams", () => {
    it("should create a complete architecture diagram", () => {
      const builder = new MermaidFlowchartBuilder("TB");

      builder
        .addNode("ctx", "Order Context", "hexagon")
        .applyStyle("ctx", "boundedContext")
        .addSubgraph(
          "aggGroup",
          " ",
          (sub) => {
            sub
              .addNode("orderAgg", "Order", "stadium")
              .addNode("orderRepo", "OrderRepository", "circle")
              .addEdge("orderAgg", "orderRepo", undefined, "dashed")
              .applyStyle("orderAgg", "aggregate")
              .applyStyle("orderRepo", "repository");
          },
          "LR",
        )
        .styleSubgraph("aggGroup", "fill:transparent,stroke:transparent,stroke-width:0")
        .addEdge("ctx", "orderAgg");

      const result = builder.render();

      // Verify structure
      expect(result).toContain("flowchart TB");
      expect(result).toContain('ctx{{"Order Context"}}');
      expect(result).toContain("class ctx boundedContext");
      expect(result).toContain('subgraph aggGroup[" "]');
      expect(result).toContain("direction LR");
      expect(result).toContain('orderAgg(["Order"])');
      expect(result).toContain('orderRepo(("OrderRepository"))');
      expect(result).toContain("orderAgg -.- orderRepo");
      expect(result).toContain("class orderAgg aggregate");
      expect(result).toContain("class orderRepo repository");
      expect(result).toContain("style aggGroup fill:transparent,stroke:transparent,stroke-width:0");
      expect(result).toContain("ctx --> orderAgg");
    });

    it("should support method chaining throughout", () => {
      const builder = new MermaidFlowchartBuilder()
        .addNode("a", "A")
        .addNode("b", "B")
        .addEdge("a", "b")
        .applyStyle("a", "entity")
        .applyStyle("b", "aggregate");

      const result = builder.render();

      expect(result).toContain('a["A"]');
      expect(result).toContain('b["B"]');
      expect(result).toContain("a --> b");
      expect(result).toContain("class a entity");
      expect(result).toContain("class b aggregate");
    });
  });

  describe("init directive types", () => {
    it("should use standard init directive by default", () => {
      const builder = new MermaidFlowchartBuilder("TB", "standard");
      const result = builder.render();

      expect(result).toContain("%%{init:");
      expect(result).toContain("diagramPadding");
    });

    it("should use architecture init directive when specified", () => {
      const builder = new MermaidFlowchartBuilder("TB", "architecture");
      const result = builder.render();

      expect(result).toContain("%%{init:");
      expect(result).toContain("nodeSpacing");
      expect(result).toContain("rankSpacing");
    });
  });
});

describe("SubgraphBuilder", () => {
  it("should support method chaining", () => {
    const subBuilder = new SubgraphBuilder();
    subBuilder.addNode("a", "A").addNode("b", "B").addEdge("a", "b").applyStyle("a", "entity");

    expect(subBuilder.getNodes()).toHaveLength(2);
    expect(subBuilder.getEdges()).toHaveLength(1);
    expect(subBuilder.getStyles()).toHaveLength(1);
  });
});

describe("AbstractGraphBuilder validation", () => {
  describe("duplicate node detection", () => {
    it("should throw GraphValidationError when adding duplicate node ID", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("node1", "First Node");

      expect(() => builder.addNode("node1", "Duplicate Node")).toThrow(GraphValidationError);
      expect(() => builder.addNode("node1", "Duplicate Node")).toThrow(
        'Node with id "node1" already exists',
      );
    });

    it("should allow different node IDs", () => {
      const builder = new MermaidFlowchartBuilder();
      expect(() => {
        builder.addNode("node1", "First Node").addNode("node2", "Second Node");
      }).not.toThrow();
    });
  });

  describe("hasNode method", () => {
    it("should return true for existing node", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("myNode", "My Node");

      expect(builder.hasNode("myNode")).toBe(true);
    });

    it("should return false for non-existing node", () => {
      const builder = new MermaidFlowchartBuilder();

      expect(builder.hasNode("nonExistent")).toBe(false);
    });

    it("should work with multiple nodes", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addNode("c", "C");

      expect(builder.hasNode("a")).toBe(true);
      expect(builder.hasNode("b")).toBe(true);
      expect(builder.hasNode("c")).toBe(true);
      expect(builder.hasNode("d")).toBe(false);
    });
  });

  describe("getNode method", () => {
    it("should return node for existing ID", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("myNode", "My Label", "stadium");

      const node = builder.getNode("myNode");

      expect(node).toBeDefined();
      expect(node?.id).toBe("myNode");
      expect(node?.label).toBe("My Label");
      expect(node?.shape).toBe("stadium");
    });

    it("should return undefined for non-existing node", () => {
      const builder = new MermaidFlowchartBuilder();

      expect(builder.getNode("nonExistent")).toBeUndefined();
    });
  });

  describe("strict validation mode", () => {
    it("should not validate edge endpoints by default", () => {
      const builder = new MermaidFlowchartBuilder();

      // This should not throw even though nodes don't exist
      expect(() => {
        builder.addEdge("nonExistentFrom", "nonExistentTo");
      }).not.toThrow();
    });

    it("should throw when strict validation is enabled and from node missing", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.setStrictValidation(true).addNode("target", "Target");

      expect(() => builder.addEdge("nonExistent", "target")).toThrow(GraphValidationError);
      expect(() => builder.addEdge("nonExistent", "target")).toThrow(
        'Edge references non-existent "from" node: "nonExistent"',
      );
    });

    it("should throw when strict validation is enabled and to node missing", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.setStrictValidation(true).addNode("source", "Source");

      expect(() => builder.addEdge("source", "nonExistent")).toThrow(GraphValidationError);
      expect(() => builder.addEdge("source", "nonExistent")).toThrow(
        'Edge references non-existent "to" node: "nonExistent"',
      );
    });

    it("should allow valid edges when strict validation is enabled", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.setStrictValidation(true).addNode("a", "A").addNode("b", "B");

      expect(() => builder.addEdge("a", "b")).not.toThrow();
    });

    it("should support chaining setStrictValidation", () => {
      const builder = new MermaidFlowchartBuilder();
      const result = builder.setStrictValidation(true);

      expect(result).toBe(builder);
    });

    it("should report validation status correctly", () => {
      const builder = new MermaidFlowchartBuilder();

      expect(builder.isStrictValidationEnabled()).toBe(false);

      builder.setStrictValidation(true);
      expect(builder.isStrictValidationEnabled()).toBe(true);

      builder.setStrictValidation(false);
      expect(builder.isStrictValidationEnabled()).toBe(false);
    });
  });

  describe("validateEdges method", () => {
    it("should return empty array when all edges are valid", () => {
      const builder = new MermaidFlowchartBuilder();
      builder
        .addNode("a", "A")
        .addNode("b", "B")
        .addNode("c", "C")
        .addEdge("a", "b")
        .addEdge("b", "c");

      const errors = builder.validateEdges();

      expect(errors).toEqual([]);
    });

    it("should return errors for missing from node", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("target", "Target").addEdge("missing", "target");

      const errors = builder.validateEdges();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"from" node');
      expect(errors[0]).toContain("missing");
    });

    it("should return errors for missing to node", () => {
      const builder = new MermaidFlowchartBuilder();
      builder.addNode("source", "Source").addEdge("source", "missing");

      const errors = builder.validateEdges();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('"to" node');
      expect(errors[0]).toContain("missing");
    });

    it("should return multiple errors for multiple invalid edges", () => {
      const builder = new MermaidFlowchartBuilder();
      builder
        .addNode("a", "A")
        .addEdge("missing1", "a")
        .addEdge("a", "missing2")
        .addEdge("missing3", "missing4");

      const errors = builder.validateEdges();

      expect(errors).toHaveLength(4);
    });

    it("should work with empty graph", () => {
      const builder = new MermaidFlowchartBuilder();

      expect(builder.validateEdges()).toEqual([]);
    });
  });

  describe("SubgraphBuilder validation", () => {
    it("should throw on duplicate node in subgraph", () => {
      const subBuilder = new SubgraphBuilder();
      subBuilder.addNode("inner1", "Inner 1");

      expect(() => subBuilder.addNode("inner1", "Duplicate")).toThrow(GraphValidationError);
    });

    it("should support hasNode in subgraph", () => {
      const subBuilder = new SubgraphBuilder();
      subBuilder.addNode("inner1", "Inner 1");

      expect(subBuilder.hasNode("inner1")).toBe(true);
      expect(subBuilder.hasNode("nonExistent")).toBe(false);
    });

    it("should support strict validation in subgraph", () => {
      const subBuilder = new SubgraphBuilder();
      subBuilder.setStrictValidation(true).addNode("a", "A");

      expect(() => subBuilder.addEdge("a", "nonExistent")).toThrow(GraphValidationError);
    });
  });
});
