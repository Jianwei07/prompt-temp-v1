import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  CardActions,
  Box,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import { Template } from "../types";
import FolderIcon from '@mui/icons-material/Folder';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

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
        
        {/* Collection Chip */}
        <Box sx={{ mb: 1 }}>
          <Chip
            icon={<FolderIcon />}
            label={template.collection}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              '& .MuiChip-icon': {
                color: 'primary.main',
              },
            }}
          />
        </Box>

        {/* Department Code Chips */}
        <Box sx={{ mb: 2 }}>
          {template.departmentCodes?.map((code) => (
            <Chip
              key={code}
              icon={<LocalOfferIcon />}
              label={code}
              size="small"
              sx={{
                mr: 0.5,
                mb: 0.5,
                backgroundColor: 'primary.main',
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          ))}
        </Box>

        {/* Version and Last Used Info */}
        <Box sx={{ mt: 1 }}>
          {template.version && (
            <Typography variant="caption" color="text.secondary" display="block">
              Version: {template.version}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" display="block">
            Last used: {template.lastUsed}
          </Typography>
          {template.updatedBy && (
            <Typography variant="caption" color="text.secondary" display="block">
              Updated by: {template.updatedBy}
            </Typography>
          )}
        </Box>
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
