import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Grid,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTemplateById,
  getVersionHistory,
} from "../services/templateService";
import VersionHistoryItem from "../components/VersionHistoryItem";
import Header from "../components/Header";
import { Template, VersionHistory } from "@/types";

const ViewTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const [templateData, historyData] = await Promise.all([
          getTemplateById(id!),
          getVersionHistory(id!),
        ]);
        setTemplate(templateData);
        setVersionHistory(historyData);
      } catch (err) {
        setError("Failed to load template");
        console.error(err);
      }
    };
    loadTemplate();
  }, [id]);

  if (!template) return <div>Loading...</div>;

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4">{template.name}</Typography>
          <Button
            variant="contained"
            onClick={() => navigate(`/edit-template/${id}`)}
          >
            Edit Template
          </Button>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="body1" whiteSpace="pre-wrap">
                {template.content}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1">Details</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                <strong>Version:</strong> {template.version || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Last Updated:</strong>{" "}
                {new Date(template.lastUsed || "").toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Updated By:</strong> {template.updatedBy || "Unknown"}
              </Typography>
            </Paper>

            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle1">Version History</Typography>
              <Divider sx={{ my: 1 }} />
              <Box>
                {versionHistory.map((version, index) => (
                  <VersionHistoryItem
                    key={version.commitId}
                    version={version}
                    current={index === 0}
                    lastItem={index === versionHistory.length - 1}
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

export default ViewTemplate;
