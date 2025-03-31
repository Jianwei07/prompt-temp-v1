import React, { useState, useEffect } from "react";
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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Switch,
  FormControlLabel,
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
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoIcon from "@mui/icons-material/Info";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const CreateTemplate: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
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
    contentSafety: true,
  });
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [promptQualityScore, setPromptQualityScore] = useState(0);
  const navigate = useNavigate();

  // Template examples for guidance
  const promptExamples = [
    {
      title: "Customer Service Response",
      content:
        "As a customer service representative for [Company], craft a response to the following customer inquiry...",
      instructions:
        "Use empathetic language, address all points in the inquiry, and provide clear next steps.",
    },
    {
      title: "Product Description",
      content:
        "Create a compelling product description for [Product] that highlights its key features and benefits...",
      instructions:
        "Focus on unique selling points, use persuasive language, and include technical specifications.",
    },
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

        templates.forEach((template) => {
          template.departmentCodes?.forEach((code) =>
            uniqueDepartments.add(code)
          );
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

  // Calculate prompt quality score based on content
  useEffect(() => {
    let score = 0;
    // Check for presence of instructions
    if (formData.instructions.length > 50) score += 20;
    // Check for examples
    if (formData.examples.length > 0) score += 20;
    // Check for context in main content
    if (formData.content.length > 100) score += 20;
    // Check for specificity (looking for placeholders or variables)
    if (formData.content.includes("[") && formData.content.includes("]"))
      score += 20;
    // Check for formatting guidance
    if (formData.instructions.toLowerCase().includes("format")) score += 20;

    setPromptQualityScore(score);
  }, [formData]);

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
    setSelectedCollections(
      typeof value === "string" ? value.split(",") : value
    );
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

  const handleUseExample = (example: (typeof promptExamples)[0]) => {
    setFormData((prev) => ({
      ...prev,
      content: example.content,
      instructions: example.instructions,
    }));
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const steps = [
    "Basic Info",
    "Prompt Content",
    "Refinement & Metadata",
    "Review",
  ];

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create Prompt Template
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit}>
          {activeStep === 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Template Basics
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
                placeholder="E.g., Customer Service Email Response, Product Description Generator"
              />

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  A good template name clearly describes what the prompt does
                  and who it's for.
                </Typography>
              </Alert>

              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Template Examples
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Click on an example to use it as a starting point.
                </Typography>

                <Grid container spacing={2}>
                  {promptExamples.map((example, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card
                        variant="outlined"
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleUseExample(example)}
                      >
                        <CardContent>
                          <Typography variant="subtitle1">
                            {example.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {example.content.substring(0, 60)}...
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              </Box>
            </Paper>
          )}

          {activeStep === 1 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Prompt Guidelines
                  <Tooltip title="Effective prompts are specific, provide context, and clearly describe the desired output">
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li>Be specific about the desired output format and tone</li>
                  <li>Include context and relevant background information</li>
                  <li>Use placeholders [like this] for variable content</li>
                  <li>Define constraints (length, style, audience)</li>
                </Box>
                <Divider sx={{ my: 2 }} />
              </Box>

              <Typography variant="subtitle1" gutterBottom>
                Main Prompt Content
                <Tooltip title="This is the core instruction that will be sent to the AI">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <TextField
                fullWidth
                name="content"
                value={formData.content}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={6}
                placeholder="E.g., Create a detailed response to the customer complaint about [ISSUE]. Address their concerns about [SPECIFIC POINTS] and offer a solution that includes [COMPENSATION/RESOLUTION]."
                required
              />

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Additional Instructions
                <Tooltip title="Specific guidance on tone, style, formatting, and constraints">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <TextField
                fullWidth
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={4}
                placeholder="E.g., Use a professional but empathetic tone. Include a greeting and closing. Keep the response under 200 words. Reference company policy where relevant."
              />

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Examples
                <Tooltip title="Show the model examples of desired outputs to improve consistency">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <TextField
                fullWidth
                name="examples"
                value={formData.examples}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={4}
                placeholder="Provide 1-2 examples of the desired output format and style."
              />

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
              >
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              </Box>
            </Paper>
          )}

          {activeStep === 2 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Refinement & Metadata
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Departments
                    <Tooltip title="Departments that will have access to this template">
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Typography>
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
                        <Chip label={option} {...getTagProps({ index })} />
                      ))
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Collections
                    <Tooltip title="Group templates into collections for easier organization">
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Typography>
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
                        <Chip label={option} {...getTagProps({ index })} />
                      ))
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Guardrails & Controls
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={guardrails.enforceCharLimit}
                          onChange={handleGuardrailChange}
                          name="enforceCharLimit"
                        />
                      }
                      label="Enforce Character Limit"
                    />
                    <Tooltip title="Set maximum length for generated content">
                      <IconButton size="small">
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={guardrails.requireKeywords}
                          onChange={handleGuardrailChange}
                          name="requireKeywords"
                        />
                      }
                      label="Require Keywords"
                    />
                    <Tooltip title="Ensure specific terms appear in the output">
                      <IconButton size="small">
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={guardrails.contentSafety}
                          onChange={handleGuardrailChange}
                          name="contentSafety"
                        />
                      }
                      label="Content Safety Filter"
                    />
                    <Tooltip title="Filter inappropriate or unsafe content">
                      <IconButton size="small">
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
              >
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              </Box>
            </Paper>
          )}

          {activeStep === 3 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Review Template
              </Typography>

              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: "background.paper",
                  border: "1px solid #eee",
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="h6">{formData.name}</Typography>

                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mr: 1 }}
                    >
                      Quality Score:
                    </Typography>
                    <Box
                      sx={{
                        bgcolor:
                          promptQualityScore >= 80
                            ? "success.main"
                            : promptQualityScore >= 60
                            ? "warning.main"
                            : "error.main",
                        color: "white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: "inline-block",
                      }}
                    >
                      {promptQualityScore}%
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Main Content
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "#f9f9f9",
                    borderRadius: 1,
                    mb: 2,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {formData.content || (
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      style={{ fontStyle: "italic" }}
                    >
                      No content provided
                    </Typography>
                  )}
                </Box>

                <Typography variant="subtitle1" gutterBottom>
                  Instructions
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "#f9f9f9",
                    borderRadius: 1,
                    mb: 2,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {formData.instructions || (
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      style={{ fontStyle: "italic" }}
                    >
                      No instructions provided
                    </Typography>
                  )}
                </Box>

                <Typography variant="subtitle1" gutterBottom>
                  Examples
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "#f9f9f9",
                    borderRadius: 1,
                    mb: 2,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {formData.examples || (
                    <Typography
                      color="text.secondary"
                      variant="body2"
                      style={{ fontStyle: "italic" }}
                    >
                      No examples provided
                    </Typography>
                  )}
                </Box>

                <Typography variant="subtitle1" gutterBottom>
                  Metadata
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Departments:
                    </Typography>
                    <Box>
                      {departmentCodes.length > 0 ? (
                        departmentCodes.map((dept, i) => (
                          <Chip
                            key={i}
                            label={dept}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))
                      ) : (
                        <Typography
                          variant="body2"
                          style={{ fontStyle: "italic" }}
                        >
                          None selected
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Collections:
                    </Typography>
                    <Box>
                      {selectedCollections.length > 0 ? (
                        selectedCollections.map((coll, i) => (
                          <Chip
                            key={i}
                            label={coll}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))
                      ) : (
                        <Typography
                          variant="body2"
                          style={{ fontStyle: "italic" }}
                        >
                          None selected
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {promptQualityScore < 80 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Improvement suggestions:</strong>
                    {promptQualityScore < 20 &&
                      " Your prompt is very basic. Add more detail and guidance."}
                    {formData.instructions.length < 50 &&
                      " Add more specific instructions about desired output format and style."}
                    {!formData.examples &&
                      " Include at least one example to demonstrate the expected output."}
                    {!formData.content.includes("[") &&
                      " Use placeholders [like this] for variable content to make the template reusable."}
                  </Typography>
                </Alert>
              )}

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
              >
                <Button onClick={handleBack}>Back</Button>
                <Button type="submit" variant="contained" color="primary">
                  Save Template
                </Button>
              </Box>
            </Paper>
          )}
        </form>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Prompt Engineering Best Practices
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Be specific and clear</strong> - Clearly state the
                    task, desired format, and any constraints.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Provide context</strong> - Include relevant
                    background information to guide the AI.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Use examples</strong> - Show don't tell. Examples
                    help the AI understand the expected output format.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Iterate and refine</strong> - Test your prompts and
                    refine them based on the outputs.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>Break complex tasks into steps</strong> - For
                    complex outputs, guide the AI through a step-by-step
                    process.
                  </Typography>
                </li>
              </Box>
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

            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Active Users
              </Typography>
              <Box>
                {users.map((user, index) => (
                  <UserListItem
                    key={index}
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
