import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import { getTemplate, getVersionHistory } from "../services/templateService";
import Header from "../components/Header";
import type { Template, VersionHistory } from "../types";
import CodeIcon from "@mui/icons-material/Code";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import LaunchIcon from '@mui/icons-material/Launch';
import VersionHistoryCard from "../components/VersionHistory";

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

          <Box sx={{ mb: 4 }}>
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
            <Chip label={`Version ${template.version}`} sx={{ mr: 1 }} />

            <Box 
              component="a"
              href={`https://bitbucket.org/debugging-dragons/prompt-template/src/main/${template.department}/${template.appCode}/${template.name}.json`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#2684FF', // Bitbucket blue
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                ml: 1,
                bgcolor: 'rgba(38, 132, 255, 0.08)', // Light blue background
                py: 0.75,
                px: 1.5,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                border: '1px solid transparent',
                '&:hover': {
                  bgcolor: 'rgba(38, 132, 255, 0.12)',
                  border: '1px solid rgba(38, 132, 255, 0.3)',
                }
              }}
            >
              View in Bitbucket
              <LaunchIcon sx={{ ml: 0.5, fontSize: 16 }} />
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Left Column - Content */}
            <Grid item xs={12} md={7}>

              <Typography variant="h6" gutterBottom>
                Content
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.50", mb: 3 }}>
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

              <Typography variant="h6" gutterBottom>
                Instructions
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.50", mb: 3 }}>
                <Typography>{template.instructions}</Typography>
              </Paper>

              {template.examples.length > 0 && (
                <Box sx={{ mb: 3 }}>
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
                </Box>
              )}

              <Box sx={{ mt: 3, p: 2, bgcolor: "background.paper", borderRadius: 1, border: '1px solid rgba(0,0,0,0.08)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <PersonIcon sx={{ mr: 1, fontSize: "small" }} />
                  Created by <Box component="span" sx={{ fontWeight: "bold", mx: 0.5 }}>{template.createdBy}</Box> on{" "}
                  {new Date(template.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center" }}>
                  <PersonIcon sx={{ mr: 1, fontSize: "small" }} />
                  Last updated by <Box component="span" sx={{ fontWeight: "bold", mx: 0.5 }}>{template.updatedBy}</Box> on{" "}
                  {new Date(template.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Grid>

            {/* Right Column - Version History */}
            <Grid item xs={12} md={5}>
              <VersionHistoryCard 
                history={versionHistory} 
                containerSx={{ 
                  position: "sticky",
                  top: 16
                }} 
              />
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </>
  );
};

export default ViewTemplate;
