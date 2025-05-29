import { Box, Chip, Container, Grid, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import TemplateCard from "src/components/TemplateCard";
import Header from "../components/Header";
import { getTemplates } from "../services/templateService";
import { Template } from "../types";

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Added renderCount state to force re-render if needed
  const [renderCount, setRenderCount] = useState(0);

  // Centralized delete handler
  const handleDelete = (id: string) => {
    console.log("Removing template from list:", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setRenderCount((c) => c + 1); // optional: triggers re-render explicitly
  };

  const getUniqueDepartments = () => {
    const departments = new Set<string>();
    templates.forEach((template) => {
      if (template.department) {
        departments.add(template.department);
      }
    });
    return Array.from(departments);
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await getTemplates();
        setTemplates(data);
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const handleDepartmentSelect = (department: string) => {
    setSelectedDepartment(department);
  };

  const filteredTemplates = templates.filter((template) => {
    if (selectedDepartment && template.department !== selectedDepartment) {
      return false;
    }
    return true;
  });

  // Logs to debug rendering & template counts
  console.log("TemplatesPage render, templates count:", templates.length);
  console.log("Filtered templates count:", filteredTemplates.length);
  console.log("Render count:", renderCount);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <Typography variant="h6">Loading templates...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Templates
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter by Department
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {getUniqueDepartments().map((dept) => (
              <Chip
                key={dept}
                label={dept}
                onClick={() => handleDepartmentSelect(dept)}
                color={selectedDepartment === dept ? "primary" : "default"}
              />
            ))}
          </Box>
        </Box>
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <TemplateCard
                template={template}
                onDelete={() => handleDelete(template.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
};

export default TemplatesPage;
