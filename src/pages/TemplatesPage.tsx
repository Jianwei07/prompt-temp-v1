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
  const [searchParams, setSearchParams] = useSearchParams();

  const getUniqueDepartments = () => {
    const departments = new Set<string>();
    templates.forEach(template => {
      template.departmentCodes?.forEach(code => {
        departments.add(code);
      });
    });
    return Array.from(departments);
  };

  const getUniqueCollections = () => {
    const collections = new Set<string>();
    templates.forEach(template => {
      if (template.collection) {
        collections.add(template.collection);
      }
    });
    return Array.from(collections);
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

  // Get collection from URL query parameter
  const collectionParam = searchParams.get('collection');

  // Handle department selection
  const handleDepartmentSelect = (department: string) => {
    setSelectedDepartment(department);
    // Clear collection filter when department is selected
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('collection');
    setSearchParams(newSearchParams);
  };

  // Handle collection selection
  const handleCollectionSelect = (collection: string | null) => {
    // Clear department filter when collection is selected
    setSelectedDepartment("");
    if (collection) {
      setSearchParams({ collection });
    } else {
      // Clear collection filter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('collection');
      setSearchParams(newSearchParams);
    }
  };

  // Filter templates based on either department or collection
  const filteredTemplates = collectionParam
    ? templates.filter(template => template.collection === collectionParam)
    : selectedDepartment
    ? templates.filter(template => 
        template.departmentCodes?.includes(selectedDepartment)
      )
    : templates;

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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4">
            {collectionParam ? `${collectionParam} Templates` : 'All Templates'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {filteredTemplates.length} templates available
          </Typography>
        </Box>

        {/* Collections Filter */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 1 }}>
            Collections
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
            <Chip
              label="All Collections"
              onClick={() => handleCollectionSelect(null)}
              color={!collectionParam ? "primary" : "default"}
              disabled={!!selectedDepartment}
            />
            {getUniqueCollections().map((collection) => (
              <Chip
                key={collection}
                label={collection}
                onClick={() => handleCollectionSelect(collection)}
                color={collectionParam === collection ? "primary" : "default"}
                disabled={!!selectedDepartment}
              />
            ))}
          </Box>
        </Box>

        {/* Department Filter */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 1 }}>
            Filter by Department
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label="All"
              onClick={() => handleDepartmentSelect("")}
              color={!selectedDepartment ? "primary" : "default"}
              disabled={!!collectionParam}
            />
            {getUniqueDepartments().map((department) => (
              <Chip
                key={department}
                label={department}
                onClick={() => handleDepartmentSelect(department)}
                color={selectedDepartment === department ? "primary" : "default"}
                disabled={!!collectionParam}
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