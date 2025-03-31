import React, { useEffect, useState } from "react";
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import { getTemplates } from "../services/templateService";
import type { Template } from "../types";

const CollectionDetail: React.FC = () => {
  const { collectionName } = useParams<{ collectionName: string }>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const allTemplates = await getTemplates();
        const filtered = allTemplates.filter(
          (template) => template.collection === collectionName
        );
        setTemplates(filtered);
      } catch (err) {
        setError("Failed to load templates for this collection");
        console.error(err);
      }
    };
    loadTemplates();
  }, [collectionName]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Collection: {collectionName}
      </Typography>
      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}
      {templates.length > 0 ? (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{template.name}</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    {template.departmentCodes?.join(", ")}
                  </Typography>
                  <Typography variant="body2">
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
                  <Button
                    size="small"
                    component={Link}
                    to={`/view-template/${template.id}`}
                  >
                    View
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography color="text.secondary">
          No templates found for this collection.
        </Typography>
      )}
      <Button variant="outlined" component={Link} to="/" sx={{ mt: 3 }}>
        Back to Dashboard
      </Button>
    </Container>
  );
};

export default CollectionDetail;
