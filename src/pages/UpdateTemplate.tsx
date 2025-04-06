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
  DialogContentText,
  DialogActions,
  CircularProgress,
  Grid,
  Divider,
  Link,
  Alert,
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

  // New state variables for enhanced delete functionality
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "loading" | "success" | "pending_approval" | "error"
  >("idle");
  const [deletePrUrl, setDeletePrUrl] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

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
        setError(
          err instanceof Error ? err.message : "Failed to load template"
        );
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

  // Enhanced delete functionality
  const handleDelete = async () => {
    setDeleteStatus("loading");
    setError("");

    try {
      const result = await deleteTemplate(id || "", deleteComment);

      if (result.status === "pending_approval") {
        setDeleteStatus("pending_approval");
        setDeletePrUrl(result.pullRequestUrl || "");
        setDeleteMessage(
          result.message || "Deletion request submitted for approval"
        );
      } else {
        setDeleteStatus("success");
        setDeleteMessage(result.message || "Template deleted successfully");

        // Navigate away after a short delay for successful immediate deletion
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (err) {
      setDeleteStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to delete template"
      );
    }
  };

  const handleCloseDeleteDialog = () => {
    // If user closed dialog after a successful pending approval, navigate home
    if (deleteStatus === "pending_approval") {
      navigate("/");
    }

    // Reset delete dialog state
    setOpenDeleteDialog(false);
    setDeleteComment("");
    setDeleteStatus("idle");
    setDeletePrUrl("");
    setDeleteMessage("");
  };

  if (isLoading && deleteStatus !== "loading") {
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
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Template name cannot be changed"
                  sx={{ 
                    '& .MuiInputBase-input.Mui-readOnly': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="App Code"
                  value={formData.appCode}
                  onChange={(e) =>
                    setFormData({ ...formData, appCode: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
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
                      examples: [
                        ...formData.examples,
                        { "User Input": "", "Expected Output": "" },
                      ],
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

      {/* Enhanced Delete Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={
          deleteStatus === "loading" ? undefined : handleCloseDeleteDialog
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {deleteStatus === "idle" ? "Confirm Delete" : "Delete Template"}
        </DialogTitle>
        <DialogContent>
          {deleteStatus === "idle" && (
            <>
              <DialogContentText>
                Are you sure you want to delete this template? This action may
                require approval from a department administrator.
              </DialogContentText>
              <TextField
                fullWidth
                label="Reason for deletion (optional)"
                value={deleteComment}
                onChange={(e) => setDeleteComment(e.target.value)}
                margin="normal"
                multiline
                rows={2}
              />
            </>
          )}

          {deleteStatus === "loading" && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {deleteStatus === "error" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error || "Failed to delete template. Please try again."}
            </Alert>
          )}

          {deleteStatus === "success" && (
            <Alert severity="success">
              {deleteMessage || "Template deleted successfully!"}
            </Alert>
          )}

          {deleteStatus === "pending_approval" && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                {deleteMessage || "Deletion request submitted for approval"}
              </Alert>
              <DialogContentText>
                Your request to delete this template has been submitted and is
                awaiting approval from a department administrator.
              </DialogContentText>
              {deletePrUrl && (
                <Box sx={{ mt: 2 }}>
                  <Link
                    href={deletePrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View pull request
                  </Link>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {deleteStatus === "idle" ? (
            <>
              <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
              <Button onClick={handleDelete} color="error" variant="contained">
                Delete
              </Button>
            </>
          ) : (
            <Button onClick={handleCloseDeleteDialog} color="primary">
              {deleteStatus === "pending_approval" || deleteStatus === "success"
                ? "Close"
                : "Cancel"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UpdateTemplate;
