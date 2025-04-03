import React, { useState } from "react";
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { createTemplate } from "../services/templateService";
import Header from "../components/Header";
import type { CreateTemplateData } from "../types";

const steps = ["Basic Info", "Content", "Examples"];

const CreateTemplate: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: "",
    department: "",
    appCode: "",
    content: "",
    instructions: "",
    examples: [{ "User Input": "", "Expected Output": "" }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createTemplate(formData);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
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
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
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
                  examples: [...formData.examples, { "User Input": "", "Expected Output": "" }],
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
            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
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
