import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CardActions,
  Button,
} from "@mui/material";
import { Link } from "react-router-dom";
import { Template } from "../types";
import CodeIcon from "@mui/icons-material/Code";
import BusinessIcon from "@mui/icons-material/Business";

interface TemplateCardProps {
  template: Template;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div">
          {template.name}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<BusinessIcon />}
            label={template.department}
            size="small"
            sx={{ mr: 1, mb: 1 }}
          />
          <Chip
            icon={<CodeIcon />}
            label={template.appCode}
            size="small"
            sx={{ mb: 1 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {template.content.substring(0, 100)}...
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Chip
            label={`v${template.version}`}
            size="small"
            variant="outlined"
          />
        </Box>
      </CardContent>
      
      <CardActions>
        <Button size="small" component={Link} to={`/view-template/${template.id}`}>
          View
        </Button>
        <Button size="small" component={Link} to={`/edit-template/${template.id}`}>
          Edit
        </Button>
      </CardActions>
    </Card>
  );
};

export default TemplateCard;
