import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  CardActions,
} from "@mui/material";
import { Link } from "react-router-dom";
import { Template } from "../types";

interface TemplateCardProps {
  template: Template;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
}) => {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div">
          {template.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {template.content.substring(0, 100)}...
        </Typography>
        {template.version && (
          <Typography variant="caption" color="text.secondary">
            Version: {template.version}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button
          size="small"
          component={Link}
          to={`/view-template/${template.id}`}
        >
          View
        </Button>
        <Button
          size="small"
          component={Link}
          to={`/edit-template/${template.id}`}
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button size="small" color="error" onClick={onDelete}>
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export default TemplateCard;
