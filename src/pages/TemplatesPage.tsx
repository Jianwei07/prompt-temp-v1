import React, { useEffect, useState } from "react";
import { Container, Grid, Typography, Box, Chip } from "@mui/material";
import { getTemplates } from "../services/templateService";
import TemplateCard from "../components/TemplateCard";
import Header from "../components/Header";
import { Template } from "../types";
import { useSearchParams } from "react-router-dom";

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const getUniqueDepartments = () => {
    const departments = new Set<string>();
    templates.forEach(template => {
      if (template.department) {
        departments.add(template.department);
      }
    });
    return Array.from(departments);
  };

  const getUniqueAppCodes = () => {
    const appCodes = new Set<string>();
    templates.forEach(template => {
      if (template.appCode) {
        appCodes.add(template.appCode);
      }
    });
    return Array.from(appCodes);
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

  // Handle department selection
  const handleDepartmentSelect = (department: string) => {
    setSelectedDepartment(department);
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (selectedDepartment && template.department !== selectedDepartment) {
      return false;
    }
    return true;
  });

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
              <TemplateCard template={template} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
};

export default TemplatesPage; 