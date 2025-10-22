Here is a set of recommendations and a step-by-step plan to achieve a modern, interactive, and self-contained report with the MongoDB theme.

Recommendations Overview

Navigation: We will implement a tabbed navigation bar. This immediately solves the "monolithic report" problem by splitting content into logical, view-on-demand sections.
Visual Theme: We will replace the current CSS with a new theme based on the MongoDB brand palette (greens, dark greys, and clean whites) for a more professional look.
Data Visualization: We will convert the "Integration Points" and "Database Stored Procedures & Triggers" tables into a more visual "card" layout. The "Database Interactions" table will be retained but styled by the new theme to look cleaner.
Offline Capability: The plan ensures all CSS and JavaScript are embedded directly into the final generated HTML file. This makes the report a single, self-contained file that requires no internet access.
Duplicate Table: I analyzed the generator code you provided (src/components/reporting/templates/main.ejs) and could not find the duplicated "Database Interactions" table you mentioned. It appears this may have already been fixed in the version of the source code you sent me, as the partial is only included once.

Implementation Plan

Here are the specific code changes to implement these recommendations.

Step 1: Modify src/components/reporting/templates/style.css

First, replace the entire content of src/components/reporting/templates/style.css with the new MongoDB-themed CSS below. This new style sheet includes all rules for the new theme, the tabbed navigation, and the card layouts.

CSS


/* === MongoDB Theme & New CAT Report Styles === */

:root {
  /* MongoDB Color Palette */
  --mdb-green-light: #00ED64;
  --mdb-green-dark: #00684A;
  --mdb-black: #001E2B;
  --mdb-grey-dark-1: #3F3E42;
  --mdb-grey-light-1: #C1C7C6;
  --mdb-grey-light-2: #E8EDEB;
  --mdb-white: #FFFFFF;

  /* Semantic Colors */
  --bg-color: var(--mdb-white);
  --text-color: var(--mdb-black);
  --text-color-secondary: var(--mdb-grey-dark-1);
  --header-bg: var(--mdb-green-dark);
  --header-text: var(--mdb-white);
  --tab-bg: var(--mdb-grey-light-2);
  --tab-active-bg: var(--mdb-white);
  --tab-active-border: var(--mdb-green-dark);
  --table-header-bg: var(--mdb-grey-dark-1);
  --table-row-stripe: var(--mdb-grey-light-2);
  --card-bg: var(--mdb-white);
  --card-border: #E0E0E0;
  --card-shadow: 0 2px 5px rgba(0, 30, 43, 0.05);
  --badge-proc-bg: #E8F5E9; /* Light Green */
  --badge-proc-text: #00684A;
  --badge-trig-bg: #FFF3E0; /* Light Orange */
  --badge-trig-text: #E65100;
  --link-color: var(--mdb-green-dark);
  
  /* Typography & Spacing */
  --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

/* --- Base & Typography --- */
body {
  font-family: var(--font-family);
  color: var(--text-color);
  background-color: var(--bg-color);
  line-height: 1.6;
  margin: 0;
  padding: var(--spacing-lg);
}

h1 {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--mdb-green-light);
}

h2 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color);
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--card-border);
}

h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--header-bg);
}

p {
  font-size: 1rem;
  margin-bottom: var(--spacing-md);
  color: var(--text-color-secondary);
}

hr {
  border: none;
  height: 1px;
  background-color: var(--card-border);
  margin: var(--spacing-lg) 0;
}

a {
  color: var(--link-color);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

code, pre {
  font-family: var(--font-family-mono);
}

pre > code {
  display: block;
  background-color: var(--tab-bg);
  border: 1px solid var(--card-border);
  padding: 12px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* --- Tab Navigation --- */
nav.tabs {
  display: flex;
  flex-wrap: wrap;
  background-color: var(--tab-bg);
  border-radius: 8px;
  padding: 6px;
  margin-bottom: var(--spacing-lg);
}

.tab-button {
  font-family: var(--font-family);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 10px 16px;
  margin: 4px;
  border: none;
  background-color: transparent;
  color: var(--text-color-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.tab-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tab-button.active {
  background-color: var(--tab-active-bg);
  color: var(--text-color);
  box-shadow: var(--card-shadow);
  border-bottom: 3px solid var(--tab-active-border);
}

.tab-content {
  display: none;
  animation: fadeIn 0.3s ease;
}

.tab-content.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Styled Tables (for 'Database Interactions') --- */
table.data-table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: var(--spacing-lg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  overflow: hidden; /* For border-radius */
  box-shadow: var(--card-shadow);
}

.data-table th, .data-table td {
  border: 1px solid var(--card-border);
  padding: 12px 16px;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  background-color: var(--table-header-bg);
  color: var(--header-text);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tr:nth-child(even) {
  background-color: var(--table-row-stripe);
}

.data-table tr:hover {
  background-color: #f0f0f0;
}

/* --- Card Layout (for 'Integration Points' & 'Procs/Triggers') --- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.info-card {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: var(--spacing-md);
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
}

.info-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-card p {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.info-card p strong {
  color: var(--text-color);
  font-weight: 600;
  min-width: 90px;
  display: inline-block;
}

.info-card .badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  text-transform: uppercase;
}

.badge-proc {
  background-color: var(--badge-proc-bg);
  color: var(--badge-proc-text);
}

.badge-trig {
  background-color: var(--badge-trig-bg);
  color: var(--badge-trig-text);
}

.card-code {
  margin-top: auto; /* Pushes code block to the bottom */
  padding-top: 12px;
}



Step 2: Modify src/components/reporting/templates/main.ejs

Now, let's update the main template to use this CSS and add the tabbed navigation structure and the required JavaScript.
A. Replace CSS Link:
In src/components/reporting/templates/main.ejs, find and replace the existing <link> tag:

HTML


<link rel="stylesheet" href="style.css">


...with an inline <style> tag that embeds the CSS directly. This is critical for the offline, single-file requirement.

HTML


<style>
  /* === MongoDB Theme & New CAT Report Styles === */

  :root {
    /* MongoDB Color Palette */
    --mdb-green-light: #00ED64;
    --mdb-green-dark: #00684A;
    --mdb-black: #001E2B;
    --mdb-grey-dark-1: #3F3E42;
    --mdb-grey-light-1: #C1C7C6;
    --mdb-grey-light-2: #E8EDEB;
    --mdb-white: #FFFFFF;

    /* Semantic Colors */
    --bg-color: var(--mdb-white);
    --text-color: var(--mdb-black);
    --text-color-secondary: var(--mdb-grey-dark-1);
    --header-bg: var(--mdb-green-dark);
    --header-text: var(--mdb-white);
    --tab-bg: var(--mdb-grey-light-2);
    --tab-active-bg: var(--mdb-white);
    --tab-active-border: var(--mdb-green-dark);
    --table-header-bg: var(--mdb-grey-dark-1);
    --table-row-stripe: var(--mdb-grey-light-2);
    --card-bg: var(--mdb-white);
    --card-border: #E0E0E0;
    --card-shadow: 0 2px 5px rgba(0, 30, 43, 0.05);
    --badge-proc-bg: #E8F5E9; /* Light Green */
    --badge-proc-text: #00684A;
    --badge-trig-bg: #FFF3E0; /* Light Orange */
    --badge-trig-text: #E65100;
    --link-color: var(--mdb-green-dark);
    
    /* Typography & Spacing */
    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    --spacing-md: 16px;
    --spacing-lg: 24px;
  }

  /* --- Base & Typography --- */
  body {
    font-family: var(--font-family);
    color: var(--text-color);
    background-color: var(--bg-color);
    line-height: 1.6;
    margin: 0;
    padding: var(--spacing-lg);
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: var(--spacing-md);
    padding-bottom: var(--spacing-md);
    border-bottom: 2px solid var(--mdb-green-light);
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-color);
    margin-top: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--card-border);
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--header-bg);
  }

  p {
    font-size: 1rem;
    margin-bottom: var(--spacing-md);
    color: var(--text-color-secondary);
  }

  hr {
    border: none;
    height: 1px;
    background-color: var(--card-border);
    margin: var(--spacing-lg) 0;
  }

  a {
    color: var(--link-color);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }

  code, pre {
    font-family: var(--font-family-mono);
  }

  pre > code {
    display: block;
    background-color: var(--tab-bg);
    border: 1px solid var(--card-border);
    padding: 12px;
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* --- Tab Navigation --- */
  nav.tabs {
    display: flex;
    flex-wrap: wrap;
    background-color: var(--tab-bg);
    border-radius: 8px;
    padding: 6px;
    margin-bottom: var(--spacing-lg);
  }

  .tab-button {
    font-family: var(--font-family);
    font-size: 0.9rem;
    font-weight: 600;
    padding: 10px 16px;
    margin: 4px;
    border: none;
    background-color: transparent;
    color: var(--text-color-secondary);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .tab-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .tab-button.active {
    background-color: var(--tab-active-bg);
    color: var(--text-color);
    box-shadow: var(--card-shadow);
    border-bottom: 3px solid var(--tab-active-border);
  }

  .tab-content {
    display: none;
    animation: fadeIn 0.3s ease;
  }

  .tab-content.active {
    display: block;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- Styled Tables (for 'Database Interactions') --- */
  table.data-table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: var(--spacing-lg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    overflow: hidden; /* For border-radius */
    box-shadow: var(--card-shadow);
  }

  .data-table th, .data-table td {
    border: 1px solid var(--card-border);
    padding: 12px 16px;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word; /* Ensure long content wraps */
  }

  .data-table th {
    background-color: var(--table-header-bg);
    color: var(--header-text);
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .data-table tr:nth-child(even) {
    background-color: var(--table-row-stripe);
  }

  .data-table tr:hover {
    background-color: #f0f0f0;
  }

  /* --- Card Layout (for 'Integration Points' & 'Procs/Triggers') --- */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .info-card {
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: var(--spacing-md);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
  }

  .info-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--card-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-card p {
    font-size: 0.9rem;
    color: var(--text-color-secondary);
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .info-card p strong {
    color: var(--text-color);
    font-weight: 600;
    min-width: 90px;
    display: inline-block;
  }

  .info-card .badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 12px;
    text-transform: uppercase;
  }

  .badge-proc {
    background-color: var(--badge-proc-bg);
    color: var(--badge-proc-text);
  }

  .badge-trig {
    background-color: var(--badge-trig-bg);
    color: var(--badge-trig-text);
  }
  
  .card-code {
    margin-top: auto; /* Pushes code block to the bottom */
    padding-top: 12px;
  }
</style>


B. Modify src/components/reporting/html-report-writer.ts:
To make this work, you must delete the copyCssFile method and the call to it from writeHTMLReportFile.
Delete this entire method from src/components/reporting/html-report-writer.ts:
TypeScript
private async copyCssFile(htmlFilePath: string): Promise<void> { 
  try { 
    const outputDir = path.dirname(htmlFilePath); 
    const cssSourcePath = path.join(__dirname, outputConfig.HTML_TEMPLATES_DIR, "style.css"); 
    const cssDestPath = path.join(outputDir, "style.css");
    await fs.copyFile(cssSourcePath, cssDestPath);
    console.log(`CSS file copied to: ${cssDestPath}`); 
  } catch (error) { 
    console.error("Failed to copy CSS file:", error); 
  } 
}


Delete this line from the writeHTMLReportFile method:
TypeScript
await this.copyCssFile(htmlFilePath);


C. Add Tab HTML and Content Wrappers to src/components/reporting/templates/main.ejs:
Inside the <body> tag, add the following <nav> block directly after the <hr/>:

HTML


<nav class="tabs">
  <button class="tab-button active" data-target="tab-stats">App Statistics</button>
  <button class="tab-button" data-target="tab-tech">Technologies</button>
  <button class="tab-button" data-target="tab-processes">Business Processes</button>
  <button class="tab-button" data-target="tab-domain">Domain Model</button>
  <button class="tab-button" data-target="tab-microservices">Microservices</button>
  <button class="tab-button" data-target="tab-bom">Bill of Materials</button>
  <button class="tab-button" data-target="tab-quality">Code Quality</button>
  <button class="tab-button" data-target="tab-jobs">Scheduled Jobs</button>
  <button class="tab-button" data-target="tab-coupling">Module Coupling</button>
  <button class="tab-button" data-target="tab-ui">UI Analysis</button>
  <button class="tab-button" data-target="tab-db">Database</button>
  <button class="tab-button" data-target="tab-integrations">Integration Points</button>
  <button class="tab-button" data-target="tab-java">Java Classes</button>
</nav>

<div id="tab-stats" class="tab-content active">
  <%- include('partials/app-statistics', { appStats: appStats, jsonFilesConfig: jsonFilesConfig }) %>
  <%- include('partials/file-types-summary', { 
    fileTypesData: fileTypesData, 
    fileTypesPieChartPath: fileTypesPieChartPath, 
    fileTypesTableViewModel: fileTypesTableViewModel, 
    jsonFilesConfig: jsonFilesConfig 
  }) %>
</div>

<div id="tab-tech" class="tab-content">
  <% categorizedData.forEach(category => { %>
    <% if (category.category === 'technologies') { %>
      <%- include('partials/technologies', { 
        label: category.label, 
        jsonFile: jsonFilesConfig.getCategoryJSONFilename(category.category), 
        data: category.data 
      }) %>
    <% } %>
  <% }); %>
</div>

<div id="tab-processes" class="tab-content">
  <% if (businessProcessesFlowchartSvgs && businessProcessesFlowchartSvgs.length > 0) { %>
    <%- include('partials/business-processes', { 
      label: 'Existing Business Processes', 
      jsonFile: jsonFilesConfig.getCategoryJSONFilename('businessProcesses'), 
      data: categorizedData.find(c => c.category === 'businessProcesses')?.data || [], 
      flowchartSvgs: businessProcessesFlowchartSvgs, 
      tableViewModel: categorizedData.find(c => c.category === 'businessProcesses')?.tableViewModel 
    }) %>
  <% } %>
</div>

<div id="tab-domain" class="tab-content">
  <% if (domainModelData && domainModelData.boundedContexts.length > 0) { %>
    <%- include('partials/domain-model-diagrams', { 
      domainModelData: domainModelData, 
      contextDiagramSvgs: contextDiagramSvgs 
    }) %>
  <% } %>
  <% categorizedData.forEach(category => { %>
    <% if (['boundedContexts', 'aggregates', 'entities', 'repositories'].includes(category.category)) { %>
      <%- include('partials/category-table', { 
        category: category.category, 
        label: category.label, 
        data: category.data, 
        tableViewModel: category.tableViewModel, 
        convertToDisplayName: convertToDisplayName, 
        jsonFilesConfig: jsonFilesConfig 
      }) %>
    <% } %>
  <% }); %>
</div>

<div id="tab-microservices" class="tab-content">
  <% if (microservicesData && microservicesData.length > 0) { %>
    <%- include('partials/microservices-architecture', { 
      microservicesData: microservicesData, 
      architectureDiagramSvg: architectureDiagramSvg, 
      integrationPointsTableViewModel: integrationPointsTableViewModel 
    }) %>
  <% } %>
</div>

<div id="tab-bom" class="tab-content">
  <%- include('partials/section-header', { title: 'Bill of Materials (Dependencies)', jsonFile: 'bill-of-materials.json' }) %>
  <%- include('partials/bom', { bomData: billOfMaterials, bomStats: bomStatistics }) %>
</div>

<div id="tab-quality" class="tab-content">
  <%- include('partials/section-header', { title: 'Code Quality Summary', jsonFile: 'code-quality-summary.json' }) %>
  <%- include('partials/code-quality', { codeQualitySummary: codeQualitySummary }) %>
</div>

<div id="tab-jobs" class="tab-content">
  <% if (scheduledJobsSummary && scheduledJobsSummary.jobs.length > 0) { %>
    <%- include('partials/section-header', { title: 'Scheduled Jobs and Batch Processes', jsonFile: 'scheduled-jobs-summary.json' }) %>
    <%- include('partials/scheduled-jobs', { jobsData: scheduledJobsSummary, jobsStats: jobsStatistics }) %>
  <% } %>
</div>

<div id="tab-coupling" class="tab-content">
  <% if (moduleCoupling && moduleCoupling.couplings.length > 0) { %>
    <%- include('partials/section-header', { title: 'Module Coupling Analysis', jsonFile: 'module-coupling.json' }) %>
    <%- include('partials/module-coupling', { couplingData: moduleCoupling, couplingStats: couplingStatistics }) %>
  <% } %>
</div>

<div id="tab-ui" class="tab-content">
  <%- include('partials/section-header', { title: 'UI Technology Deep-Dive Analysis', jsonFile: 'ui-technology-analysis.json' }) %>
  <%- include('partials/ui-analysis', { uiData: uiTechnologyAnalysis }) %>
</div>

<div id="tab-db" class="tab-content">
  <%- include('partials/db-integrations', { 
    dbInteractions: dbInteractions, 
    procsAndTriggers: procsAndTriggers, 
    dbInteractionsTableViewModel: dbInteractionsTableViewModel, 
    procsAndTriggersTableViewModel: procsAndTriggersTableViewModel, 
    convertToDisplayName: convertToDisplayName, 
    jsonFilesConfig: jsonFilesConfig 
  }) %>
</div>

<div id="tab-integrations" class="tab-content">
  <%- include('partials/integration-points', { 
    integrationPoints: integrationPoints, 
    integrationPointsTableViewModel: integrationPointsTableViewModel, 
    jsonFilesConfig: jsonFilesConfig 
  }) %>
</div>

<div id="tab-java" class="tab-content">
  <%- include('partials/top-level-java-classes', { 
    topLevelJavaClasses: topLevelJavaClasses, 
    topLevelJavaClassesTableViewModel: topLevelJavaClassesTableViewModel, 
    jsonFilesConfig: jsonFilesConfig 
  }) %>
</div>



D. Add JavaScript to src/components/reporting/templates/main.ejs:
Add this <script> block just before the closing </body> tag:

HTML


<script>
  document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        // Get the target content ID from the button's data-target attribute
        const targetId = tab.getAttribute("data-target");
        const targetContent = document.getElementById(targetId);

        // Remove 'active' class from all tabs and contents
        tabs.forEach(t => t.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));

        // Add 'active' class to the clicked tab and its content
        tab.classList.add("active");
        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });
  });
</script>
</body>



Step 3: Modify src/components/reporting/templates/partials/integration-points.ejs

Replace the entire content of this file with the new card-based layout. This will be much more readable than the wide table.

HTML


<%- include('section-header', { title: 'Integration Points', jsonFile: jsonFilesConfig.jsonDataFiles.integrationPoints }) %>

<% if (integrationPoints && integrationPoints.length > 0) { %>
  <div class="card-grid">
    <% integrationPoints.forEach(item => { %>
      <div class="info-card">
        <h3><%= item.name %></h3>
        <p><strong>Namespace:</strong> <code><%= item.namespace %></code></p>
        <p><strong>Mechanism:</strong> <code><%= item.mechanism %></code></p>
        <p><strong>Direction:</strong> <%= item.direction || 'N/A' %></p>
        <p><strong>Path/Topic:</strong> <code><%= item.path || item.queueOrTopicName || 'N/A' %></code></p>
        <p><strong>Description:</strong> <%= item.description %></p>
      </div>
    <% }); %>
  </div>
<% } else { %>
  <p>No integration points found.</p>
<% } %>



Step 4: Modify src/components/reporting/templates/partials/db-integrations.ejs

Replace the entire content of this file. We will keep the "Database Interactions" as a styled table (since the new CSS handles it) but render the "Stored Procedures & Triggers" in the new card layout.

HTML


<%- include('section-header', { title: 'Database Interactions', jsonFile: jsonFilesConfig.jsonDataFiles.dbInteractions }) %>

<% if (dbInteractions && dbInteractions.length > 0) { %>
  <table class="data-table"> <thead>
      <tr>
        <th class="col-medium">Path</th>
        <th class="col-small">Mechanism</th>
        <th class="col-description">Description</th>
        <th class="col-wide">Code Example</th>
      </tr>
    </thead>
    <tbody>
      <% dbInteractions.forEach(item => { %>
        <tr>
          <td><code><%= item.path %></code></td>
          <td><%= item.mechanism %></td>
          <td><%= item.description %></td>
          <td>
            <pre><code class="language-sql"><%= item.codeExample %></code></pre>
          </td>
        </tr>
      <% }); %>
    </tbody>
  </table>
<% } else { %>
  <p>No database interactions found.</p>
<% } %>

<%- include('section-header', { title: 'Database Stored Procedures & Triggers', jsonFile: jsonFilesConfig.jsonDataFiles.procsAndTriggers }) %>

<div class="stats-grid">
  <div class="card">
    <span class="card-title">Stored Procedures</span>
    <span class="card-value"><%= procsAndTriggers.procs.total %></span>
  </div>
  <div class="card">
    <span class="card-title">Triggers</span>
    <span class="card-value"><%= procsAndTriggers.trigs.total %></span>
  </div>
  <div class="card">
    <span class="card-title">Low Complexity</span>
    <span class="card-value"><%= procsAndTriggers.procs.low + procsAndTriggers.trigs.low %></span>
  </div>
  <div class="card">
    <span class="card-title">Medium Complexity</span>
    <span class="card-value"><%= procsAndTriggers.procs.medium + procsAndTriggers.trigs.medium %></span>
  </div>
  <div class="card">
    <span class="card-title">High Complexity</span>
    <span class="card-value"><%= procsAndTriggers.procs.high + procsAndTriggers.trigs.high %></span>
  </div>
</div>

<% const combinedProcsTrigsList = [ ...procsAndTriggers.procs.list, ...procsAndTriggers.trigs.list ]; %>

<% if (combinedProcsTrigsList && combinedProcsTrigsList.length > 0) { %>
  <div class="card-grid">
    <% combinedProcsTrigsList.forEach(item => { %>
      <div class="info-card">
        <h3>
          <%= item.functionName %>
          <% if (item.type === 'STORED PROCEDURE') { %>
            <span class="badge badge-proc">Procedure</span>
          <% } else { %>
            <span class="badge badge-trig">Trigger</span>
          <% } %>
        </h3>
        <p><strong>Path:</strong> <code><%= item.path %></code></p>
        <p><strong>Complexity:</strong> <%= item.complexity %> (<%= item.complexityReason %>)</p>
        <p><strong>Lines:</strong> <%= item.linesOfCode %></p>
        <p><strong>Purpose:</strong> <%= item.purpose %></p>
      </div>
    <% }); %>
  </div>
<% } else { %>
  <p>No stored procedures or triggers found.</p>
<% } %>



Step 5: Delete src/components/reporting/templates/partials/procs-and-triggers.ejs

Since we have merged the "Procs & Triggers" logic into db-integrations.ejs (in Step 4) to make the new tabbed layout work, you should delete the file src/components/reporting/templates/partials/procs-and-triggers.ejs.

