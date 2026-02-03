/**
 * Tests for createFlowchartBuilder factory.
 * These tests verify that the factory correctly injects app-specific styles and init directives.
 */

import {
  createFlowchartBuilder,
  MermaidFlowchartBuilder,
  SubgraphBuilder,
  GraphValidationError,
} from "../../../../../../src/app/components/reporting/diagrams/builders";

describe("createFlowchartBuilder factory", () => {
  describe("basic construction with app styles", () => {
    it("should create a flowchart with default direction TB", () => {
      const builder = createFlowchartBuilder();
      const result = builder.render();

      expect(result).toContain("flowchart TB");
    });

    it("should create flowchart with specified direction", () => {
      const builderLR = createFlowchartBuilder({ direction: "LR" });
      expect(builderLR.render()).toContain("flowchart LR");

      const builderBT = createFlowchartBuilder({ direction: "BT" });
      expect(builderBT.render()).toContain("flowchart BT");

      const builderRL = createFlowchartBuilder({ direction: "RL" });
      expect(builderRL.render()).toContain("flowchart RL");
    });

    it("should include standard init directive by default", () => {
      const builder = createFlowchartBuilder();
      const result = builder.render();

      expect(result).toContain("%%{init:");
      expect(result).toContain("diagramPadding");
    });

    it("should include spacious init directive when specified", () => {
      const builder = createFlowchartBuilder({ layoutPreset: "spacious" });
      const result = builder.render();

      expect(result).toContain("%%{init:");
      expect(result).toContain("nodeSpacing");
      expect(result).toContain("rankSpacing");
    });

    it("should include app-specific style definitions", () => {
      const builder = createFlowchartBuilder();
      const result = builder.render();

      // Verify app-specific styles are injected
      expect(result).toContain("classDef boundedContext");
      expect(result).toContain("classDef aggregate");
      expect(result).toContain("classDef entity");
      expect(result).toContain("classDef service");
      expect(result).toContain("classDef repository");
    });
  });

  describe("node creation", () => {
    it("should add a node with default rectangle shape", () => {
      const builder = createFlowchartBuilder();
      builder.addNode("node1", "My Node");
      const result = builder.render();

      expect(result).toContain('node1["My Node"]');
    });

    it("should add nodes with different shapes", () => {
      const builder = createFlowchartBuilder();
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
      const builder = createFlowchartBuilder();
      builder.addNode("special", 'Label with <html> & "quotes"');
      const result = builder.render();

      expect(result).toContain("#lt;");
      expect(result).toContain("#gt;");
      expect(result).toContain("#quot;");
    });
  });

  describe("edge creation", () => {
    it("should add a solid edge by default", () => {
      const builder = createFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addEdge("a", "b");

      const result = builder.render();

      expect(result).toContain("a --> b");
    });

    it("should add edges with different types", () => {
      const builder = createFlowchartBuilder();
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
      const builder = createFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addEdge("a", "b", "connects to");

      const result = builder.render();

      expect(result).toContain('a -->|"connects to"| b');
    });

    it("should escape special characters in edge labels", () => {
      const builder = createFlowchartBuilder();
      builder.addNode("a", "A").addNode("b", "B").addEdge("a", "b", "Label <with> special");

      const result = builder.render();

      expect(result).toContain("#lt;with#gt;");
    });
  });

  describe("style application", () => {
    it("should apply style to a node", () => {
      const builder = createFlowchartBuilder();
      builder.addNode("svc", "My Service").applyStyle("svc", "service");

      const result = builder.render();

      expect(result).toContain("class svc service");
    });
  });

  describe("subgraph creation", () => {
    it("should create a basic subgraph", () => {
      const builder = createFlowchartBuilder();
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
      const builder = createFlowchartBuilder({ direction: "TB" });
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
      const builder = createFlowchartBuilder();
      builder.addSubgraph("invisible", " ", (sub) => {
        sub.addNode("a", "A");
      });

      const result = builder.render();

      expect(result).toContain('subgraph invisible[" "]');
    });

    it("should add edges within subgraph", () => {
      const builder = createFlowchartBuilder();
      builder.addSubgraph("sub", "Subgraph", (sub) => {
        sub.addNode("a", "A").addNode("b", "B").addEdge("a", "b", undefined, "dashed");
      });

      const result = builder.render();

      expect(result).toContain("a -.- b");
    });

    it("should apply styles within subgraph", () => {
      const builder = createFlowchartBuilder();
      builder.addSubgraph("sub", "Subgraph", (sub) => {
        sub.addNode("svc", "Service").applyStyle("svc", "service");
      });

      const result = builder.render();

      expect(result).toContain("class svc service");
    });

    it("should style subgraph container", () => {
      const builder = createFlowchartBuilder();
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
      const builder = createFlowchartBuilder({ direction: "TB" });

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
      const builder = createFlowchartBuilder()
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
});

describe("Re-exported types from common module", () => {
  it("should re-export MermaidFlowchartBuilder class", () => {
    expect(MermaidFlowchartBuilder).toBeDefined();
    const builder = new MermaidFlowchartBuilder();
    expect(builder.render()).toContain("flowchart TB");
  });

  it("should re-export SubgraphBuilder class", () => {
    expect(SubgraphBuilder).toBeDefined();
    const subBuilder = new SubgraphBuilder();
    subBuilder.addNode("a", "A");
    expect(subBuilder.getNodes()).toHaveLength(1);
  });

  it("should re-export GraphValidationError class", () => {
    expect(GraphValidationError).toBeDefined();
    const builder = new MermaidFlowchartBuilder();
    builder.addNode("a", "A");
    expect(() => builder.addNode("a", "Duplicate")).toThrow(GraphValidationError);
  });
});
