/**
 * JSP-specific instruction fragments.
 */
export const JSP_SPECIFIC_FRAGMENTS = {
  DATA_INPUT_FIELDS:
    "A list of data input fields it contains (if any). For each field, provide its name (or an approximate name), its type (e.g., 'text', 'hidden', 'password'), and a detailed description of its purpose",
  JSP_METRICS_ANALYSIS: `JSP Metrics Analysis (REQUIRED for all JSP files)
You MUST analyze and provide the following JSP metrics in the jspMetrics object:
  * scriptletCount (REQUIRED): Count the exact number of Java scriptlets (<% ... %>) in this file
  * expressionCount (REQUIRED): Count the exact number of expressions (<%= ... %>) in this file
  * declarationCount (REQUIRED): Count the exact number of declarations (<%! ... %>) in this file
  * customTags (REQUIRED if any exist): For each <%@ taglib ... %> directive, extract:
    - prefix: The tag library prefix from the taglib directive
    - uri: The URI of the tag library from the taglib directive
   Examples:
    - <%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %> => { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }
    - <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %> => { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" }
    - <%@ taglib prefix="custom" uri="/WEB-INF/custom.tld" %> => { prefix: "custom", uri: "/WEB-INF/custom.tld" }
   Note: Do NOT count directive tags (<%@ ... %>) or action tags (<jsp:... />) as scriptlets. Only count code blocks with <% %>, <%= %>, and <%! %>.`,
} as const;
