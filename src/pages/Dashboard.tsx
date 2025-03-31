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
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
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
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import HistoryIcon from "@mui/icons-material/History";
import CategoryIcon from "@mui/icons-material/Category";

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [showAllTemplates, setShowAllTemplates] = useState<boolean>(false);

  const getUniqueDepartments = () => {
    const departments = new Set<string>();
    templates.forEach((template) => {
      template.departmentCodes?.forEach((code) => {
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

  const displayTemplates = showAllTemplates
    ? filteredTemplates
    : filteredTemplates.slice(0, 3);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: alpha(theme.palette.primary.light, 0.05),
      }}
    >
      <Header />
      <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
        {/* Welcome Section */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            background: `linear-gradient(45deg, ${alpha(
              theme.palette.primary.main,
              0.8
            )}, ${alpha(theme.palette.primary.dark, 0.9)})`,
            color: "white",
          }}
        >
          <Typography variant="h4" gutterBottom>
            Prompt Library Dashboard
          </Typography>
          <Typography variant="body1">
            Access and manage your templates and collections from a single
            place.
          </Typography>
          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              component={Link}
              to="/create-template"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: "white",
                color: theme.palette.primary.dark,
                "&:hover": {
                  bgcolor: alpha(theme.palette.common.white, 0.9),
                },
              }}
            >
              Create New Template
            </Button>
            <Button
              variant="outlined"
              component={Link}
              to="/collections/manage"
              sx={{
                borderColor: "white",
                color: "white",
                "&:hover": {
                  borderColor: alpha(theme.palette.common.white, 0.9),
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                },
              }}
            >
              Manage Collections
            </Button>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Main Content Column */}
          <Grid item xs={12} md={8}>
            {/* Templates Section */}
            <Paper
              elevation={1}
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CategoryIcon
                    sx={{ mr: 1, color: theme.palette.primary.main }}
                  />
                  <Typography variant="h6">Available Templates</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Tooltip title="Filter templates">
                    <IconButton onClick={() => {}}>
                      <FilterListIcon />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    component={Link}
                    to="/create-template"
                    size="small"
                    startIcon={<AddIcon />}
                  >
                    New Template
                  </Button>
                </Box>
              </Box>

              {/* Department Filter chips */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: theme.palette.text.secondary }}
                >
                  Filter by Department
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label="All"
                    onClick={() => setSelectedDepartment("")}
                    color={!selectedDepartment ? "primary" : "default"}
                    size="small"
                    variant={!selectedDepartment ? "filled" : "outlined"}
                  />
                  {getUniqueDepartments().map((department) => (
                    <Chip
                      key={department}
                      label={department}
                      onClick={() => setSelectedDepartment(department)}
                      color={
                        selectedDepartment === department
                          ? "primary"
                          : "default"
                      }
                      size="small"
                      variant={
                        selectedDepartment === department
                          ? "filled"
                          : "outlined"
                      }
                    />
                  ))}
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Templates Grid */}
              {displayTemplates.length > 0 ? (
                <>
                  <Grid container spacing={2}>
                    {displayTemplates.map((template) => (
                      <Grid item xs={12} sm={6} key={template.id}>
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            transition: "all 0.3s ease",
                            "&:hover": {
                              borderColor: theme.palette.primary.main,
                              boxShadow: `0 4px 8px ${alpha(
                                theme.palette.primary.main,
                                0.15
                              )}`,
                            },
                          }}
                        >
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                              }}
                            >
                              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                {template.name}
                              </Typography>
                              <IconButton size="small">
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <Typography
                              color="text.secondary"
                              variant="body2"
                              sx={{ mb: 1 }}
                            >
                              {template.collection}
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                              {template.departmentCodes?.map((code) => (
                                <Chip
                                  key={code}
                                  label={code}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                bgcolor: alpha(
                                  theme.palette.background.default,
                                  0.7
                                ),
                                borderRadius: 1,
                                maxHeight: "80px",
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.8rem",
                                  color: theme.palette.text.secondary,
                                }}
                              >
                                {template.content.substring(0, 100)}...
                              </Typography>
                              <Box
                                sx={{
                                  position: "absolute",
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: "20px",
                                  background: `linear-gradient(transparent, ${alpha(
                                    theme.palette.background.default,
                                    0.7
                                  )})`,
                                }}
                              />
                            </Box>
                          </CardContent>
                          <CardActions sx={{ justifyContent: "space-between" }}>
                            <Box>
                              <Button
                                size="small"
                                component={Link}
                                to={`/edit-template/${template.id}`}
                                sx={{ mr: 1 }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                component={Link}
                                to={`/view-template/${template.id}`}
                              >
                                View
                              </Button>
                            </Box>
                            <IconButton size="small">
                              <BookmarkIcon fontSize="small" />
                            </IconButton>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {filteredTemplates.length > 3 && (
                    <Box sx={{ textAlign: "center", mt: 3 }}>
                      <Button
                        onClick={() => setShowAllTemplates(!showAllTemplates)}
                        sx={{ textTransform: "none" }}
                      >
                        {showAllTemplates
                          ? "Show Less"
                          : `Show All (${filteredTemplates.length})`}
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="text.secondary">
                    No templates found. Create your first template!
                  </Typography>
                  <Button
                    variant="contained"
                    component={Link}
                    to="/create-template"
                    sx={{ mt: 2 }}
                    startIcon={<AddIcon />}
                  >
                    Create Template
                  </Button>
                </Box>
              )}
            </Paper>

            {/* Recent Activity Section */}
            <Paper
              elevation={1}
              sx={{
                p: 3,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <HistoryIcon
                    sx={{ mr: 1, color: theme.palette.primary.main }}
                  />
                  <Typography variant="h6">Recent Activity</Typography>
                </Box>
                <Button size="small" component={Link} to="/activity">
                  View All
                </Button>
              </Box>

              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <ActivityItem
                    key={`${activity.user}-${activity.timestamp}`}
                    activity={activity}
                    lastItem={index === activities.length - 1}
                  />
                ))
              ) : (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography color="text.secondary">
                    No recent activities found
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Sidebar Column */}
          <Grid item xs={12} md={4}>
            {/* Collections Section */}
            <Paper
              elevation={1}
              sx={{
                p: 3,
                borderRadius: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <BookmarkIcon
                    sx={{ mr: 1, color: theme.palette.primary.main }}
                  />
                  <Typography variant="h6">Your Collections</Typography>
                </Box>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/create-collection"
                  size="small"
                  startIcon={<AddIcon />}
                >
                  New
                </Button>
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                {collections.length > 0 ? (
                  <Grid container spacing={2}>
                    {collections.map((collection) => (
                      <Grid item xs={12} key={collection.name}>
                        <Button
                          component={Link}
                          to={`/collections/${collection.name}`}
                          sx={{
                            textTransform: "none",
                            width: "100%",
                            justifyContent: "flex-start",
                            p: 0,
                          }}
                        >
                          <CollectionCard collection={collection} />
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">
                      No collections found
                    </Typography>
                    <Button
                      variant="contained"
                      component={Link}
                      to="/create-collection"
                      sx={{ mt: 2 }}
                      startIcon={<AddIcon />}
                    >
                      Create Collection
                    </Button>
                  </Box>
                )}
              </Box>

              {collections.length > 0 && (
                <Button
                  component={Link}
                  to="/collections"
                  sx={{ alignSelf: "center", mt: 2 }}
                >
                  View All Collections
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
