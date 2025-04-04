import React, { useState, useEffect } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  createTemplate,
  getBitbucketStructure,
} from "../services/templateService";
import Header from "../components/Header";
import type { CreateTemplateData } from "../types";

const steps = ["Basic Info", "Content", "Examples"];

const CreateTemplate: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isStructureLoading, setIsStructureLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [appCodes, setAppCodes] = useState<
    Array<{ department: string; appCode: string }>
  >([]);
  const [filteredAppCodes, setFilteredAppCodes] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState({
    name: false,
    department: false,
    appCode: false,
  });

  const [formData, setFormData] = useState<CreateTemplateData>({
    name: "",
    department: "",
    appCode: "",
    content: "",
    instructions: "",
    examples: [{ "User Input": "", "Expected Output": "" }],
  });

  // Fetch departments and app codes from Bitbucket when component mounts
  useEffect(() => {
    const fetchStructure = async () => {
      try {
        setIsStructureLoading(true);
        setError("");
        console.log("Starting to fetch structure...");

        const data = await getBitbucketStructure();
        console.log("Received structure data:", data);

        if (data.departments.length === 0) {
          console.warn("No departments received");
          setError("No departments found in the repository");
        }

        setDepartments(data.departments);
        setAppCodes(data.appCodes);
      } catch (err) {
        console.error("Error fetching structure:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch repository structure"
        );
        setDepartments([]);
        setAppCodes([]);
      } finally {
        setIsStructureLoading(false);
      }
    };

    fetchStructure();
  }, []);

  // Filter app codes based on selected department
  useEffect(() => {
    console.log("Filtering app codes for department:", formData.department);
    console.log("Available app codes:", appCodes);

    if (formData.department) {
      const filtered = appCodes
        .filter((item) => item.department === formData.department)
        .map((item) => item.appCode);

      console.log("Filtered app codes:", filtered);
      setFilteredAppCodes(filtered);

      // Reset app code if the current one isn't valid for the selected department
      if (!filtered.includes(formData.appCode)) {
        setFormData((prev) => ({ ...prev, appCode: "" }));
      }
    } else {
      setFilteredAppCodes([]);
    }
  }, [formData.department, appCodes]);

  const validateForm = () => {
    const errors = {
      name: !formData.name.trim(),
      department: !formData.department,
      appCode: !formData.appCode,
    };

    setFormErrors(errors);
    return !Object.values(errors).some((isError) => isError);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      await createTemplate(formData);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create template"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateForm()) {
      setError("Please fill in all required fields.");
      return;
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (e.target.value.trim()) {
                    setFormErrors((prev) => ({ ...prev, name: false }));
                  }
                }}
                required
                error={formErrors.name}
                helperText={formErrors.name ? "Template name is required" : ""}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={formErrors.department}>
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  value={formData.department}
                  label="Department"
                  onChange={(e) => {
                    console.log("Selected department:", e.target.value);
                    setFormData({ ...formData, department: e.target.value });
                    setFormErrors((prev) => ({ ...prev, department: false }));
                  }}
                  disabled={isStructureLoading}
                >
                  {isStructureLoading ? (
                    <MenuItem value="">Loading...</MenuItem>
                  ) : departments.length === 0 ? (
                    <MenuItem value="">No departments available</MenuItem>
                  ) : (
                    departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {formErrors.department && (
                  <FormHelperText>Department is required</FormHelperText>
                )}
                {departments.length === 0 && !isStructureLoading && (
                  <FormHelperText error>No departments found</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={formErrors.appCode}>
                <InputLabel id="app-code-label">App Code</InputLabel>
                <Select
                  labelId="app-code-label"
                  value={formData.appCode}
                  label="App Code"
                  onChange={(e) => {
                    console.log("Selected app code:", e.target.value);
                    setFormData({ ...formData, appCode: e.target.value });
                    setFormErrors((prev) => ({ ...prev, appCode: false }));
                  }}
                  disabled={isStructureLoading || !formData.department}
                >
                  {isStructureLoading ? (
                    <MenuItem value="">Loading...</MenuItem>
                  ) : !formData.department ? (
                    <MenuItem value="">Select Department first</MenuItem>
                  ) : filteredAppCodes.length === 0 ? (
                    <MenuItem value="">No App Codes available</MenuItem>
                  ) : (
                    filteredAppCodes.map((code) => (
                      <MenuItem key={code} value={code}>
                        {code}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {formErrors.appCode && (
                  <FormHelperText>App Code is required</FormHelperText>
                )}
                {formData.department &&
                  filteredAppCodes.length === 0 &&
                  !isStructureLoading && (
                    <FormHelperText error>
                      No app codes found for this department
                    </FormHelperText>
                  )}
              </FormControl>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content"
                multiline
                rows={6}
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
                rows={4}
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box>
            {formData.examples.map((example, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Example {index + 1}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="User Input"
                      value={example["User Input"]}
                      onChange={(e) => {
                        const newExamples = [...formData.examples];
                        newExamples[index]["User Input"] = e.target.value;
                        setFormData({ ...formData, examples: newExamples });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
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
                  </Grid>
                </Grid>
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
              Add Another Example
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

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

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Create New Template
          </Typography>
          {error && (
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
          )}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <form onSubmit={handleSubmit}>
            {getStepContent(activeStep)}
            <Box
              sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}
            >
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Back
              </Button>
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button type="submit" variant="contained">
                    Create Template
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleNext}>
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </Paper>
      </Container>
    </>
  );
};

export default CreateTemplate;
