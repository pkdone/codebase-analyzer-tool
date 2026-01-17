import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";
import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";
import { PARTIAL_ANALYSIS_TEMPLATE } from "../../../src/app/prompts/app-templates";
import { SOURCES_PROMPT_FRAGMENTS } from "../../../src/app/prompts/definitions/sources/sources.fragments";
import { INSTRUCTION_SECTION_TITLES } from "../../../src/app/prompts/definitions/sources/source-instruction-utils";

const fileTypePromptMetadata = appPromptManager.sources;

describe("renderPrompt", () => {
  const javaCodeSample = `package com.acme.myapp.address.ejb;

import javax.ejb.EntityBean;
import javax.ejb.EntityContext;
import javax.ejb.RemoveException;
import javax.ejb.CreateException;
import javax.naming.NamingException;
import javax.naming.InitialContext;

public abstract class AddressEJB implements EntityBean {
  private EntityContext context = null;

  public abstract String getStreetName();
  public abstract void setStreetName(String streetName);
  public abstract String getCity();
  public abstract void setCity(String city);
  public abstract String getState();
  public abstract void setState(String state);
  public abstract String getZipCode();
  public abstract void setZipCode(String zipCode);
  public abstract String getCountry();
  public abstract void setCountry(String country);

  public Object ejbCreate(String streetName, String city,
                          String state, String zipCode, String country) throws CreateException {
    setStreetName(streetName);
    setCity(city);
    setState(state);
    setZipCode(zipCode);
    setCountry(country);
    return null;
  }

  public void ejbPostCreate(String streetName, String city,
                            String state, String zipCode, String country) throws CreateException { }

  public Object ejbCreate(Address address) throws CreateException {
    setStreetName(address.getStreetName());
    setCity(address.getCity());
    setState(address.getState());
    setZipCode(address.getZipCode());
    setCountry(address.getCountry());
    return null;
  }

  public void ejbPostCreate(Address address) throws CreateException { }

  public Object ejbCreate() throws CreateException {
    return null;
  }

  public void ejbPostCreate() throws CreateException { }

  public Address getData() {
    Address address = new Address();
    address.setStreetName(getStreetName());
    address.setCity(getCity());
    address.setState(getState());
    address.setZipCode(getZipCode());
    address.setCountry(getCountry());
    return address;
  }

  public void setEntityContext(EntityContext c) {
    context = c;
  }

  public void unsetEntityContext() {
    context = null;
  }

  public void ejbRemove() throws RemoveException { }
  public void ejbActivate() { }
  public void ejbPassivate() { }
  public void ejbStore() { }
  public void ejbLoad() { }
}`;

  describe("renderPrompt()", () => {
    it("should render prompt correctly with Java file type metadata", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      const renderedPrompt = renderPrompt(javaMetadata, javaCodeSample);

      // Verify template structure is present
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("CODE:");
      expect(renderedPrompt).toContain("```");

      // Verify Java-specific content description
      expect(renderedPrompt).toContain("JVM code");

      // Verify Java code content is included
      expect(renderedPrompt).toContain("package com.acme.myapp.address.ejb");
      expect(renderedPrompt).toContain("public abstract class AddressEJB");
      expect(renderedPrompt).toContain("implements EntityBean");

      // Verify section-based instructions are formatted correctly
      expect(renderedPrompt).toContain(`__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`);
      expect(renderedPrompt).toContain(`__${INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS}__`);
      expect(renderedPrompt).toContain(`__${INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS}__`);
      expect(renderedPrompt).toContain(
        `__${INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS}__`,
      );
      expect(renderedPrompt).toContain(`__${INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS}__`);

      // Verify instruction fragments are included
      expect(renderedPrompt).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(renderedPrompt).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(renderedPrompt).toContain(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(renderedPrompt).toContain(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);

      // Verify JSON schema is present
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain('"type":');
      expect(renderedPrompt).toContain("properties");

      // Verify JSON format enforcement instruction is present
      expect(renderedPrompt).toContain("The response MUST be valid JSON");

      // Verify JSON schema contains Java-specific fields
      const jsonSchemaRegex = /```json\n([\s\S]*?)\n```/;
      const jsonSchemaMatch = jsonSchemaRegex.exec(renderedPrompt);
      expect(jsonSchemaMatch).not.toBeNull();
      if (jsonSchemaMatch) {
        const jsonSchema = JSON.parse(jsonSchemaMatch[1]);
        expect(jsonSchema.properties).toBeDefined();
        // Verify Java-specific schema fields
        expect(jsonSchema.properties.name).toBeDefined();
        expect(jsonSchema.properties.kind).toBeDefined();
        expect(jsonSchema.properties.namespace).toBeDefined();
        expect(jsonSchema.properties.publicFunctions).toBeDefined();
        expect(jsonSchema.properties.databaseIntegration).toBeDefined();
        expect(jsonSchema.properties.integrationPoints).toBeDefined();
      }
    });

    it("should format instruction sections with titles correctly", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      const renderedPrompt = renderPrompt(javaMetadata, javaCodeSample);

      // Verify sections are separated by double newlines
      const basicInfoSection = `__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`;
      const refsSection = `__${INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS}__`;
      const basicInfoIndex = renderedPrompt.indexOf(basicInfoSection);
      const refsIndex = renderedPrompt.indexOf(refsSection);

      expect(basicInfoIndex).toBeGreaterThan(-1);
      expect(refsIndex).toBeGreaterThan(basicInfoIndex);

      // Verify instruction points are included in sections
      expect(renderedPrompt).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(renderedPrompt).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should include all template placeholders correctly", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      const renderedPrompt = renderPrompt(javaMetadata, javaCodeSample);

      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{[a-zA-Z]+\}\}/);

      // Verify all expected content is present
      expect(renderedPrompt).toContain("JVM code"); // Check intro text is rendered
      expect(renderedPrompt).toContain(javaCodeSample);
      expect(renderedPrompt).toContain("The response MUST be valid JSON");
    });

    it("should render PARTIAL_ANALYSIS_TEMPLATE with partial analysis note", () => {
      // Use PARTIAL_ANALYSIS_TEMPLATE for partial analysis scenarios
      const javaMetadata = fileTypePromptMetadata.java;
      const config = {
        contentDesc: "test code",
        instructions: ["test instruction"],
        responseSchema: javaMetadata.responseSchema,
        template: PARTIAL_ANALYSIS_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };

      const renderedPrompt = renderPrompt(config, javaCodeSample);

      // Verify partial analysis note is included (from the template itself)
      expect(renderedPrompt).toContain("partial analysis");
      expect(renderedPrompt).toContain("focus on extracting insights from this subset");

      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should handle custom template placeholder", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      const config = {
        contentDesc: "Test intro text template",
        instructions: ["test instruction"],
        responseSchema: javaMetadata.responseSchema,
        template: `{{customPlaceholder}}Test template`,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };

      // Test that custom placeholder is replaced
      const rendered = renderPrompt(config, javaCodeSample, {
        customPlaceholder: "Custom value - ",
      });
      expect(rendered).toContain("Custom value - Test template");
    });

    it("should handle missing content gracefully", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      const renderedPrompt = renderPrompt(javaMetadata, "");

      // Should still render the template structure
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("CODE:");
    });

    it("should handle undefined values in extras object", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      const renderedPrompt = renderPrompt(javaMetadata, javaCodeSample, {
        someUndefinedValue: undefined,
      });

      // Should render successfully without errors
      expect(renderedPrompt).toContain(javaCodeSample);
      expect(renderedPrompt).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should require content parameter", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      // Content is now a required field in RenderPromptData - provide empty string
      const renderedPrompt = renderPrompt(javaMetadata, "");

      // Template should still render with empty content
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
    });
  });
});
