import React, { useEffect, useState, Suspense } from "react";
import {
  Grid,
  Typography,
  Button,
  Container,
  Box,
  Paper,
  IconButton,
  Breadcrumbs,
  Card,
  CardContent,
  Divider,
  Chip,
  List,
  Tooltip,
  Skeleton,
  Alert,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getRecentActivities, getTemplates } from "../services/templateService";
import ActivityItem from "../components/ActivityItem";
import Header from "../components/Header";
import type { Activity, Template } from "../types";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SearchIcon from "@mui/icons-material/Search";

const LazyTemplateCard = React.lazy(() => import("../components/TemplateCard"));

const departmentDescriptions: Record<string, string> = {
  "Architecture & Engineering":
    "Templates for architecture and engineering processes and documentation.",
  CardsTechnology:
    "Card technology templates for payment processing and related systems.",
};

const TemplateCardSkeleton = () => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent>
      <Skeleton variant="rectangular" height={30} width="60%" sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={20} width="90%" />
      <Box sx={{ mt: 2 }}>
        <Skeleton variant="rectangular" height={20} width="40%" />
      </Box>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
        <Skeleton variant="rectangular" height={24} width={80} />
        <Skeleton variant="circular" width={30} height={30} />
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedAppCode, setSelectedAppCode] = useState<string>("");
  const [showAllTemplates, setShowAllTemplates] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilterOptions, setShowFilterOptions] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    const state = location.state as {
      department?: string;
      appCode?: string;
    } | null;
    if (state) {
      if (state.department) setSelectedDepartment(state.department);
      if (state.appCode) setSelectedAppCode(state.appCode);
    }
  }, [location]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [templatesRes, activitiesRes] = await Promise.all([
          getTemplates(),
          getRecentActivities(),
        ]);
        setTemplates(templatesRes || []);
        setActivities(Array.isArray(activitiesRes) ? activitiesRes : []);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again later.");
        setActivities([]);
      } finally {
        setTimeout(() => setIsLoading(false), 300);
      }
    };
    loadData();
  }, []);

  const getUniqueDepartments = () => {
    const departments = new Set<string>();
    templates.forEach((template) => {
      if (template.department) departments.add(template.department);
    });
    return Array.from(departments);
  };

  const getAppCodesForDepartment = (department: string) => {
    const appCodes = new Set<string>();
    templates.forEach((template) => {
      if (template.department === department && template.appCode)
        appCodes.add(template.appCode);
    });
    return Array.from(appCodes);
  };

  const getRecentTemplates = () =>
    [...templates]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 4);

  const handleDepartmentClick = (dept: string) => {
    setSelectedDepartment(dept);
    setSelectedAppCode("");
    navigate("", { state: { department: dept, appCode: "" }, replace: false });
  };

  const handleAppCodeClick = (appCode: string) => {
    setSelectedAppCode(appCode);
    navigate("", {
      state: { department: selectedDepartment, appCode: appCode },
      replace: false,
    });
  };

  const handleReset = () => {
    setSelectedDepartment("");
    setSelectedAppCode("");
    navigate("", {
      state: { department: "", appCode: "" },
      replace: false,
    });
  };

  const filteredTemplates = templates.filter((template) => {
    if (selectedDepartment && template.department !== selectedDepartment)
      return false;
    if (selectedAppCode && template.appCode !== selectedAppCode) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        (template.instructions &&
          template.instructions.toLowerCase().includes(query)) ||
        (template.department &&
          template.department.toLowerCase().includes(query)) ||
        (template.appCode && template.appCode.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const displayTemplates = showAllTemplates
    ? filteredTemplates
    : filteredTemplates.slice(0, 6);

  // --- Loading state skeleton ---
  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, boxShadow: 2 }}>
                <Box
                  sx={{
                    mb: 3,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Skeleton variant="rectangular" height={32} width="40%" />
                  <Box>
                    <Skeleton
                      variant="rectangular"
                      height={36}
                      width={150}
                      sx={{ display: "inline-block" }}
                    />
                    <Skeleton
                      variant="circular"
                      height={36}
                      width={36}
                      sx={{ display: "inline-block", ml: 1 }}
                    />
                  </Box>
                </Box>
                <Grid container spacing={3}>
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item}>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <CardContent sx={{ textAlign: "center", py: 3 }}>
                          <Skeleton
                            variant="circular"
                            width={60}
                            height={60}
                            sx={{ mx: "auto", mb: 1 }}
                          />
                          <Skeleton
                            variant="rectangular"
                            height={24}
                            width="60%"
                            sx={{ mx: "auto", mb: 1 }}
                          />
                          <Skeleton
                            variant="rectangular"
                            height={16}
                            width="80%"
                            sx={{ mx: "auto", mb: 2 }}
                          />
                          <Skeleton
                            variant="rectangular"
                            height={24}
                            width={100}
                            sx={{ mx: "auto" }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3, boxShadow: 2 }}>
                <Skeleton
                  variant="rectangular"
                  height={32}
                  width="60%"
                  sx={{ mb: 3 }}
                />
                {[1, 2, 3, 4].map((item) => (
                  <Box key={item} sx={{ mb: 2 }}>
                    <TemplateCardSkeleton />
                  </Box>
                ))}
              </Paper>
              <Paper sx={{ p: 3, boxShadow: 2 }}>
                <Skeleton
                  variant="rectangular"
                  height={32}
                  width="60%"
                  sx={{ mb: 3 }}
                />
                {[1, 2, 3].map((item) => (
                  <Box key={item} sx={{ mb: 2 }}>
                    <Skeleton
                      variant="rectangular"
                      height={16}
                      width="30%"
                      sx={{ mb: 1 }}
                    />
                    <Skeleton variant="rectangular" height={16} width="90%" />
                    <Divider sx={{ my: 2 }} />
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  // --- Render breadcrumb navigation ---
  const renderBreadcrumbs = () => {
    if (!selectedDepartment) return null;
    return (
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
          <Button
            startIcon={<HomeIcon />}
            onClick={handleReset}
            color="primary"
            size="small"
            sx={{ textTransform: "none" }}
          >
            Home
          </Button>
          {selectedDepartment && !selectedAppCode ? (
            <Typography color="text.primary">{selectedDepartment}</Typography>
          ) : (
            <Button
              onClick={() => setSelectedAppCode("")}
              color="primary"
              size="small"
              sx={{ textTransform: "none" }}
            >
              {selectedDepartment}
            </Button>
          )}
          {selectedAppCode && (
            <Typography color="text.primary">{selectedAppCode}</Typography>
          )}
        </Breadcrumbs>
      </Box>
    );
  };

  // --- Content logic ---
  const renderContent = () => {
    // Departments List
    if (!selectedDepartment) {
      return (
        <>
          <Box sx={{ mb: 3, display: "flex" }}>
            <Paper
              component="form"
              sx={{
                p: "2px 4px",
                display: "flex",
                alignItems: "center",
                width: "100%",
                boxShadow: 1,
              }}
            >
              <IconButton sx={{ p: "10px" }} aria-label="search">
                <SearchIcon />
              </IconButton>
              <input
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  padding: "8px",
                  fontSize: "16px",
                  backgroundColor: "transparent",
                }}
                placeholder="Search departments or templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Paper>
          </Box>

          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                pl: 1,
                borderLeft: `4px solid #1976d2`,
              }}
            >
              <FolderIcon sx={{ mr: 1 }} /> Browse by Department
            </Typography>
            <Grid container spacing={3}>
              {getUniqueDepartments().length > 0 ? (
                getUniqueDepartments()
                  .filter(
                    (dept) =>
                      !searchQuery ||
                      dept.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((dept) => (
                    <Grid item xs={12} sm={6} md={4} key={dept}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: "100%",
                          transition: "all 0.3s",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: 3,
                            borderColor: "primary.main",
                          },
                        }}
                      >
                        <CardContent
                          sx={{
                            textAlign: "center",
                            py: 3,
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                          }}
                          onClick={() => handleDepartmentClick(dept)}
                        >
                          <FolderIcon
                            sx={{
                              fontSize: 60,
                              color: "primary.main",
                              mb: 1,
                            }}
                          />
                          <Box sx={{ mb: 1, flex: 1 }}>
                            <Tooltip title={dept} arrow placement="top">
                              <Typography
                                variant="h6"
                                component="div"
                                sx={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  mb: 1,
                                }}
                              >
                                {dept}
                              </Typography>
                            </Tooltip>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ overflow: "hidden" }}
                            >
                              {departmentDescriptions[dept] ||
                                "Templates for this department."}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${
                              templates.filter((t) => t.department === dept)
                                .length
                            } Templates`}
                            size="small"
                            color="primary"
                            sx={{ alignSelf: "center" }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
              ) : (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: "center",
                      borderRadius: 2,
                    }}
                  >
                    <HourglassEmptyIcon
                      sx={{
                        fontSize: 40,
                        color: "text.secondary",
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No departments available yet
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      Get started by creating your first template
                    </Typography>
                    <Button
                      component={Link}
                      to="/create-template"
                      startIcon={<AddIcon />}
                      variant="contained"
                      size="large"
                    >
                      Create First Template
                    </Button>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </>
      );
    }

    // App Codes List
    if (selectedDepartment && !selectedAppCode) {
      return (
        <>
          {renderBreadcrumbs()}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 2,
                pl: 1,
                borderLeft: `4px solid #1976d2`,
              }}
            >
              <FolderIcon sx={{ mr: 1, color: "primary.main" }} />
              App Codes in {selectedDepartment}
            </Typography>
            {/* App code search */}
            <Box sx={{ mb: 3, display: "flex" }}>
              <Paper
                component="form"
                sx={{
                  p: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  boxShadow: 1,
                }}
              >
                <IconButton sx={{ p: "10px" }} aria-label="search">
                  <SearchIcon />
                </IconButton>
                <input
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    padding: "8px",
                    fontSize: "16px",
                    backgroundColor: "transparent",
                  }}
                  placeholder="Search app codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Paper>
            </Box>
          </Box>
          <Grid container spacing={3}>
            {getAppCodesForDepartment(selectedDepartment).length > 0 ? (
              getAppCodesForDepartment(selectedDepartment)
                .filter(
                  (code) =>
                    !searchQuery ||
                    code.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((appCode) => (
                  <Grid item xs={12} sm={6} md={4} key={appCode}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        transition: "all 0.3s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 3,
                          borderColor: "secondary.main",
                        },
                      }}
                    >
                      <CardContent
                        sx={{ textAlign: "center", py: 3, height: "100%" }}
                        onClick={() => handleAppCodeClick(appCode)}
                      >
                        <FolderIcon
                          sx={{
                            fontSize: 60,
                            color: "secondary.main",
                            mb: 1,
                          }}
                        />
                        <Tooltip title={appCode} arrow placement="top">
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              mb: 1,
                            }}
                          >
                            {appCode}
                          </Typography>
                        </Tooltip>
                        <Chip
                          label={`${
                            templates.filter(
                              (t) =>
                                t.department === selectedDepartment &&
                                t.appCode === appCode
                            ).length
                          } Templates`}
                          size="small"
                          color="secondary"
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
            ) : (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
                  <HourglassEmptyIcon
                    sx={{
                      fontSize: 40,
                      color: "text.secondary",
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" color="text.secondary">
                    No app codes found
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Create your first template in this department
                  </Typography>
                  <Button
                    component={Link}
                    to={`/create-template?department=${selectedDepartment}`}
                    startIcon={<AddIcon />}
                    variant="contained"
                    size="large"
                  >
                    Create Template
                  </Button>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      );
    }

    // Templates List (by department & app code)
    return (
      <>
        {renderBreadcrumbs()}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <DescriptionIcon sx={{ mr: 1, color: "primary.main" }} />
            Templates in {selectedDepartment}/{selectedAppCode}
          </Typography>
          <Button
            component={Link}
            to={`/create-template?department=${selectedDepartment}&appCode=${selectedAppCode}`}
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
          >
            Add Template
          </Button>
        </Box>
        <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
          <Paper
            component="form"
            sx={{
              p: "2px 4px",
              display: "flex",
              alignItems: "center",
              flex: 1,
              boxShadow: 1,
            }}
          >
            <IconButton sx={{ p: "10px" }} aria-label="search">
              <SearchIcon />
            </IconButton>
            <input
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: "8px",
                fontSize: "16px",
                backgroundColor: "transparent",
              }}
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <IconButton
              sx={{ p: "10px" }}
              onClick={() => setShowFilterOptions(!showFilterOptions)}
              aria-label="filter"
            >
              <FilterListIcon />
            </IconButton>
          </Paper>
        </Box>
        <Grid container spacing={2}>
          {displayTemplates.length > 0 ? (
            displayTemplates.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Box sx={{ position: "relative" }}>
                  <Suspense fallback={<TemplateCardSkeleton />}>
                    <LazyTemplateCard template={template} />
                  </Suspense>
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "background.paper",
                      borderRadius: "50%",
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setPreviewTemplate(template)}
                      aria-label="quick preview"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
                <HourglassEmptyIcon
                  sx={{
                    fontSize: 40,
                    color: "text.secondary",
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="text.secondary">
                  No templates found
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  {searchQuery
                    ? "Try a different search term or create a new template"
                    : "Create your first template in this location"}
                </Typography>
                <Button
                  component={Link}
                  to={`/create-template?department=${selectedDepartment}&appCode=${selectedAppCode}`}
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="large"
                >
                  Create First Template
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
        {filteredTemplates.length > 6 && !showAllTemplates && (
          <Fade in={true}>
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                onClick={() => setShowAllTemplates(true)}
                variant="outlined"
                size="medium"
                sx={{ px: 4 }}
              >
                Show All {filteredTemplates.length} Templates
              </Button>
            </Box>
          </Fade>
        )}
      </>
    );
  };

  // --- Recent Templates ---
  const renderRecentTemplatesColumn = () => (
    <Box>
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          pl: 1,
          borderLeft: `4px solid #9c27b0`,
        }}
      >
        <VisibilityIcon sx={{ mr: 1, fontSize: 20 }} /> Recent Templates
      </Typography>
      {getRecentTemplates().length > 0 ? (
        <List sx={{ px: 0 }}>
          {getRecentTemplates().map((template) => (
            <Box key={template.id} sx={{ mb: 2 }}>
              <Suspense fallback={<TemplateCardSkeleton />}>
                <LazyTemplateCard template={template} />
              </Suspense>
            </Box>
          ))}
        </List>
      ) : (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No recent templates</Typography>
        </Box>
      )}
    </Box>
  );

  // --- Recent Activity ---
  const renderActivityColumn = () => (
    <Box>
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          pl: 1,
          borderLeft: `4px solid #9c27b0`,
        }}
      >
        Recent Activity
      </Typography>
      {activities.length > 0 ? (
        activities.map((activity, index) => (
          <Fade in={true} timeout={300 + index * 100} key={index}>
            <Box sx={{ mb: 2 }}>
              <ActivityItem activity={activity} />
              {index < activities.length - 1 && <Divider sx={{ my: 2 }} />}
            </Box>
          </Fade>
        ))
      ) : (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No recent activity</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {renderContent()}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderRecentTemplatesColumn()}
            <Box sx={{ mt: 4 }}>{renderActivityColumn()}</Box>
          </Grid>
        </Grid>
      </Container>

      {/* Template Preview Dialog */}
      <Dialog
        open={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{previewTemplate?.name}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1">
            {previewTemplate?.instructions ||
              "No preview available for this template."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
