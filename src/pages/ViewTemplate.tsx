import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import { getTemplate, getVersionHistory } from "../services/templateService";
import Header from "../components/Header";
import type { Template, VersionHistory } from "../types";
import CodeIcon from "@mui/icons-material/Code";
import BusinessIcon from "@mui/icons-material/Business";
import HistoryIcon from "@mui/icons-material/History";

const ViewTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTemplate = async () => {
      if (!id) return;
      try {
        const [templateData, history] = await Promise.all([
          getTemplate(id),
          getVersionHistory(id),
        ]);
        setTemplate(templateData);
        setVersionHistory(history);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load template"
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [id]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !template) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">{error || "Template not found"}</Typography>
      </Container>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h4">{template.name}</Typography>
            <Button
              component={Link}
              to={`/edit-template/${template.id}`}
              variant="contained"
            >
              Edit Template
            </Button>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Chip
              icon={<BusinessIcon />}
              label={`Department: ${template.department}`}
              sx={{ mr: 1 }}
            />
            <Chip
              icon={<CodeIcon />}
              label={`App Code: ${template.appCode}`}
              sx={{ mr: 1 }}
            />
            <Chip label={`Version ${template.version}`} />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Content
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography
                  component="pre"
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                  }}
                >
                  {template.content}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Instructions
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography>{template.instructions}</Typography>
              </Paper>
            </Grid>

            {template.examples.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Examples
                </Typography>
                {template.examples.map((example, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Example {index + 1}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary">
                        User Input:
                      </Typography>
                      <Typography>{example["User Input"]}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="primary">
                        Expected Output:
                      </Typography>
                      <Typography>{example["Expected Output"]}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <HistoryIcon sx={{ mr: 1 }} />
                  Version History
                </Typography>
                <Divider sx={{ my: 2 }} />
                {Array.isArray(versionHistory) && versionHistory.length > 0 ? (
                  versionHistory.map((version) => (
                    <Box
                      key={version.commitId || `version-${Math.random()}`}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2">
                        Version {version.version} by {version.userDisplayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(version.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">{version.message}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No version history available
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Created by {template.createdBy} on{" "}
                  {new Date(template.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last updated by {template.updatedBy} on{" "}
                  {new Date(template.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </>
  );
};

export default ViewTemplate;
