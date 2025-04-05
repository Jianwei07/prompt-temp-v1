import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Divider,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
  getVersionHistory,
} from "../services/templateService";
import Header from "../components/Header";
import type { Template, VersionHistory } from "../types";

const UpdateTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Template>({
    id: "",
    name: "",
    department: "",
    appCode: "",
    content: "",
    instructions: "",
    examples: [],
    version: "",
    createdBy: "",
    createdAt: "",
    updatedBy: "",
    updatedAt: "",
  });
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadTemplate = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [template, history] = await Promise.all([
          getTemplate(id),
          getVersionHistory(id),
        ]);
        setFormData(template);
        setVersionHistory(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load template");
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      if (!formData.id) {
        throw new Error("Template ID is missing");
      }
      
      console.log("Submitting update for template:", formData);
      
      const updatedTemplate = await updateTemplate({
        id: formData.id,
        name: formData.name,
        department: formData.department,
        appCode: formData.appCode,
        content: formData.content,
        instructions: formData.instructions,
        examples: formData.examples,
      });
      
      console.log("Template updated successfully:", updatedTemplate);
      setMessage("Template updated successfully!");
      
      // Navigate to the updated template's view page after a short delay
      setTimeout(() => {
        navigate(`/view-template/${updatedTemplate.id}`);
      }, 1500);
    } catch (err) {
      console.error("Error updating template:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteTemplate(id || "");
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setIsLoading(false);
      setOpenDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Edit Template
          </Typography>
          {error && (
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
          )}
          {message && (
            <Typography color="success" gutterBottom>
              {message}
            </Typography>
          )}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="App Code"
                  value={formData.appCode}
                  onChange={(e) => setFormData({ ...formData, appCode: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Content"
                  multiline
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Instructions"
                  multiline
                  rows={2}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Examples
                </Typography>
                {formData.examples.map((example, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="User Input"
                      value={example["User Input"]}
                      onChange={(e) => {
                        const newExamples = [...formData.examples];
                        newExamples[index]["User Input"] = e.target.value;
                        setFormData({ ...formData, examples: newExamples });
                      }}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Expected Output"
                      value={example["Expected Output"]}
                      onChange={(e) => {
                        const newExamples = [...formData.examples];
                        newExamples[index]["Expected Output"] = e.target.value;
                        setFormData({ ...formData, examples: newExamples });
                      }}
                    />
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      examples: [...formData.examples, { "User Input": "", "Expected Output": "" }],
                    });
                  }}
                >
                  Add Example
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button type="submit" variant="contained" disabled={isLoading}>
                Save Changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setOpenDeleteDialog(true)}
              >
                Delete Template
              </Button>
            </Box>
          </form>

          {versionHistory.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {versionHistory.map((version) => (
                <Box key={version.commitId} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">
                    Version {version.version} by {version.userDisplayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(version.timestamp).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">{version.message}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Container>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this template? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UpdateTemplate;
