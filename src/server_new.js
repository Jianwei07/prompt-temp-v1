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

// After your imports, add this validation
// Check if required environment variables are set
if (
  !process.env.BITBUCKET_WORKSPACE ||
  !process.env.BITBUCKET_REPO ||
  !process.env.BITBUCKET_ACCESS_TOKEN
) {
  console.error("ERROR: Missing required environment variables.");
  console.error(
    "Make sure BITBUCKET_WORKSPACE, BITBUCKET_REPO, and BITBUCKET_ACCESS_TOKEN are set in your .env file."
  );
  // Uncomment if you want to exit when environment variables are missing
  // process.exit(1);
}

console.log("Environment loaded successfully. Bitbucket config:", {
  workspace: process.env.BITBUCKET_WORKSPACE,
  repoSlug: process.env.BITBUCKET_REPO,
  hasToken: !!process.env.BITBUCKET_ACCESS_TOKEN,
});

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

// Update the BITBUCKET_CONFIG
const BITBUCKET_CONFIG = {
  workspace: process.env.BITBUCKET_WORKSPACE,
  repoSlug: process.env.BITBUCKET_REPO,
  accessToken: process.env.BITBUCKET_ACCESS_TOKEN,
};

// Helper function to get auth headers
function getBitbucketAuthHeaders() {
  return {
    Authorization: `Bearer ${BITBUCKET_CONFIG.accessToken}`,
    Accept: "application/json",
  };
}

// Update the template creation endpoint to not use caching or retries
app.post("/api/templates", async (req, res) => {
  console.log(
    "Received template creation request with data:",
    JSON.stringify(req.body, null, 2)
  );

  const { name, content, department, appCode, instructions, examples } =
    req.body;
  if (!name || !content || !department || !appCode) {
    return res.status(400).json({
      success: false,
      error: "Name, content, department, and appCode are required",
    });
  }

  // Format the examples correctly
  let processedExamples = [];
  if (examples && Array.isArray(examples)) {
    processedExamples = examples.map((example) => {
      if (
        example["User Input"] !== undefined &&
        example["Expected Output"] !== undefined
      ) {
        return example;
      }
      return {
        "User Input":
          example.input || example.userInput || example.question || "",
        "Expected Output":
          example.output || example.expectedOutput || example.answer || "",
      };
    });
  }

  // Get Singapore time (UTC+8)
  const sgTime = new Date();
  sgTime.setHours(sgTime.getHours() + 8);
  const sgTimeString = sgTime.toISOString();

  // Get username
  const username =
    process.env.USERNAME || process.env.BITBUCKET_USERNAME || "System";

  // Create a JSON-friendly filename
  const fileName = `${name.replace(/\s+/g, "-")}.json`;
  const filePath = `${department}/${appCode}/${fileName}`;
  const link = `${department}/${appCode}/${fileName}`;

  console.log("Template will be created at path:", filePath);
  console.log("Link in metadata will be:", link);

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  try {
    // STEP 1: Fetch the current metadata.json
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);

    let metadata = [];
    try {
      const metadataResponse = await fetch(metadataUrl, {
        headers: getBitbucketAuthHeaders(),
      });

      if (metadataResponse.ok) {
        const metadataText = await metadataResponse.text();
        console.log("Metadata text received, length:", metadataText.length);

        try {
          metadata = JSON.parse(metadataText);
          if (!Array.isArray(metadata)) {
            console.log("Metadata is not an array, resetting to empty array");
            metadata = [];
          }
        } catch (parseError) {
          console.error("Error parsing metadata JSON:", parseError);
          metadata = [];
        }
      } else {
        console.log(
          `Metadata file not found or error (status: ${metadataResponse.status}), creating new one`
        );
      }
    } catch (fetchError) {
      console.error("Error fetching metadata:", fetchError);
    }

    // STEP 2: Create new metadata entry with sequential ID
    let newId;
    if (metadata.length === 0) {
      newId = "1";
    } else {
      const highestId = metadata.reduce((maxId, template) => {
        const templateId = parseInt(template.id, 10);
        return !isNaN(templateId) && templateId > maxId ? templateId : maxId;
      }, 0);

      newId = (highestId + 1).toString();
    }

    console.log(
      `Generated new sequential ID: ${newId} (based on ${metadata.length} existing templates)`
    );

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

    // STEP 3: Create template content with ALL required fields
    const templateContent = {
      "Template Name": name,
      Department: department,
      AppCode: appCode,
      Version: "v1.0",
      "Main Prompt Content": content,
      "Additional Instructions": instructions || "",
      Examples: processedExamples,
      "Created At": sgTimeString,
      "Updated At": sgTimeString,
      "Created By": username,
      "Updated By": username,
    };

    console.log("Template content to be saved:", templateContent);

    // STEP 4: Create FormData for the multi-file commit
    const formData = new FormData();
    formData.append("branch", "main");
    formData.append(
      "message",
      `Creating new template: ${name} in ${department}/${appCode}`
    );

    // Make sure the metadata is stringified properly
    const metadataString = JSON.stringify(metadata, null, 2);
    console.log("Saving metadata with entries:", metadata.length);

    // Add metadata.json at the ROOT level with explicit path
    formData.append("metadata.json", metadataString);

    // Add template file with the FULL path (department/appCode/fileName)
    const templateString = JSON.stringify(templateContent, null, 2);
    formData.append(filePath, templateString);

    console.log("Files being committed:");
    console.log("1. Root metadata.json updated with new entry");
    console.log(`2. Template content at: ${filePath}`);

    // STEP 5: Send request to Bitbucket
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
    console.log("Sending request to Bitbucket API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bitbucket API error:", response.status, errorText);
      throw new Error(`Bitbucket API error: ${response.status} - ${errorText}`);
    }

    // STEP 6: Return the template with all fields
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

// Also update the GET /api/templates endpoint to not use caching
app.get("/api/templates", async (req, res) => {
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.USERNAME || process.env.BITBUCKET_USERNAME;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  console.log(
    "Using OAuth access token (first 10 chars):",
    accessToken.substring(0, 10) + "..."
  );

  try {
    // Fetch metadata.json directly without caching
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);

    const metadataResponse = await fetch(metadataUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    if (!metadataResponse.ok) {
      console.error("Error fetching metadata:", metadataResponse.status);
      return res.status(metadataResponse.status).json({
        error: `Failed to fetch metadata: ${metadataResponse.status}`,
      });
    }

    const metadata = await metadataResponse.json();

    if (!Array.isArray(metadata)) {
      return res.status(500).json({
        error: "Metadata is not in the expected format (should be an array)",
      });
    }

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

// Add this endpoint after your existing endpoints
app.get("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching template with ID: "${id}"`);

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly.",
    });
  }

  try {
    // Check if ID is numeric
    if (/^\d+$/.test(id)) {
      console.log("Looking up template by numeric ID:", id);

      // Get metadata
      const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
      console.log("Fetching metadata from:", metadataUrl);

      const metadataResponse = await fetch(metadataUrl, {
        headers: getBitbucketAuthHeaders(),
      });

      if (!metadataResponse.ok) {
        console.error("Failed to fetch metadata:", metadataResponse.status);
        return res.status(404).json({
          success: false,
          error: "Metadata not found. No templates available.",
        });
      }

      let metadata;
      try {
        metadata = await metadataResponse.json();
      } catch (error) {
        console.error("Error parsing metadata JSON:", error);
        return res.status(500).json({
          success: false,
          error: "Invalid metadata format",
        });
      }

      if (!Array.isArray(metadata)) {
        console.error("Metadata is not an array");
        return res.status(500).json({
          success: false,
          error: "Invalid metadata structure",
        });
      }

      // Find the template in metadata
      const templateMeta = metadata.find((item) => item.id === id);

      if (!templateMeta) {
        console.error(`No template with ID ${id} found in metadata`);
        return res.status(404).json({
          success: false,
          error: `Template with ID ${id} not found`,
        });
      }

      console.log("Found template in metadata:", templateMeta);

      if (!templateMeta.link) {
        console.error("Template metadata missing link field");
        return res.status(500).json({
          success: false,
          error: "Template metadata invalid (missing link)",
        });
      }

      // Fetch the template file
      const templateUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${templateMeta.link}`;
      console.log("Fetching template from:", templateUrl);

      const templateResponse = await fetch(templateUrl, {
        headers: getBitbucketAuthHeaders(),
      });

      if (!templateResponse.ok) {
        console.error("Failed to fetch template:", templateResponse.status);
        return res.status(404).json({
          success: false,
          error: "Template file not found",
        });
      }

      let templateContent;
      try {
        templateContent = await templateResponse.json();
      } catch (error) {
        console.error("Error parsing template JSON:", error);
        return res.status(500).json({
          success: false,
          error: "Invalid template format",
        });
      }

      // Combine metadata and template content
      const template = {
        id: id,
        name: templateMeta.name || templateContent["Template Name"],
        department: templateMeta.Department,
        appCode: templateMeta.AppCode,
        version: templateMeta.version || templateContent["Version"] || "v1.0",
        content: templateContent["Main Prompt Content"] || "",
        instructions: templateContent["Additional Instructions"] || "",
        examples: templateContent["Examples"] || [],
        createdAt:
          templateMeta.createdAt || templateContent["Created At"] || "",
        updatedAt:
          templateMeta.updatedAt || templateContent["Updated At"] || "",
        createdBy:
          templateMeta.createdBy || templateContent["Created By"] || "",
        updatedBy:
          templateMeta.updatedBy || templateContent["Updated By"] || "",
      };

      return res.json(template);
    }
    // For backwards compatibility, handle hyphenated IDs
    else if (id.includes("-")) {
      // Your existing code for handling composite IDs
      // ...
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid template ID format",
      });
    }
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Add this new endpoint after your existing endpoints
app.get("/api/bitbucket/structure", async (req, res) => {
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  console.log("Environment variables:", {
    workspace,
    repoSlug,
    username,
    hasAccessToken: !!accessToken,
  });

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
      details: {
        workspace: !!workspace,
        repoSlug: !!repoSlug,
        username: !!username,
        hasAccessToken: !!accessToken,
      },
    });
  }

  console.log(
    "Using OAuth access token (first 10 chars):",
    accessToken.substring(0, 10) + "..."
  );

  try {
    // First, try to list the contents of the repository root
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/`;
    console.log("Fetching from Bitbucket API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    console.log("Bitbucket API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bitbucket API error response:", errorText);
      return res.status(response.status).json({
        success: false,
        error: `Bitbucket API error: ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();
    console.log("Bitbucket API Response Data:", JSON.stringify(data, null, 2));

    if (!data.values || !Array.isArray(data.values)) {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Bitbucket API",
        details: "Missing or invalid values array",
      });
    }

    // Process the directory structure
    const departments = new Set();
    const appCodes = new Set();

    if (data.values && Array.isArray(data.values)) {
      // First pass: collect department folders
      const departmentFolders = data.values.filter(
        (item) =>
          !item.path.includes("/") && // Only top-level folders
          !item.path.includes(".") && // Exclude files
          item.type === "commit_directory"
      );

      console.log(
        "Found department folders:",
        departmentFolders.map((d) => d.path)
      );

      // For each department, fetch its contents to find app codes
      for (const dept of departmentFolders) {
        const deptName = dept.path;
        departments.add(deptName);

        // Fetch department contents
        const deptUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${deptName}/`;
        console.log(`Fetching contents of department ${deptName}:`, deptUrl);

        try {
          const deptResponse = await fetch(deptUrl, {
            headers: getBitbucketAuthHeaders(),
          });

          if (deptResponse.ok) {
            const deptData = await deptResponse.json();
            console.log(
              `Contents of department ${deptName}:`,
              JSON.stringify(deptData, null, 2)
            );

            // Find app code folders
            const appCodeFolders = deptData.values.filter(
              (item) =>
                !item.path.includes(".") && // Exclude files
                item.type === "commit_directory"
            );

            appCodeFolders.forEach((appFolder) => {
              const appCodePath = appFolder.path;
              const appCodeName = appCodePath.split("/").pop();
              if (appCodeName) {
                appCodes.add({
                  department: deptName,
                  appCode: appCodeName,
                });
              }
            });
          } else {
            console.error(
              `Failed to fetch contents of department ${deptName}:`,
              await deptResponse.text()
            );
          }
        } catch (err) {
          console.error(
            `Error fetching contents of department ${deptName}:`,
            err
          );
        }
      }
    }

    const result = {
      success: true,
      departments: Array.from(departments).sort(),
      appCodes: Array.from(appCodes).sort((a, b) => {
        if (a.department !== b.department) {
          return a.department.localeCompare(b.department);
        }
        return a.appCode.localeCompare(b.appCode);
      }),
    };

    console.log("Sending response to client:", JSON.stringify(result, null, 2));
    res.json(result);
  } catch (err) {
    console.error("Error in /api/bitbucket/structure endpoint:", err);
    return res.status(500).json({
      success: false,
      error: err.toString(),
      details: err instanceof Error ? err.stack : undefined,
    });
  }
});

// Update the PUT /api/templates/:id endpoint in server_new.js to handle numeric IDs

app.put("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Received update request for template ID: ${id}`);

  const { name, content, department, appCode, instructions, examples } =
    req.body;

  if (!name || !content || !department || !appCode) {
    return res.status(400).json({
      success: false,
      error: "Name, content, department, and appCode are required",
    });
  }

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username =
    process.env.BITBUCKET_USERNAME || process.env.USERNAME || "System";
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly",
    });
  }

  try {
    // Get metadata regardless of ID format
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);

    const metadataResponse = await fetch(metadataUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    if (!metadataResponse.ok) {
      console.error("Failed to fetch metadata:", metadataResponse.status);
      return res.status(404).json({
        success: false,
        error: "Failed to fetch template metadata",
      });
    }

    let metadata = await metadataResponse.json();
    if (!Array.isArray(metadata)) {
      console.error("Metadata is not an array");
      return res.status(500).json({
        success: false,
        error: "Invalid metadata format",
      });
    }

    // Find the template by ID, regardless of ID format
    const templateIndex = metadata.findIndex(
      (item) => String(item.id) === String(id)
    );
    if (templateIndex === -1) {
      console.error(`Template with ID ${id} not found in metadata`);
      return res.status(404).json({
        success: false,
        error: `Template with ID ${id} not found`,
      });
    }

    const templateMeta = metadata[templateIndex];
    console.log("Found template in metadata:", templateMeta);

    if (!templateMeta.link) {
      console.error("Template metadata is missing the file path");
      return res.status(500).json({
        success: false,
        error: "Template metadata is missing the file path",
      });
    }

    // Get current time
    const currentTime = new Date().toISOString();

    // Create updated template content
    const templateContent = {
      "Template Name": name,
      Department: department,
      AppCode: appCode,
      Version: templateMeta.version
        ? incrementVersion(templateMeta.version)
        : "v1.1",
      "Main Prompt Content": content,
      "Additional Instructions": instructions || "",
      Examples: examples || [],
      "Created At": templateMeta.createdAt || currentTime,
      "Updated At": currentTime,
      "Created By": templateMeta.createdBy || username,
      "Updated By": username,
    };

    // Update the metadata entry
    const updatedTemplateMeta = {
      ...templateMeta,
      name: name,
      Department: department,
      AppCode: appCode,
      version: templateContent.Version,
      updatedAt: currentTime,
      updatedBy: username,
    };

    // Replace the template in metadata
    metadata[templateIndex] = updatedTemplateMeta;

    // Create form data for commit
    const formData = new FormData();
    formData.append("branch", "main");
    formData.append("message", `Updated template: ${name} (ID: ${id})`);
    formData.append("metadata.json", JSON.stringify(metadata, null, 2));
    formData.append(
      templateMeta.link,
      JSON.stringify(templateContent, null, 2)
    );

    // Commit to Bitbucket
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
    console.log("Committing update to Bitbucket:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bitbucket API error:", response.status, errorText);
      return res.status(500).json({
        success: false,
        error: `Failed to update template: ${errorText}`,
      });
    }

    // Return the updated template
    return res.json({
      success: true,
      template: {
        id: id,
        name: name,
        department: department,
        appCode: appCode,
        content: content,
        instructions: instructions || "",
        examples: examples || [],
        version: templateContent.Version,
        createdAt: templateMeta.createdAt || currentTime,
        updatedAt: currentTime,
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

// Add this endpoint to your server
app.get("/api/test-bitbucket-auth", async (req, res) => {
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Missing credentials",
      details: {
        workspace: !!workspace,
        repoSlug: !!repoSlug,
        username: !!username,
        hasAccessToken: !!accessToken,
      },
    });
  }

  console.log(
    "Using OAuth access token (first 10 chars):",
    accessToken.substring(0, 10) + "..."
  );

  try {
    // Test with a simple repository info request
    const infoUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}`;
    const response = await fetch(infoUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        repoName: data.name,
        repoDescription: data.description,
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error: errorText,
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Add this endpoint to server_new.js
app.delete("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  const { requestComment } = req.body || {};

  console.log(`Received delete request for template ID: ${id}`);

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username =
    process.env.USERNAME || process.env.BITBUCKET_USERNAME || "System";
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  // Check if approval workflow is enabled via env var
  const requireApproval = process.env.REQUIRE_DELETE_APPROVAL === "true";

  if (!workspace || !repoSlug || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly.",
    });
  }

  try {
    // STEP 1: Find the template in metadata
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);

    const metadataResponse = await fetch(metadataUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    if (!metadataResponse.ok) {
      return res.status(404).json({
        success: false,
        error: "Metadata file not found.",
      });
    }

    let metadata = await metadataResponse.json();
    if (!Array.isArray(metadata)) {
      return res.status(500).json({
        success: false,
        error: "Metadata has invalid format.",
      });
    }

    // Find the template to delete
    const templateIndex = metadata.findIndex((item) => item.id === id);
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Template with ID ${id} not found.`,
      });
    }

    const templateMeta = metadata[templateIndex];
    console.log("Found template to delete:", templateMeta);

    // STEP 2: Handle deletion based on whether approval is required
    if (requireApproval) {
      console.log(
        "Approval workflow is enabled. Creating delete request PR..."
      );

      // Create a new branch for the delete request
      const timestamp = new Date().getTime();
      const deleteBranchName = `delete-template-${id}-${timestamp}`;

      try {
        // Create the branch using Bitbucket API
        const createBranchUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches`;

        const createBranchResponse = await fetch(createBranchUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: deleteBranchName,
            target: {
              hash: "main", // Branch from main
            },
          }),
        });

        if (!createBranchResponse.ok) {
          const errorText = await createBranchResponse.text();
          console.error("Error creating branch:", errorText);
          return res.status(500).json({
            success: false,
            error: "Failed to create branch for deletion request.",
          });
        }

        // Create updated metadata with the template marked for deletion
        const updatedMetadata = [...metadata];
        updatedMetadata[templateIndex] = {
          ...templateMeta,
          markedForDeletion: true,
          deletionRequestedBy: username,
          deletionRequestedAt: new Date().toISOString(),
          deletionComment: requestComment || "Deletion requested",
        };

        // Commit the updated metadata to the new branch
        const formData = new FormData();
        formData.append("branch", deleteBranchName);
        formData.append(
          "message",
          `Request to delete template: ${templateMeta.name} (ID: ${id})`
        );
        formData.append(
          "metadata.json",
          JSON.stringify(updatedMetadata, null, 2)
        );

        const commitResponse = await fetch(
          `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

        if (!commitResponse.ok) {
          const errorText = await commitResponse.text();
          console.error("Error committing metadata update:", errorText);
          return res.status(500).json({
            success: false,
            error: "Failed to create deletion request.",
          });
        }

        // Create pull request for approval
        const createPrUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests`;

        const createPrResponse = await fetch(createPrUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `Delete Template: ${templateMeta.name}`,
            description: `Deletion request for template ID ${id}.\n\nRequested by: ${username}\nComment: ${
              requestComment || "No comment provided"
            }\n\nPlease review and approve to confirm deletion.`,
            source: {
              branch: {
                name: deleteBranchName,
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

        if (!createPrResponse.ok) {
          const errorText = await createPrResponse.text();
          console.error("Error creating PR:", errorText);
          return res.status(500).json({
            success: false,
            error: "Failed to create pull request for deletion approval.",
          });
        }

        const prData = await createPrResponse.json();

        return res.json({
          success: true,
          message: "Deletion request submitted for approval",
          status: "pending_approval",
          pullRequestUrl: prData.links.html.href,
          pullRequestId: prData.id,
        });
      } catch (error) {
        console.error("Error in PR creation:", error);
        return res.status(500).json({
          success: false,
          error: "Error creating approval request: " + error.message,
        });
      }
    }

    // If no approval required, proceed with immediate deletion
    console.log("Proceeding with direct deletion (no approval required)");

    // Remove the template from metadata
    metadata.splice(templateIndex, 1);

    // Get the template file path
    const templatePath = templateMeta.link;
    if (!templatePath) {
      return res.status(400).json({
        success: false,
        error: "Template metadata is missing the file path.",
      });
    }

    // Commit the updated metadata and delete the template file
    const formData = new FormData();
    formData.append("branch", "main");
    formData.append(
      "message",
      `Deleted template: ${templateMeta.name} (ID: ${id})`
    );
    formData.append("metadata.json", JSON.stringify(metadata, null, 2));

    // Set the template file to be deleted (by setting content to empty string with /- path)
    formData.append(`${templatePath}/-`, "");

    const deleteResponse = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error("Error deleting template:", errorText);
      return res.status(500).json({
        success: false,
        error: "Failed to delete template.",
      });
    }

    return res.json({
      success: true,
      message: "Template deleted successfully",
      status: "deleted",
      deletedTemplate: templateMeta,
    });
  } catch (err) {
    console.error("Error in template deletion:", err);
    res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

// Add this webhook endpoint to server_new.js
app.post("/api/webhooks/bitbucket", async (req, res) => {
  const event = req.headers["x-event-key"];
  const data = req.body;

  console.log(`Received Bitbucket webhook: ${event}`);

  // Handle PR merged events for template deletion
  if (
    event === "pullrequest:fulfilled" &&
    data.pullrequest?.title?.startsWith("Delete Template:")
  ) {
    console.log("Processing completed deletion PR:", data.pullrequest.id);

    // The PR has already been merged, which means the metadata.json was updated
    // If we want to actually delete the file, we need to handle that here

    try {
      const prDescription = data.pullrequest.description;
      const idMatch = prDescription.match(/template ID (\d+)/);

      if (idMatch && idMatch[1]) {
        const templateId = idMatch[1];
        console.log(`Executing actual deletion for template ID: ${templateId}`);

        // Now we need to get the template info and actually delete the file
        const workspace = process.env.BITBUCKET_WORKSPACE;
        const repoSlug = process.env.BITBUCKET_REPO;
        const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

        // Fetch metadata to get the template path
        const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
        const metadataResponse = await fetch(metadataUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();

          // Find the template marked for deletion
          const templateMeta = metadata.find(
            (item) =>
              item.id === templateId ||
              (item.markedForDeletion && item.id === templateId)
          );

          if (templateMeta && templateMeta.link) {
            // Remove the template from metadata
            const updatedMetadata = metadata.filter(
              (item) => item.id !== templateId
            );

            // Commit the updated metadata and delete the template file
            const formData = new FormData();
            formData.append("branch", "main");
            formData.append(
              "message",
              `Completed deletion of template: ${templateMeta.name} (ID: ${templateId})`
            );
            formData.append(
              "metadata.json",
              JSON.stringify(updatedMetadata, null, 2)
            );

            // Set the template file to be deleted
            formData.append(`${templateMeta.link}/-`, "");

            const deleteResponse = await fetch(
              `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
              }
            );

            console.log("Deletion completed, status:", deleteResponse.status);
          }
        }
      }
    } catch (err) {
      console.error("Error processing deletion webhook:", err);
    }
  }

  // Acknowledge the webhook
  res.status(200).json({ success: true });
});

// Add this endpoint to server_new.js
app.get("/api/templates/:id/history", async (req, res) => {
  const { id } = req.params;
  console.log(`Fetching version history for template ID: ${id}`);

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly",
    });
  }

  try {
    // First, get the template metadata to find its file path
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: getBitbucketAuthHeaders(),
    });

    if (!metadataResponse.ok) {
      return res.status(404).json([]);
    }

    const metadata = await metadataResponse.json();
    const templateMeta = metadata.find(
      (item) => String(item.id) === String(id)
    );

    if (!templateMeta || !templateMeta.link) {
      return res.status(404).json([]);
    }

    // Now get the commit history for this file
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

// Fallback API for other endpoints (optional)
app.use("/api", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 4000;

// Start the frontend webpack server in a separate process
const startFrontend = () => {
  const frontend = exec("webpack serve --mode development --port 3000");

  frontend.stdout.on("data", (data) => {
    console.log(`Frontend: ${data}`);
  });

  frontend.stderr.on("data", (data) => {
    console.error(`Frontend error: ${data}`);
  });

  frontend.on("close", (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });
};

// Start the frontend
startFrontend();

// Start the backend
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`Frontend should be available at http://localhost:3000`);
});
