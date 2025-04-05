// server.js
require("dotenv").config(); // Load environment variables
const express = require("express");
const webpack = require("webpack");
const path = require("path");
const cors = require("cors");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const { exec } = require('child_process');

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
if (!process.env.BITBUCKET_WORKSPACE || 
    !process.env.BITBUCKET_REPO || 
    !process.env.BITBUCKET_ACCESS_TOKEN) {
  console.error("ERROR: Missing required environment variables.");
  console.error("Make sure BITBUCKET_WORKSPACE, BITBUCKET_REPO, and BITBUCKET_ACCESS_TOKEN are set in your .env file.");
  // Uncomment if you want to exit when environment variables are missing
  // process.exit(1);
}

console.log("Environment loaded successfully. Bitbucket config:", {
  workspace: process.env.BITBUCKET_WORKSPACE,
  repoSlug: process.env.BITBUCKET_REPO,
  hasToken: !!process.env.BITBUCKET_ACCESS_TOKEN
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
  accessToken: process.env.BITBUCKET_ACCESS_TOKEN
};

// Helper function to get auth headers
function getBitbucketAuthHeaders() {
  return { 
    Authorization: `Bearer ${BITBUCKET_CONFIG.accessToken}`,
    Accept: "application/json"
  };
}

// Update the template creation endpoint to not use caching or retries
app.post("/api/templates", async (req, res) => {
  console.log("Received template creation request with data:", JSON.stringify(req.body, null, 2));

  const { name, content, department, appCode, instructions, examples } = req.body;
  if (!name || !content || !department || !appCode) {
    return res.status(400).json({
      success: false,
      error: "Name, content, department, and appCode are required",
    });
  }

  // Validate examples format if provided
  let processedExamples = [];
  if (examples) {
    if (Array.isArray(examples)) {
      // Ensure each example has the required structure
      processedExamples = examples.map(example => {
        // If example is already in the right format, use it
        if (example["User Input"] && example["Expected Output"]) {
          return example;
        }
        
        // Otherwise, try to convert it to the right format
        return {
          "User Input": example.input || example.userInput || example.question || "",
          "Expected Output": example.output || example.expectedOutput || example.answer || ""
        };
      });
    } else {
      console.warn("Invalid examples format. Using empty array instead.");
    }
  }

  // Get Singapore time (UTC+8)
  const sgTime = new Date();
  sgTime.setHours(sgTime.getHours() + 8);
  const sgTimeString = sgTime.toISOString();

  // Get username from environment variable or use a default
  const username = process.env.USERNAME || process.env.BITBUCKET_USERNAME || "System";

  // Create a JSON-friendly filename
  const fileName = `${name.replace(/\s+/g, "-")}.json`;

  // Use department/appCode path structure for the template file
  const filePath = `${department}/${appCode}/${fileName}`;

  // Create link for metadata
  const link = `/${department}/${appCode}/${fileName}`;

  console.log("Template will be created at path:", filePath);
  console.log("Link in metadata will be:", link);

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  console.log("Bitbucket Config:", { workspace, repoSlug, username });
  console.log("Creating template in path:", filePath);

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  console.log("Using OAuth access token (first 10 chars):", 
    accessToken.substring(0, 10) + "...");

  try {
    // STEP 1: Fetch the current metadata.json directly without caching
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);
    
    let metadata = [];
    try {
      const metadataResponse = await fetch(metadataUrl, {
        headers: getBitbucketAuthHeaders()
      });
      
      if (metadataResponse.status === 401) {
        console.error("Authentication failed (HTTP 401). Check your Bitbucket credentials.");
        return res.status(401).json({
          success: false,
          error: "Authentication failed. Please check your Bitbucket credentials.",
        });
      }
      
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
        console.log(`Metadata file not found or error (status: ${metadataResponse.status}), creating new one`);
      }
    } catch (fetchError) {
      console.error("Error fetching metadata:", fetchError);
    }
    
    // STEP 2: Create new metadata entry with sequential ID
    let newId;
    if (metadata.length === 0) {
      // If there are no templates yet, start with ID 1
      newId = "1";
    } else {
      // Find the highest existing ID and increment it
      const highestId = metadata.reduce((maxId, template) => {
        // Parse the ID as a number if possible
        const templateId = parseInt(template.id, 10);
        // Only consider numeric IDs for comparison
        if (!isNaN(templateId) && templateId > maxId) {
          return templateId;
        }
        return maxId;
      }, 0);
      
      // Increment the highest ID
      newId = (highestId + 1).toString();
    }

    console.log(`Generated new sequential ID: ${newId} (based on ${metadata.length} existing templates)`);

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
      updatedAt: ""
    };

    // Add new entry to metadata
    metadata.push(newMetadataEntry);
    
    // STEP 3: Create template content
    const templateContent = {
      "Main Prompt Content": content,
      "Additional Instructions": instructions || "",
      "Examples": processedExamples
    };
    
    // Add validation for examples format
    if (processedExamples && !Array.isArray(processedExamples)) {
      console.warn("Examples provided is not an array. Converting to empty array.");
    }

    // Log the structure to verify
    console.log("Template content structure:", {
      contentLength: content.length,
      hasInstructions: !!instructions,
      examplesCount: Array.isArray(processedExamples) ? processedExamples.length : 0
    });
    
    // STEP 4: Create FormData for the multi-file commit
    const formData = new FormData();
    formData.append("branch", "main");
    formData.append("message", `Creating new template: ${name} in ${department}/${appCode}`);

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

    // Debug output to confirm paths
    console.log("FormData contents:");
    let formDataEntries = [];
    for (let pair of formData.entries()) {
      formDataEntries.push({
        key: pair[0],
        valueType: typeof pair[1],
        valuePreview: typeof pair[1] === 'string' ? pair[1].substring(0, 50) + '...' : '[Object]'
      });
    }
    console.log(JSON.stringify(formDataEntries, null, 2));

    // STEP 5: Send request to Bitbucket without retry
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
    console.log("Sending request to Bitbucket API URL:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    
    // Check response and get response text for proper debugging
    let responseText;
    try {
      responseText = await response.text();
      console.log("Bitbucket API Response Status:", response.status);
      console.log("Bitbucket API Response:", responseText);
      
      if (!response.ok) {
        console.error("Bitbucket API error:", response.status, responseText);
        throw new Error(`Bitbucket API error: ${response.status} - ${responseText}`);
      }
    } catch (err) {
      console.error("Error processing API response:", err);
      throw err;
    }
    
    // STEP 6: Return the template
    res.json({
      success: true,
      filePath: filePath,
      template: {
        id: newId,
        name,
        department,
        appCode,
        content,
        instructions,
        examples,
        createdAt: sgTimeString,
        createdBy: username,
        version: "v1.0",
        updatedAt: "",
        updatedBy: "",
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

  console.log("Using OAuth access token (first 10 chars):", 
    accessToken.substring(0, 10) + "...");

  try {
    // Fetch metadata.json directly without caching
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);
    
    const metadataResponse = await fetch(metadataUrl, {
      headers: getBitbucketAuthHeaders()
    });
    
    if (!metadataResponse.ok) {
      console.error("Error fetching metadata:", metadataResponse.status);
      return res.status(metadataResponse.status).json({ 
        error: `Failed to fetch metadata: ${metadataResponse.status}` 
      });
    }
    
    const metadata = await metadataResponse.json();
    
    if (!Array.isArray(metadata)) {
      return res.status(500).json({ 
        error: "Metadata is not in the expected format (should be an array)" 
      });
    }
    
    // Return the templates directly from metadata
    const templates = metadata.map(entry => ({
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
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  console.log("Using OAuth access token (first 10 chars):", 
    accessToken.substring(0, 10) + "...");

  try {
    // Since we're using a composite ID format (department-appCode-filename-timestamp),
    // we need to parse it to find the template
    const idParts = id.split("-");

    // If the ID doesn't have at least 3 parts (department, appCode, and filename),
    // it's not a valid ID for our new structure
    if (idParts.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Invalid template ID format",
      });
    }

    // Extract components from the ID
    // The timestamp may be at the end of the ID, so we remove it
    // The filename may contain hyphens, so we need to be careful with the split
    const timestamp = idParts[idParts.length - 1];
    const department = idParts[0];
    const appCode = idParts[1];

    // All the remaining parts (excluding department, appCode, and timestamp)
    // should be considered as the filename
    let fileName;
    if (/^\d+$/.test(timestamp)) {
      // If timestamp is a number, remove it from the filename parts
      fileName = idParts.slice(2, idParts.length - 1).join("-");
    } else {
      // If the last part is not a number, include it in the filename
      fileName = idParts.slice(2).join("-");
    }

    console.log(
      `Looking for template: Department=${department}, AppCode=${appCode}, FileName=${fileName}`
    );

    // First check if the department exists
    const departmentUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${department}/`;
    const departmentResponse = await fetch(departmentUrl, {
      headers: getBitbucketAuthHeaders()
    });

    if (!departmentResponse.ok) {
      return res.status(404).json({
        success: false,
        error: `Department '${department}' not found`,
      });
    }

    // Check if the app code exists within the department
    const appCodeUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${department}/${appCode}/`;
    const appCodeResponse = await fetch(appCodeUrl, {
      headers: getBitbucketAuthHeaders()
    });

    if (!appCodeResponse.ok) {
      return res.status(404).json({
        success: false,
        error: `App code '${appCode}' not found in department '${department}'`,
      });
    }

    // Look for JSON files in the app code directory
    const appCodeData = await appCodeResponse.json();
    const templateFiles = appCodeData.values.filter(
      (item) => item.path.endsWith(".json") && item.type === "commit_file"
    );

    // Try to match the template by name
    const matchingTemplates = templateFiles.filter((file) => {
      const fileNameWithoutExt = file.path
        .split("/")
        .pop()
        .replace(".json", "");
      return (
        fileNameWithoutExt === fileName ||
        fileNameWithoutExt.toLowerCase() === fileName.toLowerCase()
      );
    });

    if (matchingTemplates.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Template '${fileName}' not found in ${department}/${appCode}/`,
      });
    }

    // Get the content of the matching template
    const templatePath = matchingTemplates[0].path;
    const templateUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${templatePath}`;
    const templateResponse = await fetch(templateUrl, {
      headers: getBitbucketAuthHeaders()
    });

    if (!templateResponse.ok) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch template content for '${templatePath}'`,
      });
    }

    const templateContent = await templateResponse.json();

    // Create the template object
    const template = {
      id: id, // Keep the original ID
      name: templateContent["Template Name"] || fileName,
      department: department,
      appCode: appCode,
      version: templateContent["Version"] || "v1.0",
      content: templateContent["Main Prompt Content"] || "",
      instructions: templateContent["Additional Instructions"] || "",
      examples: templateContent["Examples"] || [],
      createdAt: templateContent["Created At"] || new Date().toISOString(),
      updatedAt: templateContent["Updated At"] || new Date().toISOString(),
      createdBy: templateContent["Created By"] || "System",
      updatedBy: templateContent["Updated By"] || "System",
    };

    res.json(template);
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({ success: false, error: err.toString() });
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

  console.log("Using OAuth access token (first 10 chars):", 
    accessToken.substring(0, 10) + "...");

  try {
    // First, try to list the contents of the repository root
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/`;
    console.log("Fetching from Bitbucket API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: getBitbucketAuthHeaders()
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
            headers: getBitbucketAuthHeaders()
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

// Add this endpoint after your existing endpoints
app.put("/api/templates/:id", async (req, res) => {
  console.log(
    "Received template update request with data:",
    JSON.stringify(req.body, null, 2)
  );

  const { id } = req.params;
  const { name, content, department, appCode, instructions, examples } = req.body;
  
  if (!name || !content || !department || !appCode) {
    return res.status(400).json({
      success: false,
      error: "Name, content, department, and appCode are required",
    });
  }

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;

  if (!workspace || !repoSlug || !username || !accessToken) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  console.log("Using OAuth access token (first 10 chars):", 
    accessToken.substring(0, 10) + "...");

  try {
    // Parse the ID to get the original file information
    const idParts = id.split("-");
    if (idParts.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Invalid template ID format",
      });
    }

    // Extract components from the ID
    const timestamp = idParts[idParts.length - 1];
    const originalDepartment = idParts[0];
    const originalAppCode = idParts[1];
    let originalFileName;
    
    if (/^\d+$/.test(timestamp)) {
      originalFileName = idParts.slice(2, idParts.length - 1).join("-");
    } else {
      originalFileName = idParts.slice(2).join("-");
    }

    console.log("Original template details:", {
      department: originalDepartment,
      appCode: originalAppCode,
      fileName: originalFileName
    });
    
    // Get Singapore time (UTC+8)
    const sgTime = new Date();
    sgTime.setHours(sgTime.getHours() + 8);
    const sgTimeString = sgTime.toISOString();

    // Create a properly formatted JSON content - keep createdAt and createdBy from original
    // First, we need to fetch the original template to preserve creation info
    const originalTemplateUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${originalDepartment}/${originalAppCode}/${originalFileName}.json`;
    const originalResponse = await fetch(originalTemplateUrl, {
      headers: getBitbucketAuthHeaders()
    });
    
    if (!originalResponse.ok) {
      return res.status(404).json({
        success: false,
        error: `Original template not found: ${originalTemplateUrl}`
      });
    }
    
    const originalContent = await originalResponse.json();
    
    // Create updated content with original creation info preserved
    const jsonContent = {
      "Template Name": name,
      Department: department,
      AppCode: appCode,
      Version: originalContent.Version ? incrementVersion(originalContent.Version) : "v1.1",
      "Main Prompt Content": content,
      "Additional Instructions": instructions || "",
      Examples: examples || [],
      "Created At": originalContent["Created At"] || sgTimeString,
      "Updated At": sgTimeString,
      "Created By": originalContent["Created By"] || username,
      "Updated By": username
    };

    // If department or appCode changed, or if the name changed, we need to create a new file
    // and potentially delete the old one
    const newFileName = `${name.replace(/\s+/g, "-")}.json`;
    const newFilePath = `${department}/${appCode}/${newFileName}`;
    const originalFilePath = `${originalDepartment}/${originalAppCode}/${originalFileName}.json`;
    
    console.log("Updating template:", {
      originalPath: originalFilePath,
      newPath: newFilePath,
      contentChanged: true
    });

    // Create a form to submit the updated content
    const formData = new FormData();
    formData.append("branch", "main");
    formData.append(
      "message",
      `Updating template: ${name} in ${department}/${appCode}`
    );
    formData.append(newFilePath, JSON.stringify(jsonContent, null, 2));

    // Send the update request
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
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
      throw new Error(`Bitbucket API error: ${errorText}`);
    }

    // If paths are different, delete the original file
    if (newFilePath !== originalFilePath) {
      console.log(`File path changed. Deleting original file: ${originalFilePath}`);
      
      // Note: Bitbucket API doesn't have a direct delete endpoint for files.
      // You would need to create a commit that removes the file.
      // This functionality would need to be implemented if needed.
    }

    // Create a new ID for the updated template
    const newId = originalContent.id || id;

    res.json({
      success: true,
      id: newId,
      newFilePath,
      template: {
        id: newId,
        name,
        department,
        appCode,
        content,
        instructions,
        examples,
        version: jsonContent.Version,
        createdAt: jsonContent["Created At"],
        updatedAt: jsonContent["Updated At"],
        createdBy: jsonContent["Created By"],
        updatedBy: jsonContent["Updated By"]
      }
    });
  } catch (err) {
    console.error("Error updating template:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Helper function to increment version
function incrementVersion(version) {
  if (!version) return "v1.1";
  
  const match = version.match(/v(\d+)\.(\d+)/);
  if (!match) return "v1.1";
  
  const major = parseInt(match[1]);
  const minor = parseInt(match[2]);
  
  return `v${major}.${minor + 1}`;
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
        hasAccessToken: !!accessToken
      }
    });
  }
  
  console.log("Using OAuth access token (first 10 chars):", 
    accessToken.substring(0, 10) + "...");

  try {
    // Test with a simple repository info request
    const infoUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}`;
    const response = await fetch(infoUrl, {
      headers: getBitbucketAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        repoName: data.name,
        repoDescription: data.description
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        status: response.status,
        error: errorText
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.toString()
    });
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
  const frontend = exec('webpack serve --mode development --port 3000');
  
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
  console.log(`Frontend should be available at http://localhost:3000`);
});
