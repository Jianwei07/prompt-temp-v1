import React, { useState,useEffect } from "react";
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
  Autocomplete,
} from "@mui/material";
import {
  createTemplate,
  getCollections,
  getTemplateById,
  getUsers,
  getTemplates,
} from "../services/templateService";
import { useNavigate } from "react-router-dom";
import CollectionCard from "../components/CollectionCard";
import UserListItem from "../components/UserListItem";
import Header from "../components/Header";
import { Collection, User } from "@/types";
import AddIcon from "@mui/icons-material/Add";

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
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<string[]>([]);
  const [guardrails, setGuardrails] = useState({
    enforceCharLimit: false,
    requireKeywords: false,
    contentSafety: false,
  });
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const navigate = useNavigate();

  const guardrailOptions = [
    "Enforce character limit",
    "Require specific keywords",
    "Content safety filters",
  ];

  useEffect(() => {
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

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const templates = await getTemplates();
        const uniqueDepartments = new Set<string>();
        const uniqueCollections = new Set<string>();

        templates.forEach(template => {
          template.departmentCodes?.forEach(code => uniqueDepartments.add(code));
          if (template.collection) {
            uniqueCollections.add(template.collection);
          }
        });

        setDepartmentOptions(Array.from(uniqueDepartments));
        setCollectionOptions(Array.from(uniqueCollections));
      } catch (error) {
        console.error("Failed to load options:", error);
      }
    };

    loadOptions();
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

  const handleCollectionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedCollections(typeof value === "string" ? value.split(",") : value);
  };

  const handleAddNewDepartment = () => {
    if (newDepartment.trim() !== "") {
      setDepartmentCodes(prev => [...prev, newDepartment]);
      setNewDepartment("");
    }
  };

  const handleAddNewCollection = () => {
    if (newCollection.trim() !== "") {
      setSelectedCollections(prev => [...prev, newCollection]);
      setNewCollection("");
    }
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

                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Autocomplete
                        multiple
                        freeSolo
                        options={departmentOptions}
                        value={departmentCodes}
                        onChange={(event, newValue) => {
                          setDepartmentCodes(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Department Codes"
                            placeholder="Type or select"
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              {...getTagProps({ index })}
                            />
                          ))
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Autocomplete
                        multiple
                        freeSolo
                        options={collectionOptions}
                        value={selectedCollections}
                        onChange={(event, newValue) => {
                          setSelectedCollections(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Collections"
                            placeholder="Type or select"
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              {...getTagProps({ index })}
                            />
                          ))
                        }
                      />
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
                Version History [integrate from Bitbucket]
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
