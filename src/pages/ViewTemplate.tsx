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
  Card,
  CardContent,
  Avatar,
  Stack,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import { getTemplate, getVersionHistory } from "../services/templateService";
import Header from "../components/Header";
import type { Template, VersionHistory } from "../types";
import CodeIcon from "@mui/icons-material/Code";
import BusinessIcon from "@mui/icons-material/Business";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";

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

  // Function to generate a color based on the user's name (for avatars)
  const getUserColor = (name: string) => {
    const colors = [
      "#1976d2", // blue
      "#388e3c", // green
      "#d32f2f", // red
      "#f57c00", // orange
      "#7b1fa2", // purple
      "#0288d1", // light blue
      "#c2185b", // pink
    ];
    // Simple hash function to generate a consistent color for each name
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name || name === "Unknown") return "?";
    return name
      .split(/\s+/)
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

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
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  height: "100%", 
                  bgcolor: "background.paper",
                  position: "sticky",
                  top: 16
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ 
                    display: "flex", 
                    alignItems: "center",
                    mb: 2 
                  }}
                >
                  <HistoryIcon sx={{ mr: 1 }} />
                  Version History
                </Typography>
                
                <Divider sx={{ mb: 2 }} />
                
                {Array.isArray(versionHistory) && versionHistory.length > 0 ? (
                  <Stack spacing={1.5} sx={{ maxHeight: "70vh", overflow: "auto", pr: 1 }}>
                    {versionHistory.map((version, index) => (
                      <Card 
                        key={version.commitId || `version-${index}`}
                        variant="outlined" 
                        sx={{ 
                          boxShadow: "none",
                          borderRadius: 1,
                          borderLeft: `3px solid ${getUserColor(version.userDisplayName)}`,
                        }}
                      >
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: getUserColor(version.userDisplayName),
                                width: 24,
                                height: 24,
                                fontSize: "0.8rem",
                                mr: 1
                              }}
                            >
                              {getInitials(version.userDisplayName)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={500} noWrap>
                              {version.userDisplayName}
                            </Typography>
                            <Box sx={{ flexGrow: 1 }} />
                            <Chip 
                              label={version.version} 
                              color="primary" 
                              size="small"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </Box>
                          
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: "block", 
                              color: "text.secondary",
                              mb: 1
                            }}
                          >
                            {new Date(version.timestamp).toLocaleString()}
                          </Typography>
                          
                          <Box sx={{ 
                            p: 1, 
                            bgcolor: "rgba(0,0,0,0.02)", 
                            borderRadius: 1,
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            wordBreak: "break-word",
                            border: '1px solid rgba(0,0,0,0.05)'
                          }}>
                            {version.message}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ 
                    p: 3, 
                    textAlign: "center", 
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: "divider"
                  }}>
                    <HistoryIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No version history available
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </>
  );
};

export default ViewTemplate;
