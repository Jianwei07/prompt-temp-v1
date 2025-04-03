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
  const { name, content, departmentCodes } = req.body;
  if (!name || !content) {
    return res.status(400).json({
      success: false,
      error: "Name and content are required",
    });
  }

  const markdownContent = `# ${name}

${content}

**Department Codes:** ${departmentCodes ? departmentCodes.join(", ") : "N/A"}

Created on: ${new Date().toISOString()}`;

  const fileName = name.replace(/\s+/g, "_").toLowerCase() + ".md";

  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  console.log("Bitbucket Config:", { workspace, repoSlug, username });

  if (!workspace || !repoSlug || !username || !appPassword) {
    return res.status(500).json({
      success: false,
      error: "Bitbucket credentials are not set properly in the environment.",
    });
  }

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const formData = new FormData();
  formData.append("branch", "main");
  formData.append("message", `Creating new template: ${name}`);
  formData.append(`templates/${fileName}`, markdownContent);

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
    res.json({ success: true, filePath: `templates/${fileName}`, result });
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
    // First, fetch metadata.json
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    console.log("Fetching metadata from:", metadataUrl);
    
    const metadataResponse = await fetch(metadataUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error("Metadata fetch error:", metadataResponse.status, errorText);
      return res.status(500).json({ error: errorText });
    }

    const metadata = await metadataResponse.json();
    console.log("Fetched metadata:", metadata);

    // Fetch content for each template
    const templates = await Promise.all(
      metadata.map(async (item) => {
        const contentUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main${item.link}`;
        console.log("Fetching template content from:", contentUrl);

        const contentResponse = await fetch(contentUrl, {
          headers: { Authorization: `Basic ${auth}` },
        });

        let content = {};
        if (contentResponse.ok) {
          content = await contentResponse.json();
          console.log("Fetched template content for", item.name, ":", content);
        } else {
          console.error(
            "Template content fetch error for",
            item.name,
            ":",
            await contentResponse.text()
          );
        }

        // Combine metadata with content
        return {
          id: item.id,
          name: item.name,
          department: item.Department,
          appCode: item.AppCode,
          version: item.version,
          createdAt: item.createdAt,
          createdBy: item.createdBy,
          updatedAt: item.updatedAt,
          updatedBy: item.updatedBy,
          content: content["Main Prompt Content"] || "",
          instructions: content["Additional Instructions"] || "",
          examples: content["Examples"] || [],
        };
      })
    );

    console.log("Final templates array:", templates);
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
    // First, fetch metadata.json
    const metadataUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/metadata.json`;
    const metadataResponse = await fetch(metadataUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!metadataResponse.ok) {
      throw new Error("Failed to fetch metadata");
    }

    const metadata = await metadataResponse.json();
    const templateMetadata = metadata.find(item => item.id === id);

    if (!templateMetadata) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Fetch the template content
    const contentUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main${templateMetadata.link}`;
    const contentResponse = await fetch(contentUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!contentResponse.ok) {
      throw new Error("Failed to fetch template content");
    }

    const content = await contentResponse.json();

    // Combine metadata with content
    const template = {
      id: templateMetadata.id,
      name: templateMetadata.name,
      department: templateMetadata.Department,
      appCode: templateMetadata.AppCode,
      version: templateMetadata.version,
      createdAt: templateMetadata.createdAt,
      createdBy: templateMetadata.createdBy,
      updatedAt: templateMetadata.updatedAt,
      updatedBy: templateMetadata.updatedBy,
      content: content["Main Prompt Content"] || "",
      instructions: content["Additional Instructions"] || "",
      examples: content["Examples"] || [],
    };

    res.json(template);
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({ success: false, error: err.toString() });
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
