import React, { useState } from "react";
import {
  Container,
  Grid,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
} from "@mui/material";
import {
  createTemplate,
  getCollections,
  getUsers,
} from "../services/templateService";
import { useNavigate } from "react-router-dom";
import CollectionCard from "../components/CollectionCard";
import UserListItem from "../components/UserListItem";
import Header from "../components/Header";
import { Collection, User } from "@/types";

const CreateTemplate: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    context: "",
    instructions: "",
    examples: "",
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [departmentCodes, setDepartmentCodes] = useState<string[]>([]);
  const [guardrails, setGuardrails] = useState({
    enforceCharLimit: false,
    requireKeywords: false,
    contentSafety: false,
  });
  const navigate = useNavigate();

  const departmentOptions = ["3DS", "TKM", "RETAIL", "CORPORATE"];
  const guardrailOptions = [
    "Enforce character limit",
    "Require specific keywords",
    "Content safety filters",
  ];

  React.useEffect(() => {
    const loadData = async () => {
      const [collectionsData, usersData] = await Promise.all([
        getCollections(),
        getUsers(),
      ]);
      setCollections(collectionsData);
      setUsers(usersData);
    };
    loadData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setDepartmentCodes(typeof value === "string" ? value.split(",") : value);
  };

  const handleGuardrailChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setGuardrails({
      ...guardrails,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTemplate({
        ...formData,
        departmentCodes,
      });
      navigate("/");
    } catch (err) {
      setError("Failed to create template. Please try again.");
      console.error(err);
    }
  };

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          New Prompt Template
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Prompt Guidelines
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Be specific and clear about the desired output format</li>
            <li>Include context and relevant background information</li>
            <li>Define any constraints or limitations</li>
          </Box>
          <Divider sx={{ my: 2 }} />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <form onSubmit={handleSubmit}>
                <Typography variant="h6" gutterBottom>
                  Prompt Structure
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  Context
                </Typography>
                <TextField
                  fullWidth
                  name="context"
                  value={formData.context}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={3}
                  placeholder="Set the context and background information..."
                />

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Instructions
                </Typography>
                <TextField
                  fullWidth
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={4}
                  placeholder="Provide clear, step-by-step instructions..."
                />

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Examples
                </Typography>
                <TextField
                  fullWidth
                  name="examples"
                  value={formData.examples}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={3}
                  placeholder="Include examples of desired output..."
                />

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Template Name
                </Typography>
                <TextField
                  fullWidth
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  margin="normal"
                  required
                />

                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Department Codes</InputLabel>
                        <Select
                          multiple
                          value={departmentCodes}
                          onChange={handleDepartmentChange}
                          input={<OutlinedInput label="Department Codes" />}
                          renderValue={(selected) => (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                        >
                          {departmentOptions.map((code) => (
                            <MenuItem key={code} value={code}>
                              <Checkbox
                                checked={departmentCodes.indexOf(code) > -1}
                              />
                              <ListItemText primary={code} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>

                {error && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                  </Typography>
                )}

                <Box
                  sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Button variant="outlined" color="error">
                    Discard Changes
                  </Button>
                  <Button type="submit" variant="contained">
                    Save & Check In
                  </Button>
                </Box>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Team Collections
              </Typography>
              <Grid container spacing={2}>
                {collections.map((collection) => (
                  <Grid item xs={12} key={collection.name}>
                    <CollectionCard collection={collection} />
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              <Box>
                <Typography variant="subtitle2">Current Version</Typography>
                <Typography variant="body2" color="text.secondary">
                  Checked out by John Doe
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Today at 2:30 PM
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2">Version 1.0</Typography>
                <Typography variant="body2" color="text.secondary">
                  Created by Jane Smith
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Yesterday at 4:15 PM
                </Typography>
              </Box>
            </Paper>

            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Active Users
              </Typography>
              <Box>
                {users.map((user, index) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    lastItem={index === users.length - 1}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default CreateTemplate;
