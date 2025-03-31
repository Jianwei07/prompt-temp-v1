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
  const listUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src?path=templates`;

  try {
    // Get the list of files in the templates folder
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(
        "Bitbucket API list error:",
        listResponse.status,
        errorText
      );
      return res.status(500).json({ error: errorText });
    }
    const listData = await listResponse.json();

    // For each file, fetch its content and parse metadata
    const templates = await Promise.all(
      listData.values.map(async (file) => {
        const filePath = file.path; // e.g., "templates/test_template.md"
        const fileName =
          filePath.split("/").pop()?.replace(".md", "") || "Unknown";

        // Fetch file content
        const contentUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/main/${filePath}`;
        const contentResponse = await fetch(contentUrl, {
          headers: { Authorization: `Basic ${auth}` },
        });
        let content = "";
        if (contentResponse.ok) {
          content = await contentResponse.text();
        }

        // Parse metadata from markdown using regex
        // Adjust these regexes based on how your markdown is formatted.
        const deptRegex = /\*\*Department Codes:\*\*\s*(.*)/i;
        const collRegex = /\*\*Collection:\*\*\s*(.*)/i;
        let departmentCodes = [];
        let collection = "";

        const deptMatch = content.match(deptRegex);
        if (deptMatch && deptMatch[1]) {
          departmentCodes = deptMatch[1].split(",").map((s) => s.trim());
        }
        const collMatch = content.match(collRegex);
        if (collMatch && collMatch[1]) {
          collection = collMatch[1].trim();
        }

        // Return a template object; adjust fields as necessary
        return {
          id: filePath, // use file path as unique identifier
          name: fileName,
          content,
          version: "N/A", // Optionally parse version info if included
          departmentCodes,
          collection,
          lastUsed: "", // Can be set from commit data if needed
          updatedBy: "",
          createdAt: new Date(), // Placeholder; can be replaced with actual metadata
          updatedAt: new Date(),
          createdBy: "",
        };
      })
    );

    res.json(templates);
  } catch (err) {
    console.error("Error fetching templates from Bitbucket:", err);
    res.status(500).json({ error: err.toString() });
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
