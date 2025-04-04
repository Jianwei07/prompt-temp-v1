// server.js
require("dotenv").config(); // Load environment variables
const express = require("express");
const webpack = require("webpack");
const path = require("path");
const cors = require("cors");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

// Optionally, if Node version does not have global FormData, uncomment the following lines:
// const FormData = require("form-data");
// const fetch = require("node-fetch");

const config = require("../webpack.config.js"); // Adjust path if needed
const compiler = webpack(config);

const app = express();
app.use(cors());

// For parsing JSON bodies
app.use(express.json());

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

// Bitbucket integration endpoint for creating a template
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

  // Create a properly formatted JSON content
  const jsonContent = {
    "Template Name": name,
    Department: department,
    AppCode: appCode,
    Version: "v1.0",
    "Main Prompt Content": content,
    "Additional Instructions": instructions || "",
    Examples: examples || [],
    "Created At": new Date().toISOString(),
    "Updated At": new Date().toISOString(),
    "Created By": "System", // This could be replaced with actual user info if available
    "Updated By": "System",
  };

  // Create a JSON-friendly filename
  const fileName = `${name.replace(/\s+/g, "-")}.json`;
  // Use department/appCode path structure
  const filePath = `${department}/${appCode}/${fileName}`;

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  console.log("Bitbucket Config:", { workspace, repoSlug, username });
  console.log("Creating template in path:", filePath);
  console.log("Template content:", JSON.stringify(jsonContent, null, 2));

  if (!workspace || !repoSlug || !username || !appPassword) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const formData = new FormData();
  formData.append("branch", "main");
  formData.append(
    "message",
    `Creating new template: ${name} in ${department}/${appCode}`
  );
  // Append the JSON content as a string
  formData.append(filePath, JSON.stringify(jsonContent, null, 2));

  console.log("FormData prepared with key:", filePath);

  const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;
  console.log("Sending request to Bitbucket API URL:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        // Do not set 'Content-Type' header here; let FormData set it.
      },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bitbucket API error:", response.status, errorText);
      throw new Error(`Bitbucket API error: ${errorText}`);
    }
    const responseText = await response.text();
    let result = {};
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(
          "Response is not valid JSON. Proceeding with empty result."
        );
      }
    }
    console.log("Template committed to Bitbucket:", result);
    res.json({
      success: true,
      filePath: filePath,
      result,
      template: {
        id: new Date().getTime().toString(),
        name,
        department,
        appCode,
        content,
        instructions,
        examples,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "v1.0",
      },
    });
  } catch (err) {
    console.error("Error in /api/templates endpoint:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

app.get("/api/templates", async (req, res) => {
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  if (!workspace || !repoSlug || !username || !appPassword) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  try {
    // List all department folders first
    const rootUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/`;
    console.log("Fetching repository structure from:", rootUrl);

    const rootResponse = await fetch(rootUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!rootResponse.ok) {
      const errorText = await rootResponse.text();
      console.error("Repository fetch error:", rootResponse.status, errorText);
      return res.status(500).json({ error: errorText });
    }

    const rootData = await rootResponse.json();

    // Filter to find department folders
    const departments = rootData.values.filter(
      (item) =>
        !item.path.includes("/") && // Top-level folders
        !item.path.includes(".") && // Not files
        item.type === "commit_directory"
    );

    console.log(
      "Found departments:",
      departments.map((d) => d.path)
    );

    // Collect all templates
    const templates = [];

    // For each department, check app codes and their templates
    for (const dept of departments) {
      const deptName = dept.path;
      const deptUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${deptName}/`;

      try {
        const deptResponse = await fetch(deptUrl, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
        });

        if (!deptResponse.ok) {
          console.warn(
            `Could not fetch department ${deptName} contents:`,
            await deptResponse.text()
          );
          continue;
        }

        const deptData = await deptResponse.json();

        // Find app code folders
        const appCodes = deptData.values.filter(
          (item) =>
            !item.path.includes(".") && // Not files
            item.type === "commit_directory"
        );

        // For each app code, find template files
        for (const app of appCodes) {
          const appPath = app.path;
          const appName = appPath.split("/").pop();
          const appUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${appPath}/`;

          try {
            const appResponse = await fetch(appUrl, {
              headers: {
                Authorization: `Basic ${auth}`,
                Accept: "application/json",
              },
            });

            if (!appResponse.ok) {
              console.warn(
                `Could not fetch app code ${appName} contents:`,
                await appResponse.text()
              );
              continue;
            }

            const appData = await appResponse.json();

            // Find JSON files (templates)
            const templateFiles = appData.values.filter(
              (item) =>
                item.path.endsWith(".json") && item.type === "commit_file"
            );

            // Fetch and process each template
            for (const file of templateFiles) {
              const templatePath = file.path;
              const templateUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${templatePath}`;

              try {
                const templateResponse = await fetch(templateUrl, {
                  headers: { Authorization: `Basic ${auth}` },
                });

                if (!templateResponse.ok) {
                  console.warn(
                    `Could not fetch template ${templatePath}:`,
                    await templateResponse.text()
                  );
                  continue;
                }

                const templateContent = await templateResponse.json();

                // Extract filename without extension
                const fileName = templatePath
                  .split("/")
                  .pop()
                  .replace(".json", "");

                // Add to templates collection
                templates.push({
                  id: `${deptName}-${appName}-${fileName}-${new Date().getTime()}`,
                  name: templateContent["Template Name"] || fileName,
                  department: deptName,
                  appCode: appName,
                  version: templateContent["Version"] || "v1.0",
                  content: templateContent["Main Prompt Content"] || "",
                  instructions:
                    templateContent["Additional Instructions"] || "",
                  examples: templateContent["Examples"] || [],
                  createdAt:
                    templateContent["Created At"] || new Date().toISOString(),
                  updatedAt:
                    templateContent["Updated At"] || new Date().toISOString(),
                  createdBy: templateContent["Created By"] || "System",
                  updatedBy: templateContent["Updated By"] || "System",
                });
              } catch (templateErr) {
                console.error(
                  `Error processing template ${templatePath}:`,
                  templateErr
                );
              }
            }
          } catch (appErr) {
            console.error(`Error processing app code ${appName}:`, appErr);
          }
        }
      } catch (deptErr) {
        console.error(`Error processing department ${deptName}:`, deptErr);
      }
    }

    console.log(`Found ${templates.length} templates in total`);
    res.json(templates);
  } catch (err) {
    console.error("Error in /api/templates endpoint:", err);
    res.status(500).json({ success: false, error: err.toString() });
  }
});

// Add this endpoint after your existing endpoints
app.get("/api/templates/:id", async (req, res) => {
  const { id } = req.params;
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  if (!workspace || !repoSlug || !username || !appPassword) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

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
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
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
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
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
      headers: { Authorization: `Basic ${auth}` },
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
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  console.log("Environment variables:", {
    workspace,
    repoSlug,
    username,
    hasPassword: !!appPassword,
  });

  if (!workspace || !repoSlug || !username || !appPassword) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
      details: {
        workspace: !!workspace,
        repoSlug: !!repoSlug,
        username: !!username,
        hasPassword: !!appPassword,
      },
    });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  try {
    // First, try to list the contents of the repository root
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/`;
    console.log("Fetching from Bitbucket API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
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
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
            },
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

// Fallback API for other endpoints (optional)
app.use("/api", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(
    `Express server with webpack is running on http://localhost:${PORT}`
  );
});
