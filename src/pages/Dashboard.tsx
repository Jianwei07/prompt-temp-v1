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
  IconButton,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import {
  getRecentActivities,
  getTemplates,
} from "../services/templateService";
import ActivityItem from "../components/ActivityItem";
import Header from "../components/Header";
import type { Activity, Template } from "../types";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import TemplateCard from "../components/TemplateCard";

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedAppCode, setSelectedAppCode] = useState<string>("");
  const [showAllTemplates, setShowAllTemplates] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [templatesRes, activitiesRes] = await Promise.all([
          getTemplates(),
          getRecentActivities(),
        ]);
        
        // Ensure activities is an array
        const activitiesArray = Array.isArray(activitiesRes) ? activitiesRes : [];
        
        setTemplates(templatesRes);
        setActivities(activitiesArray);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
        setActivities([]); // Ensure activities is an empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Get unique app codes for filtering
  const getUniqueAppCodes = () => {
    const appCodes = new Set<string>();
    templates.forEach((template) => {
      if (template.appCode) {
        appCodes.add(template.appCode);
      }
    });
    return Array.from(appCodes);
  };

  // Filter templates by app code
  const filteredTemplates = selectedAppCode
    ? templates.filter((template) => template.appCode === selectedAppCode)
    : templates;

  const displayTemplates = showAllTemplates
    ? filteredTemplates
    : filteredTemplates.slice(0, 6);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Grid container spacing={3}>
          {/* Templates Section */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h5">Templates</Typography>
                <Box>
                  <Button
                    component={Link}
                    to="/create-template"
                    startIcon={<AddIcon />}
                    variant="contained"
                    sx={{ mr: 1 }}
                  >
                    Create Template
                  </Button>
                  <IconButton>
                    <FilterListIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* App Code filters */}
              <Box sx={{ mb: 3, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {getUniqueAppCodes().map((code) => (
                  <Chip
                    key={code}
                    label={code}
                    onClick={() =>
                      setSelectedAppCode(selectedAppCode === code ? "" : code)
                    }
                    color={selectedAppCode === code ? "primary" : "default"}
                  />
                ))}
              </Box>

              {/* Templates grid */}
              <Grid container spacing={2}>
                {displayTemplates.map((template) => (
                  <Grid item xs={12} sm={6} key={template.id}>
                    <TemplateCard template={template} />
                  </Grid>
                ))}
              </Grid>

              {filteredTemplates.length > 6 && !showAllTemplates && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Button onClick={() => setShowAllTemplates(true)}>
                    Show All Templates
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Activity Section */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                Recent Activity
              </Typography>
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))
              ) : (
                <Typography color="text.secondary">No recent activity</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
