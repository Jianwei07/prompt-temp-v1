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
app.use(cors());

// For parsing JSON bodies
app.use(express.json());

// Near the top after imports, add this configuration object
const CONFIG = {
  // Bitbucket configuration
  bitbucket: {
    workspace: process.env.BITBUCKET_WORKSPACE,
    repoSlug: process.env.BITBUCKET_REPO,
    username: process.env.BITBUCKET_USERNAME || process.env.USERNAME || "System",
    accessToken: process.env.BITBUCKET_ACCESS_TOKEN,
  },
  // Server configuration
  server: {
    port: process.env.PORT || 4000,
    frontendPort: 3000
  },
  // Feature flags
  features: {
    requireDeleteApproval: process.env.REQUIRE_DELETE_APPROVAL === "true"
  }
};

// Validate essential configuration at startup
function validateConfig() {
  const missing = [];
  if (!CONFIG.bitbucket.workspace) missing.push("BITBUCKET_WORKSPACE");
  if (!CONFIG.bitbucket.repoSlug) missing.push("BITBUCKET_REPO");
  if (!CONFIG.bitbucket.accessToken) missing.push("BITBUCKET_ACCESS_TOKEN");
  
  if (missing.length > 0) {
    console.error("ERROR: Missing required environment variables:", missing.join(", "));
    console.error("Make sure these are set in your .env file.");
    // Uncomment if you want to exit when environment variables are missing
    // process.exit(1);
    return false;
  }
  
  console.log("Environment loaded successfully. Bitbucket config:", {
    workspace: CONFIG.bitbucket.workspace,
    repoSlug: CONFIG.bitbucket.repoSlug,
    hasToken: !!CONFIG.bitbucket.accessToken,
  });
  
  return true;
}

// Run validation at startup
validateConfig();

// Test endpoint to verify we're using server_new.js
app.get("/api/test-server", (req, res) => {
  res.json({
    message: "This is from server_new.js",
    timestamp: new Date().toISOString(),
  });
});

// Enable webpack-dev-middleware and webpack-hot-middleware
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: { colors: true },
  })
);
app.use(webpackHotMiddleware(compiler));

// Helper function to get auth headers
function getBitbucketAuthHeaders() {
  return {
    Authorization: `Bearer ${CONFIG.bitbucket.accessToken}`,
    Accept: "application/json",
  };
}

// Helper function to fetch metadata with error handling
async function fetchMetadata() {
  const { workspace, repoSlug } = CONFIG.bitbucket;
  
  if (!workspace || !repoSlug) {
    throw new Error("Missing Bitbucket workspace or repository information");
  }
  
  const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
  console.log("Fetching metadata from:", metadataUrl);
  
  const metadataResponse = await fetch(metadataUrl, {
    headers: getBitbucketAuthHeaders(),
  });
  
  if (!metadataResponse.ok) {
    if (metadataResponse.status === 404) {
      console.log("Metadata file not found, will create new one");
      return [];
    }
    throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
  }
  
  try {
    const metadataText = await metadataResponse.text();
    const metadata = JSON.parse(metadataText);
    
    if (!Array.isArray(metadata)) {
      console.log("Metadata is not an array, resetting to empty array");
      return [];
    }
    
    return metadata;
  } catch (error) {
    console.error("Error parsing metadata JSON:", error);
    return [];
  }
}

// Helper function to commit files to Bitbucket
async function commitToBitbucket(files, commitMessage, branch = "main") {
  const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
  
  if (!workspace || !repoSlug || !accessToken) {
    throw new Error("Missing Bitbucket credentials");
  }
  
  const formData = new FormData();
  formData.append("branch", branch);
  formData.append("message", commitMessage);
  
  // Add each file to the form data
  for (const [path, content] of Object.entries(files)) {
    formData.append(path, content);
  }
  
  const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
  console.log("Committing to Bitbucket:", apiUrl);
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bitbucket API error: ${response.status} - ${errorText}`);
  }
  
  return response;
}

// Helper function to find template by ID in metadata
function findTemplateInMetadata(metadata, id) {
  if (!Array.isArray(metadata)) {
    return { found: false, error: "Invalid metadata format" };
  }
  
  const templateIndex = metadata.findIndex(item => String(item.id) === String(id));
  
  if (templateIndex === -1) {
    return { found: false, error: `Template with ID ${id} not found` };
  }
  
  return { 
    found: true, 
    templateMeta: metadata[templateIndex],
    templateIndex
  };
}

// Helper function to generate a new sequential ID
function generateSequentialId(metadata) {
  if (metadata.length === 0) {
    return "1";
  }
  
  const highestId = metadata.reduce((maxId, template) => {
    const templateId = parseInt(template.id, 10);
    return !isNaN(templateId) && templateId > maxId ? templateId : maxId;
  }, 0);
  
  return (highestId + 1).toString();
}

// Helper function to increment version
function incrementVersion(version) {
  if (!version || typeof version !== "string") {
    return "v1.1";
  }
  
  const match = version.match(/v(\d+)\.(\d+)/);
  if (!match) {
    return "v1.1";
  }
  
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10) + 1;
  
  return `v${major}.${minor}`;
}

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
    headers: getBitbucketAuthHeaders(),
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

// Helper function to validate required fields
function validateRequiredFields(data, fields) {
  const missingFields = fields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }
  
  return { valid: true };
}

// Update the template creation endpoint to fix the content structure
app.post("/api/templates", async (req, res) => {
  console.log(
    "Received template creation request with data:",
    JSON.stringify(req.body, null, 2)
  );

  try {
    // Validate required fields
    const { name, content, department, appCode, instructions, examples } = req.body;
    const validation = validateRequiredFields(req.body, ["name", "content", "department", "appCode"]);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Format the examples correctly
    let processedExamples = [];
    if (examples && Array.isArray(examples)) {
      processedExamples = examples.map((example) => {
        if (example["User Input"] !== undefined && example["Expected Output"] !== undefined) {
          return example;
        }
        return {
          "User Input": example.input || example.userInput || example.question || "",
          "Expected Output": example.output || example.expectedOutput || example.answer || "",
        };
      });
    }

    // Get Singapore time (UTC+8)
    const sgTimeString = getSingaporeTime();

    // Get username from config
    const username = CONFIG.bitbucket.username;

    // Create paths and filenames
    const fileName = `${name.replace(/\s+/g, "-")}.json`;
    const filePath = `${department}/${appCode}/${fileName}`;
    const link = `${department}/${appCode}/${fileName}`;

    console.log("Template will be created at path:", filePath);
    console.log("Link in metadata will be:", link);

    // Fetch the current metadata
    const metadata = await fetchMetadata();

    // Generate sequential ID
    const newId = generateSequentialId(metadata);
    console.log(`Generated new sequential ID: ${newId} (based on ${metadata.length} existing templates)`);

    // Create new metadata entry with all the metadata fields
    const newMetadataEntry = {
      id: newId,
      Department: department,
      AppCode: appCode,
      name: name,
      link: link,
      version: "v1.0",
      createdAt: sgTimeString,
      createdBy: username,
      updatedBy: "",
      updatedAt: "",
    };

    // Add new entry to metadata
    metadata.push(newMetadataEntry);

    // Create template content with ONLY the content fields, not duplicate metadata
    const templateContent = {
      "Main Prompt Content": content,
      "Additional Instructions": instructions || "",
      "Examples": processedExamples
    };

    // Commit to Bitbucket
    const files = {
      "metadata.json": JSON.stringify(metadata, null, 2),
      [filePath]: JSON.stringify(templateContent, null, 2)
    };
    
    await commitToBitbucket(
      files, 
      `Creating new template: ${name} in ${department}/${appCode}`
    );

    // Return the template with all fields for the frontend
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
        updatedBy: username,
      },
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
    const metadata = await fetchMetadata();
    
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
    const metadata = await fetchMetadata();
    
    // Find template in metadata
    const result = findTemplateInMetadata(metadata, id);
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
    headers: getBitbucketAuthHeaders(),
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
        headers: getBitbucketAuthHeaders(),
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
    const validation = validateRequiredFields(req.body, ["content", "department", "appCode"]);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Fetch metadata
    const metadata = await fetchMetadata();
    
    // Find template in metadata
    const result = findTemplateInMetadata(metadata, id);
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
    const sgTimeString = getSingaporeTime();

    // Use the original name from the metadata record
    const originalName = templateMeta.name;
    
    // Get username from config
    const username = CONFIG.bitbucket.username;

    // Update version in metadata
    const newVersion = templateMeta.version
      ? incrementVersion(templateMeta.version)
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
    
    await commitToBitbucket(
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

// Helper function to create a branch for PR workflows
async function createBitbucketBranch(branchName, baseBranch = "main") {
  const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
  
  const createBranchUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches`;

  const response = await fetch(createBranchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: branchName,
      target: {
        hash: baseBranch,
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create branch: ${errorText}`);
  }
  
  return response;
}

// Helper function to create a pull request
async function createPullRequest(sourceBranch, title, description) {
  const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
  
  const createPrUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests`;

  const response = await fetch(createPrUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title,
      description: description,
      source: {
        branch: {
          name: sourceBranch,
        },
      },
      destination: {
        branch: {
          name: "main",
        },
      },
      close_source_branch: true,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create pull request: ${errorText}`);
  }
  
  return await response.json();
}

// Helper for handling template deletion logic
async function deleteTemplate(id, requestComment, requireApproval) {
  // Get metadata and find template
  const metadata = await fetchMetadata();
  const result = findTemplateInMetadata(metadata, id);
  
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
    await createBitbucketBranch(branchName);
    
    // First commit: Update metadata to remove template entry
    console.log("Step 1: Creating commit to update metadata.json");
    await commitToBitbucket(
      {
        "metadata.json": JSON.stringify(updatedMetadata, null, 2)
      },
      `Delete template metadata: ${templateMeta.name} (ID: ${id})`,
      branchName
    );
    
    console.log("Step 2: Creating commit to delete the template file");
    
    // For Bitbucket, we need to make an explicit DELETE request to the file endpoint
    // This is the most reliable way to delete a file with the Bitbucket REST API
    const deleteFileUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/${branchName}/${templateMeta.link}`;
    console.log(`Making DELETE request to ${deleteFileUrl}`);
    
    try {
      const deleteResponse = await fetch(deleteFileUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Delete template file: ${templateMeta.name} (ID: ${id})`,
          branch: branchName
        })
      });
      
      if (!deleteResponse.ok) {
        console.warn(`Warning: File deletion request failed with status ${deleteResponse.status}`);
        const errorText = await deleteResponse.text();
        console.warn(`Error details: ${errorText}`);
        
        // Another approach: let's try to create an empty file
        console.log("Trying simpler deletion approach by writing an empty file...");
        
        try {
          // In Bitbucket, "deleting" a file can be achieved by committing an empty file
          await commitToBitbucket(
            {
              [templateMeta.link]: ""  // Empty string to create an empty file (effectively deleting content)
            },
            `Empty template file for deletion: ${templateMeta.name} (ID: ${id})`,
            branchName
          );
          console.log("Successfully emptied the file as a deletion alternative");
        } catch (fallbackError) {
          console.warn(`Fallback emptying also failed: ${fallbackError.message}`);
        }
      } else {
        console.log(`Successfully deleted file in branch: ${templateMeta.link}`);
      }
    } catch (fileError) {
      console.warn(`Error with file deletion request: ${fileError.message}`);
    }
    
    // Create a PR for approval that includes both the metadata update and file deletion
    const prData = await createPullRequest(
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
    
    // First, update metadata
    await commitToBitbucket(
      {
        "metadata.json": JSON.stringify(updatedMetadata, null, 2)
      },
      `Delete template metadata: ${templateMeta.name} (ID: ${id})`
    );
    
    // Then, delete the template file using direct DELETE request
    const deleteFileUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${templateMeta.link}`;
    
    try {
      const deleteResponse = await fetch(deleteFileUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Delete template file: ${templateMeta.name} (ID: ${id})`,
          branch: "main"
        })
      });
      
      if (!deleteResponse.ok) {
        console.warn(`Warning: File deletion request failed with status ${deleteResponse.status}`);
        
        // Fallback - emptying the file
        try {
          await commitToBitbucket(
            {
              [templateMeta.link]: ""  // Empty string to create an empty file
            },
            `Empty template file for deletion: ${templateMeta.name} (ID: ${id})`,
            "main"
          );
          console.log("Successfully emptied the file as a deletion alternative");
        } catch (fallbackError) {
          console.warn(`Fallback emptying also failed: ${fallbackError.message}`);
        }
      } else {
        console.log(`Successfully deleted file: ${templateMeta.link}`);
      }
    } catch (fileError) {
      console.warn(`Error with file deletion request: ${fileError.message}`);
    }
    
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
    const metadata = await fetchMetadata();
    const result = findTemplateInMetadata(metadata, id);
    
    if (!result.found || !result.templateMeta.link) {
      return res.status(404).json([]);
    }
    
    const templateMeta = result.templateMeta;
    
    // Now get the commit history for this file
    const workspace = process.env.BITBUCKET_WORKSPACE;
    const repoSlug = process.env.BITBUCKET_REPO;
    
    const commitsUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/commits?path=${templateMeta.link}`;
    const commitsResponse = await fetch(commitsUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    if (!commitsResponse.ok) {
      return res.status(404).json([]);
    }

    const commitsData = await commitsResponse.json();

    if (!commitsData.values || !Array.isArray(commitsData.values)) {
      return res.status(200).json([]);
    }

    // Transform the commit history into the expected format
    const history = commitsData.values.map((commit, index) => ({
      commitId: commit.hash,
      version: `v1.${commitsData.values.length - index}`,
      userDisplayName: commit.author.user
        ? commit.author.user.display_name
        : "Unknown",
      timestamp: commit.date,
      message: commit.message,
    }));

    return res.json(history);
  } catch (error) {
    console.error("Error fetching version history:", error);
    res.status(500).json([]);
  }
});

// Update the webhook handler
app.post("/api/webhooks/bitbucket", async (req, res) => {
  const event = req.headers["x-event-key"];
  const data = req.body;

  console.log(`Received Bitbucket webhook: ${event}`);

  try {
    // Handle PR merged events for template deletion
    if (
      event === "pullrequest:fulfilled" &&
      data.pullrequest?.title?.startsWith("Delete Template:")
    ) {
      console.log("Processing completed deletion PR:", data.pullrequest.id);
      
      const prDescription = data.pullrequest.description;
      const idMatch = prDescription.match(/template ID (\d+)/);
      const filePathMatch = prDescription.match(/template file at ([^\s.]+)/);
      
      if (idMatch && idMatch[1] && filePathMatch && filePathMatch[1]) {
        const templateId = idMatch[1];
        const filePath = filePathMatch[1];
        
        console.log(`PR approved for deletion of template ID: ${templateId}`);
        console.log(`Need to delete file at: ${filePath}`);
        
        try {
          // Try to delete the template file after the PR is merged
          const { workspace, repoSlug, accessToken } = CONFIG.bitbucket;
          
          const deleteFormData = new FormData();
          deleteFormData.append("message", `Deleted template file after PR approval (ID: ${templateId})`);
          deleteFormData.append("branch", "main");
          // Using special syntax to delete
          deleteFormData.append(`${filePath}`, "");
          
          const deleteUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
          
          const deleteResponse = await fetch(deleteUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: deleteFormData
          });
          
          if (deleteResponse.ok) {
            console.log(`Successfully deleted template file after PR approval: ${filePath}`);
          } else {
            console.warn(`Warning: Could not delete file after PR approval. Status: ${deleteResponse.status}`);
          }
        } catch (fileError) {
          console.error(`Error deleting template file after PR approval: ${fileError.message}`);
        }
      }
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

const PORT = CONFIG.server.port;

// Start the frontend webpack server in a separate process
const startFrontend = () => {
  const frontend = exec(`webpack serve --mode development --port ${CONFIG.server.frontendPort}`);
  
  frontend.stdout.on('data', (data) => {
    console.log(`Frontend: ${data}`);
  });
  
  frontend.stderr.on('data', (data) => {
    console.error(`Frontend error: ${data}`);
  });
  
  frontend.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });
};

// Start the frontend
startFrontend();

// Start the backend
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`Frontend should be available at http://localhost:${CONFIG.server.frontendPort}`);
});

// Add this helper function near the other helpers
function getSingaporeTime() {
  const sgTime = new Date();
  sgTime.setHours(sgTime.getHours() + 8); // Add 8 hours for Singapore time (UTC+8)
  return sgTime.toISOString();
}
