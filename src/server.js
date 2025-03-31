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

// server.js (or bitbucketService.js)
app.get("/api/templates", async (req, res) => {
  // Build the Bitbucket API URL to list files in the "templates/" folder
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO;
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src?path=templates`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket API error: ${errorText}`);
    }

    // The JSON includes a "values" array listing file info
    const data = await response.json();

    // data.values = array of file objects { path: "templates/as.md", ... }
    // We'll build an array of template objects for the front-end
    const templates = await Promise.all(
      data.values.map(async (file) => {
        // Optional: fetch each file’s content if you want to display more info
        // or parse the front matter from the markdown
        // For now, we just return minimal info
        return {
          id: file.path, // e.g. "templates/as.md"
          name: file.path.split("/").pop()?.replace(".md", ""), // "as"
          content: "", // Fill later if needed
          collection: "", // Fill from front matter or your own logic
          departmentCodes: [], // Fill from front matter or your own logic
          // ... other fields
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
