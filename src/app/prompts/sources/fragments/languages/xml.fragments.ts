/**
 * XML-specific instruction fragments.
 */
export const XML_SPECIFIC_FRAGMENTS = {
  UI_FRAMEWORK_DETECTION: `UI Frameworks Detection (REQUIRED for web application config files)
If this XML file is a web application configuration file, you MUST analyze and identify the UI framework:
  * Struts Framework Detection:
    - Look for <servlet-class> containing "org.apache.struts.action.ActionServlet" or "StrutsPrepareAndExecuteFilter"
    - Check for <servlet-name> with "action" or "struts"
    - Look for DOCTYPE or root element referencing struts-config
    - Extract version from DTD/XSD if available (e.g., "struts-config_1_3.dtd" => version "1.3")
    - If detected, provide: { name: "Struts", version: "X.X" (if found) }
  * JSF (JavaServer Faces) Framework Detection:
    - Look for <servlet-class> containing "javax.faces.webapp.FacesServlet" or "jakarta.faces.webapp.FacesServlet"
    - Check for root element <faces-config> in faces-config.xml
    - Extract version from namespace (e.g., "http://xmlns.jcp.org/xml/ns/javaee" with version="2.2")
    - If detected, provide: { name: "JSF", version: "X.X" (if found) }
  * Spring MVC Framework Detection:
    - Look for <servlet-class> containing "org.springframework.web.servlet.DispatcherServlet"
    - Check for root element containing "http://www.springframework.org/schema/mvc"
    - Look for annotations like @Controller, @RequestMapping in servlet definitions
    - If detected, provide: { name: "Spring MVC", version: <if identifiable> }
If a UI framework is detected, populate the uiFramework field. Otherwise, omit the field entirely from the JSON response.`,
} as const;
