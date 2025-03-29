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
  List,
  ListItemText,
  Divider,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItem,
  OutlinedInput,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  getVersionHistory,
} from "../services/templateService";
import Header from "../components/Header";
import type { Template, VersionHistory } from "../types";

const UpdateTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Omit<Template, "id">>({
    name: "",
    content: "",
    version: "v1.0",
    departmentCodes: [],
    collection: "",
    lastUsed: "",
    updatedBy: "",
  });
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const departmentOptions = ["3DS", "TKM", "RETAIL", "CORPORATE"];
  const collectionOptions = ["Favorites", "Security", "HR"];

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        const [template, history] = await Promise.all([
          getTemplateById(id!),
          getVersionHistory(id!),
        ]);

        setFormData({
          name: template.name,
          content: template.content,
          version: template.version || "v1.0",
          departmentCodes: template.departmentCodes || [],
          collection: template.collection || "",
          lastUsed: template.lastUsed || "",
          updatedBy: template.updatedBy || "",
        });
        setVersionHistory(history);
      } catch (err) {
        setError("Failed to load template");
        console.error("Error loading template:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (event: any) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      departmentCodes: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const updatedData = {
        id: id!,
        ...formData,
        updatedBy: "Current User", // Replace with actual user from auth context
        lastUsed: new Date().toLocaleString(),
      };

      await updateTemplate(updatedData);
      navigate(`/templates/${id}`);
    } catch (err) {
      setError("Failed to update template");
      console.error("Update error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteTemplate(id!);
      navigate("/");
    } catch (err) {
      setError("Failed to delete template");
      console.error("Delete error:", err);
    } finally {
      setIsLoading(false);
      setOpenDeleteDialog(false);
    }
  };

  if (isLoading && !formData.name) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Update Template
        </Typography>

        {error && (
          <Typography color="error" mb={2}>
            {error}
          </Typography>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Template Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={isLoading}
                />

                <TextField
                  fullWidth
                  label="Template Content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={8}
                  required
                  disabled={isLoading}
                />

                <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                  <InputLabel>Department Codes</InputLabel>
                  <Select
                    multiple
                    value={formData.departmentCodes}
                    onChange={handleDepartmentChange}
                    input={<OutlinedInput label="Department Codes" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {departmentOptions.map((code) => (
                      <MenuItem key={code} value={code}>
                        <Checkbox
                          checked={formData.departmentCodes.includes(code)}
                        />
                        <ListItemText primary={code} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Collection</InputLabel>
                  <Select
                    value={formData.collection}
                    onChange={(e) =>
                      setFormData({ ...formData, collection: e.target.value })
                    }
                    label="Collection"
                  >
                    {collectionOptions.map((collection) => (
                      <MenuItem key={collection} value={collection}>
                        {collection}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box display="flex" justifyContent="space-between" mt={3}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    startIcon={
                      isLoading ? <CircularProgress size={20} /> : null
                    }
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setOpenDeleteDialog(true)}
                    disabled={isLoading}
                  >
                    Delete Template
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              <List sx={{ maxHeight: 300, overflow: "auto" }}>
                {versionHistory.map((version, index) => (
                  <React.Fragment key={version.commitId}>
                    <ListItemText
                      primary={version.message}
                      secondary={`v${version.version} · ${new Date(
                        version.timestamp
                      ).toLocaleString()} by ${version.userDisplayName}`}
                      sx={{ py: 1 }}
                    />
                    {index < versionHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {versionHistory.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No version history available
                  </Typography>
                )}
              </List>
            </Paper>

            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Last used: {formData.lastUsed || "Never"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last updated by: {formData.updatedBy || "Unknown"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current version: {formData.version}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{formData.name}"?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              color="error"
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default UpdateTemplate;
