import React, { useEffect, useState } from "react";
import {
  Grid,
  Typography,
  Button,
  Container,
  Box,
  Paper,
  Card,
  CardContent,
  CardActions,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import {
  getCollections,
  getRecentActivities,
  getTemplates,
} from "../services/templateService";
import CollectionCard from "../components/CollectionCard";
import ActivityItem from "../components/ActivityItem";
import Header from "../components/Header";
import type { Collection, Activity, Template } from "../types";

const Dashboard: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const getUniqueDepartments = () => {
    const departments = new Set<string>();
    templates.forEach(template => {
      template.departmentCodes?.forEach(code => {
        departments.add(code);
      });
    });
    return Array.from(departments);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [collectionsRes, activitiesRes, templatesRes] = await Promise.all(
          [getCollections(), getRecentActivities(), getTemplates()]
        );
        setCollections(collectionsRes);
        setActivities(activitiesRes);
        setTemplates(templatesRes);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    };
    loadData();
  }, []);

  // Filter templates by department if selected
  const filteredTemplates = selectedDepartment
    ? templates.filter((template) =>
        template.departmentCodes?.includes(selectedDepartment)
      )
    : templates;

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Update Department Filter section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Filter by Department
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label="All"
              onClick={() => setSelectedDepartment("")}
              color={!selectedDepartment ? "primary" : "default"}
            />
            {getUniqueDepartments().map((department) => (
              <Chip
                key={department}
                label={department}
                onClick={() => setSelectedDepartment(department)}
                color={selectedDepartment === department ? "primary" : "default"}
              />
            ))}
          </Box>
        </Box>

        {/* Templates Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Available Templates
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to="/create-template"
              size="medium"
            >
              Create New Template
            </Button>
          </Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {filteredTemplates.slice(0, 3).map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{template.name}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      {template.collection}
                    </Typography>
                    {template.departmentCodes?.map((code) => (
                      <Chip
                        key={code}
                        label={code}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {template.content.substring(0, 100)}...
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      component={Link}
                      to={`/edit-template/${template.id}`}
                    >
                      Edit
                    </Button>
                    <Button size="small">View</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Button
            component={Link}
            to="/templates"
            variant="outlined"
            sx={{ mt: 1 }}
          >
            View All Templates
          </Button>
        </Box>

        {/* Collections Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            Your Collections
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 6 }}>
          {collections.map((collection) => (
            <Grid item xs={12} sm={6} md={4} key={collection.name}>
              <CollectionCard
                collection={collection}
                onClick={() => console.log("Selected:", collection.name)}
              />
            </Grid>
          ))}
        </Grid>

        {/* Recent Activity Section */}
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          Recent Activity
        </Typography>
        <Paper elevation={2} sx={{ p: 3 }}>
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <ActivityItem
                key={`${activity.user}-${activity.timestamp}`}
                activity={activity}
                lastItem={index === activities.length - 1}
              />
            ))
          ) : (
            <Typography color="text.secondary">
              No recent activities found
            </Typography>
          )}
        </Paper>
      </Container>
    </>
  );
};

export default Dashboard;
