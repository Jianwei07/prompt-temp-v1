// server.js
require("dotenv").config(); // Load environment variables
const express = require("express");
const webpack = require("webpack");
const path = require("path");
const cors = require("cors");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const { exec } = require("child_process");

// Optionally, if Node version does not have global FormData, uncomment the following lines:
// const FormData = require("form-data");
// const fetch = require("node-fetch");

const config = require("../webpack.config.js"); // Adjust path if needed
const compiler = webpack(config);

const app = express();
app.use(cors(), express.json());

// Core configuration
const CONFIG = {
  bitbucket: {
    workspace: process.env.BITBUCKET_WORKSPACE,
    repoSlug: process.env.BITBUCKET_REPO,
    username: process.env.BITBUCKET_USERNAME || process.env.USERNAME || "System",
    accessToken: process.env.BITBUCKET_ACCESS_TOKEN,
  },
  server: {
    port: process.env.PORT || 4000,
    frontendPort: 3000
  },
  features: {
    requireDeleteApproval: process.env.REQUIRE_DELETE_APPROVAL === "true"
  }
};

// Utility functions
const utils = {
  getSingaporeTime: () => {
    const time = new Date();
    time.setHours(time.getHours() + 8);
    return time.toISOString();
  },
  
  getAuthHeaders: () => ({
    Authorization: `Bearer ${CONFIG.bitbucket.accessToken}`,
    Accept: "application/json",
  }),

  createFormData: (files, message, branch = "main") => {
    const formData = new FormData();
    formData.append("branch", branch);
    formData.append("message", message);
    Object.entries(files).forEach(([path, content]) => formData.append(path, content));
    return formData;
  },

  validateFields: (data, fields) => {
    const missing = fields.filter(field => !data[field]);
    return missing.length > 0 
      ? { valid: false, error: `Missing required fields: ${missing.join(', ')}` }
      : { valid: true };
  },

  findTemplate: (metadata, id) => {
    if (!Array.isArray(metadata)) return { found: false, error: "Invalid metadata format" };
    const index = metadata.findIndex(item => String(item.id) === String(id));
    return index === -1
      ? { found: false, error: `Template with ID ${id} not found` }
      : { found: true, templateMeta: metadata[index], templateIndex: index };
  },

  generateId: (metadata) => {
    if (metadata.length === 0) return "1";
    const highestId = metadata.reduce((max, template) => {
      const id = parseInt(template.id, 10);
      return !isNaN(id) && id > max ? id : max;
    }, 0);
    return (highestId + 1).toString();
  },

  incrementVersion: (version) => {
    if (!version || typeof version !== "string") return "v1.1";
    const match = version.match(/v(\d+)\.(\d+)/);
    return match ? `v${match[1]}.${parseInt(match[2], 10) + 1}` : "v1.1";
  }
};

// Bitbucket API functions
const bitbucket = {
  async fetchMetadata() {
    const { workspace, repoSlug } = CONFIG.bitbucket;
    if (!workspace || !repoSlug) throw new Error("Missing Bitbucket workspace or repository information");
    
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`,
      { headers: utils.getAuthHeaders() }
    );
    
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    
    try {
      const metadata = JSON.parse(await response.text());
      return Array.isArray(metadata) ? metadata : [];
    } catch (error) {
      console.error("Error parsing metadata JSON:", error);
      return [];
    }
  },

  async commit(files, message, branch = "main") {
    const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
    if (!workspace || !repoSlug || !accessToken) throw new Error("Missing Bitbucket credentials");
    
    const formData = utils.createFormData(files, message, branch);
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );
    
    if (!response.ok) throw new Error(`Bitbucket API error: ${response.status} - ${await response.text()}`);
    return response;
  },

  async deleteFile(filePath, branch, message) {
    const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
    try {
      const response = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/${branch}/${filePath}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message, branch })
        }
      );
      
      if (!response.ok) {
        await this.commit({ [filePath]: "" }, message, branch);
        console.log("Successfully emptied the file as a deletion alternative");
      } else {
        console.log(`Successfully deleted file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Error with file deletion request: ${error.message}`);
    }
  },

  async createBranch(branchName, baseBranch = "main") {
    const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: branchName, target: { hash: baseBranch } })
      }
    );
    
    if (!response.ok) throw new Error(`Failed to create branch: ${await response.text()}`);
    return response;
  },

  async createPR(sourceBranch, title, description) {
    const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          source: { branch: { name: sourceBranch } },
          destination: { branch: { name: "main" } },
          close_source_branch: true
        })
      }
    );
    
    if (!response.ok) throw new Error(`Failed to create pull request: ${await response.text()}`);
    return response.json();
  }
};

// API Routes
app.get("/api/test-server", (req, res) => {
  res.json({ message: "This is from server_new.js", timestamp: new Date().toISOString() });
});

app.post("/api/templates", async (req, res) => {
  try {
    const { name, content, department, appCode, instructions, examples } = req.body;
    const validation = utils.validateFields(req.body, ["name", "content", "department", "appCode"]);
    if (!validation.valid) return res.status(400).json({ success: false, error: validation.error });

    const processedExamples = examples?.map(example => ({
      "User Input": example.input || example.userInput || example.question || "",
      "Expected Output": example.output || example.expectedOutput || example.answer || ""
    })) || [];

    const fileName = `${name.replace(/\s+/g, "-")}.json`;
    const filePath = `${department}/${appCode}/${fileName}`;
    const metadata = await bitbucket.fetchMetadata();
    const newId = utils.generateId(metadata);
    const username = CONFIG.bitbucket.username;
    const sgTimeString = utils.getSingaporeTime();

    const newMetadataEntry = {
      id: newId,
      Department: department,
      AppCode: appCode,
      name,
      link: filePath,
      version: "v1.0",
      createdAt: sgTimeString,
      createdBy: username,
      updatedBy: "",
      updatedAt: ""
    };

    metadata.push(newMetadataEntry);
    await bitbucket.commit(
      {
        "metadata.json": JSON.stringify(metadata, null, 2),
        [filePath]: JSON.stringify({
          "Main Prompt Content": content,
          "Additional Instructions": instructions || "",
          "Examples": processedExamples
        }, null, 2)
      },
      `Creating new template: ${name} in ${department}/${appCode}`
    );

    res.json({
      success: true,
      template: {
        id: newId,
        name,
        department,
        appCode,
        content,
        instructions: instructions || "",
        examples: processedExamples,
        version: "v1.0",
        createdAt: sgTimeString,
        createdBy: username,
        updatedAt: sgTimeString,
        updatedBy: username
      }
    });
  } catch (err) {
    console.error("Error in /api/templates endpoint:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Update the get templates endpoint
app.get("/api/templates", async (req, res) => {
  try {
    // Fetch metadata
    const metadata = await bitbucket.fetchMetadata();
    
    // Return the templates directly from metadata
    const templates = metadata.map((entry) => ({
      id: entry.id,
      name: entry.name,
      department: entry.Department,
      appCode: entry.AppCode,
      content: "...", // This would require a separate fetch
      version: entry.version,
      createdAt: entry.createdAt,
      createdBy: entry.createdBy,
      updatedAt: entry.updatedAt,
      updatedBy: entry.updatedBy,
    }));

    console.log(`Found ${templates.length} templates in total`);
    res.json(templates);
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// Update the get template by ID endpoint to handle the simplified content format
app.get("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching template with ID: "${id}"`);

  try {
    // Fetch metadata
    const metadata = await bitbucket.fetchMetadata();
    
    // Find template in metadata
    const result = utils.findTemplate(metadata, id);
    if (!result.found) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }
    
    const templateMeta = result.templateMeta;
    
    if (!templateMeta.link) {
      return res.status(500).json({
        success: false,
        error: "Template metadata invalid (missing link)",
      });
    }
    
    // Fetch template content
    const templateContent = await fetchTemplateContent(templateMeta.link);
    
    // Combine metadata and content
    const template = {
      id: id,
      name: templateMeta.name,
      department: templateMeta.Department,
      appCode: templateMeta.AppCode,
      version: templateMeta.version || "v1.0",
      content: templateContent["Main Prompt Content"] || "",
      instructions: templateContent["Additional Instructions"] || "",
      examples: templateContent["Examples"] || [],
      createdAt: templateMeta.createdAt || "",
      updatedAt: templateMeta.updatedAt || "",
      createdBy: templateMeta.createdBy || "",
      updatedBy: templateMeta.updatedBy || "",
    };

    return res.json(template);
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Add this helper function for fetching repository structure
async function fetchRepositoryStructure() {
  const { workspace, repoSlug } = CONFIG.bitbucket;
  
  // First, list the contents of the repository root
  const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/`;
  const response = await fetch(apiUrl, {
    headers: utils.getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repository root: ${response.status}`);
  }

  const data = await response.json();
  if (!data.values || !Array.isArray(data.values)) {
    throw new Error("Invalid response from Bitbucket API");
  }

  const departments = new Set();
  const appCodes = new Set();

  // Find department folders
  const departmentFolders = data.values.filter(
    (item) =>
      !item.path.includes("/") && 
      !item.path.includes(".") && 
      item.type === "commit_directory"
  );

  // For each department, fetch app codes
  for (const dept of departmentFolders) {
    const deptName = dept.path;
    departments.add(deptName);

    const deptUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${deptName}/`;
    
    try {
      const deptResponse = await fetch(deptUrl, {
        headers: utils.getAuthHeaders(),
      });

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        
        // Find app code folders
        const appCodeFolders = deptData.values.filter(
          (item) =>
            !item.path.includes(".") &&
            item.type === "commit_directory"
        );

        appCodeFolders.forEach((appFolder) => {
          const appCodeName = appFolder.path.split("/").pop();
          if (appCodeName) {
            appCodes.add({
              department: deptName,
              appCode: appCodeName,
            });
          }
        });
      }
    } catch (err) {
      console.error(`Error fetching contents of department ${deptName}:`, err);
    }
  }

  return {
    departments: Array.from(departments).sort(),
    appCodes: Array.from(appCodes).sort((a, b) => {
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department);
      }
      return a.appCode.localeCompare(b.appCode);
    }),
  };
}

// Now you can simplify the endpoint using this helper
app.get("/api/bitbucket/structure", async (req, res) => {
  try {
    const structure = await fetchRepositoryStructure();
    
    console.log(`Found ${structure.departments.length} departments and ${structure.appCodes.length} app codes`);
    
    res.json({
      success: true,
      ...structure
    });
  } catch (err) {
    console.error("Error in /api/bitbucket/structure endpoint:", err);
    return res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Update the PUT endpoint to use Singapore time
app.put("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Received update request for template ID: ${id}`);

  try {
    const { content, department, appCode, instructions, examples } = req.body;
    
    // Validate required fields (excluding name since it shouldn't change)
    const validation = utils.validateFields(req.body, ["content", "department", "appCode"]);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Fetch metadata
    const metadata = await bitbucket.fetchMetadata();
    
    // Find template in metadata
    const result = utils.findTemplate(metadata, id);
    if (!result.found) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }
    
    const templateMeta = result.templateMeta;
    const templateIndex = result.templateIndex;
    
    if (!templateMeta.link) {
      return res.status(500).json({
        success: false,
        error: "Template metadata is missing the file path",
      });
    }

    // Get Singapore time (UTC+8)
    const sgTimeString = utils.getSingaporeTime();

    // Use the original name from the metadata record
    const originalName = templateMeta.name;
    
    // Get username from config
    const username = CONFIG.bitbucket.username;

    // Update version in metadata
    const newVersion = templateMeta.version
      ? utils.incrementVersion(templateMeta.version)
      : "v1.1";

    // Create template content with ONLY the content fields
    const templateContent = {
      "Main Prompt Content": content,
      "Additional Instructions": instructions || "",
      "Examples": examples || []
    };

    // Update the metadata entry but preserve the name
    const updatedTemplateMeta = {
      ...templateMeta,
      Department: department,
      AppCode: appCode,
      version: newVersion,
      updatedAt: sgTimeString,  // Now using Singapore time
      updatedBy: username,
    };

    // Replace the template in metadata
    metadata[templateIndex] = updatedTemplateMeta;

    // Commit to Bitbucket
    const files = {
      "metadata.json": JSON.stringify(metadata, null, 2),
      [templateMeta.link]: JSON.stringify(templateContent, null, 2)
    };
    
    await bitbucket.commit(
      files, 
      `Updated template: ${originalName} (ID: ${id})`
    );

    // Return the updated template
    return res.json({
      success: true,
      template: {
        id: id,
        name: originalName, // Use original name in response
        department: department,
        appCode: appCode,
        content: content,
        instructions: instructions || "",
        examples: examples || [],
        version: newVersion,
        createdAt: templateMeta.createdAt || sgTimeString,
        updatedAt: sgTimeString,  // Now using Singapore time
        createdBy: templateMeta.createdBy || username,
        updatedBy: username,
      },
    });
  } catch (err) {
    console.error("Error updating template:", err);
    return res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Helper function to fetch template content
async function fetchTemplateContent(templatePath) {
  const { workspace, repoSlug } = CONFIG.bitbucket;
  
  // Remove any leading slashes from the path
  const normalizedPath = templatePath.startsWith('/') 
    ? templatePath.substring(1) 
    : templatePath;
  
  const templateUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${normalizedPath}`;
  console.log("Fetching template from:", templateUrl);
  
  const templateResponse = await fetch(templateUrl, {
    headers: utils.getAuthHeaders(),
  });
  
  if (!templateResponse.ok) {
    throw new Error(`Template file not found at ${normalizedPath}`);
  }
  
  try {
    return await templateResponse.json();
  } catch (error) {
    throw new Error("Invalid template format");
  }
}

// Helper function to handle PR webhook events
async function handlePrWebhookEvent(data) {
  if (data.pullrequest?.title?.startsWith("Delete Template:")) {
    console.log("Processing completed deletion PR:", data.pullrequest.id);
    
    const prDescription = data.pullrequest.description;
    const idMatch = prDescription.match(/template ID (\d+)/);
    const filePathMatch = prDescription.match(/template file at ([^\s.]+)/);
    
    if (idMatch && idMatch[1] && filePathMatch && filePathMatch[1]) {
      const templateId = idMatch[1];
      const filePath = filePathMatch[1];
      
      console.log(`PR approved for deletion of template ID: ${templateId}`);
      console.log(`Need to delete file at: ${filePath}`);
      
      await bitbucket.deleteFile(filePath, "main", `Deleted template file after PR approval (ID: ${templateId})`);
    }
  }
}

// Helper for handling template deletion logic
async function deleteTemplate(id, requestComment, requireApproval) {
  // Get metadata and find template
  const metadata = await bitbucket.fetchMetadata();
  const result = utils.findTemplate(metadata, id);
  
  if (!result.found) {
    throw new Error(`Template with ID ${id} not found`);
  }
  
  const { templateMeta, templateIndex } = result;
  const username = CONFIG.bitbucket.username;
  const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
  
  // First, create a new metadata array with this template removed
  const updatedMetadata = metadata.filter(item => String(item.id) !== String(id));
  
  console.log(`Template to delete: ${templateMeta.name} (ID: ${id})`);
  console.log(`Template file location: ${templateMeta.link}`);
  
  if (requireApproval) {
    // Create a branch for deletion approval
    const timestamp = Date.now();
    const branchName = `delete-template-${id}-${timestamp}`;
    
    // Create branch
    await bitbucket.createBranch(branchName);
    
    // First commit: Update metadata to remove template entry
    console.log("Step 1: Creating commit to update metadata.json");
    await bitbucket.commit(
      {
        "metadata.json": JSON.stringify(updatedMetadata, null, 2)
      },
      `Delete template metadata: ${templateMeta.name} (ID: ${id})`,
      branchName
    );
    
    console.log("Step 2: Creating commit to delete the template file");
    await bitbucket.deleteFile(templateMeta.link, branchName, `Delete template file: ${templateMeta.name} (ID: ${id})`);
    
    // Create a PR for approval
    const prData = await bitbucket.createPR(
      branchName,
      `Delete Template: ${templateMeta.name}`,
      `Deletion request for template ID ${id}.\n\nRequested by: ${username}\nComment: ${
        requestComment || "No comment provided"
      }\n\nThis PR will:\n1. Remove the template entry from metadata.json\n2. Delete the template file at ${templateMeta.link}`
    );
    
    return {
      success: true,
      message: "Deletion request submitted for approval",
      status: "pending_approval",
      pullRequestUrl: prData.links.html.href,
      pullRequestId: prData.id,
    };
  } else {
    // Direct deletion without PR
    await bitbucket.commit(
      {
        "metadata.json": JSON.stringify(updatedMetadata, null, 2)
      },
      `Delete template metadata: ${templateMeta.name} (ID: ${id})`
    );
    
    await bitbucket.deleteFile(templateMeta.link, "main", `Delete template file: ${templateMeta.name} (ID: ${id})`);
    
    return {
      success: true,
      message: "Template and its file deleted successfully",
      status: "deleted",
      deletedTemplate: templateMeta,
    };
  }
}

// Update the DELETE endpoint
app.delete("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  const { requestComment } = req.body || {};

  console.log(`Received delete request for template ID: ${id}`);

  try {
    const result = await deleteTemplate(
      id, 
      requestComment, 
      CONFIG.features.requireDeleteApproval
    );
    
    return res.json(result);
  } catch (err) {
    console.error("Error in template deletion:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Update the version history endpoint
app.get("/api/templates/:id/history", async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching version history for template ID: ${id}`);

  try {
    // First, get the template metadata to find its file path
    const metadata = await bitbucket.fetchMetadata();
    const result = utils.findTemplate(metadata, id);
    
    if (!result.found || !result.templateMeta.link) {
      console.log(`Template with ID ${id} not found or missing link`);
      return res.status(404).json({
        success: false,
        error: `Template with ID ${id} not found or missing file path`
      });
    }
    
    const templateMeta = result.templateMeta;
    console.log(`Found template: ${templateMeta.name}, file path: ${templateMeta.link}`);
    
    // Get Bitbucket credentials from the config
    const { workspace, repoSlug } = CONFIG.bitbucket;
    
    // The path in the filehistory API must be correctly formatted
    // Remove any leading/trailing slashes
    const normalizedPath = templateMeta.link.replace(/^\/+|\/+$/g, '');
    
    // Use the filehistory API as suggested
    const fileHistoryUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/filehistory/main/${normalizedPath}`;
    console.log(`Fetching file history from: ${fileHistoryUrl}`);
    
    const historyResponse = await fetch(fileHistoryUrl, {
      headers: utils.getAuthHeaders(),
    });

    if (!historyResponse.ok) {
      const errorText = await historyResponse.text();
      console.error(`Failed to fetch file history: ${historyResponse.status}, Details: ${errorText}`);
      
      // Return a more user-friendly error message
      return res.status(200).json({
        success: true,
        history: [{
          commitId: "initial",
          version: "v1.0",
          userDisplayName: templateMeta.createdBy || "Unknown",
          timestamp: templateMeta.createdAt || utils.getSingaporeTime(),
          message: "Initial version"
        }],
        note: "Using placeholder history as actual file history could not be retrieved."
      });
    }

    const historyData = await historyResponse.json();
    console.log(`DEBUG: Raw history data structure:`, Object.keys(historyData));

    if (!historyData.values || !Array.isArray(historyData.values)) {
      console.log("No file history found, or invalid format returned");
      return res.status(200).json({
        success: true,
        history: [{
          commitId: "initial",
          version: "v1.0",
          userDisplayName: templateMeta.createdBy || "Unknown",
          timestamp: templateMeta.createdAt || utils.getSingaporeTime(),
          message: "Initial version"
        }]
      });
    }

    console.log(`Found ${historyData.values.length} history entries for this template`);

    // Transform the file history into the expected format
    const history = historyData.values.map((entry, index) => {
      // Filehistory API might have different structure than commits API
      // Adjust fields accordingly
      
      // Format the timestamp to be in Singapore time
      let timestamp = new Date(entry.commit?.date || entry.date || templateMeta.updatedAt || templateMeta.createdAt);
      timestamp.setHours(timestamp.getHours() + 8); // Convert to Singapore time (UTC+8)
      
      return {
        commitId: entry.commit?.hash || entry.hash || `version-${index}`,
        // Version starts from the latest (v1.x where x is the total number of versions)
        version: `v1.${historyData.values.length - index}`,
        userDisplayName: 
          entry.commit?.author?.user?.display_name || 
          entry.author?.user?.display_name || 
          entry.commit?.author?.raw || 
          entry.author?.raw || 
          templateMeta.updatedBy || 
          templateMeta.createdBy || 
          "Unknown",
        timestamp: timestamp.toISOString(),
        message: entry.commit?.message || entry.message || `Version update ${index + 1}`,
      };
    });

    console.log(`Processed version history with ${history.length} entries`);
    
    // If we somehow got no history, create a default entry
    if (history.length === 0) {
      history.push({
        commitId: "initial",
        version: "v1.0",
        userDisplayName: templateMeta.createdBy || "Unknown",
        timestamp: templateMeta.createdAt || utils.getSingaporeTime(),
        message: "Initial version"
      });
    }
    
    return res.json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error("Error fetching version history:", error);
    
    // Even in case of an error, return something useful to display
    res.status(200).json({
      success: true,
      history: [{
        commitId: "error",
        version: "v1.0",
        userDisplayName: "System",
        timestamp: utils.getSingaporeTime(),
        message: "Could not retrieve version history"
      }],
      note: "Error occurred while fetching version history"
    });
  }
});

// Update the webhook handler to use the new helper
app.post("/api/webhooks/bitbucket", async (req, res) => {
  const event = req.headers["x-event-key"];
  const data = req.body;

  console.log(`Received Bitbucket webhook: ${event}`);

  try {
    if (event === "pullrequest:fulfilled") {
      await handlePrWebhookEvent(data);
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
  }

  // Always acknowledge the webhook
  res.status(200).json({ success: true });
});

// Fallback API for other endpoints (optional)
app.use("/api", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// Start servers
const startFrontend = () => {
  const frontend = exec(`webpack serve --mode development --port ${CONFIG.server.frontendPort}`);
  frontend.stdout.on('data', console.log);
  frontend.stderr.on('data', console.error);
  frontend.on('close', code => console.log(`Frontend process exited with code ${code}`));
};

startFrontend();
app.listen(CONFIG.server.port, () => {
  console.log(`Backend server running at http://localhost:${CONFIG.server.port}`);
  console.log(`Frontend should be available at http://localhost:${CONFIG.server.frontendPort}`);
});
