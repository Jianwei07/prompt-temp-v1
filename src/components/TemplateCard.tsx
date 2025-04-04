import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CardActions,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Link } from "react-router-dom";
import { Template } from "../types";
import CodeIcon from "@mui/icons-material/Code";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { deleteTemplate } from "../services/templateService";

interface TemplateCardProps {
  template: Template;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteTemplate(template.id);
      // Close the dialog and refresh the page (easier than updating state)
      handleCloseDeleteDialog();
      window.location.reload();
    } catch (err) {
      console.error("Error deleting template:", err);
      setError("Failed to delete template. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <>
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
            {template.content.substring(0, 80)}
            {template.content.length > 80 ? "..." : ""}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Chip
              label={`v${template.version}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
          <Box>
            <Tooltip title="View template">
              <IconButton
                size="small"
                color="primary"
                component={Link}
                to={`/view-template/${template.id}`}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit template">
              <IconButton
                size="small"
                color="primary"
                component={Link}
                to={`/edit-template/${template.id}`}
                sx={{ ml: 1 }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Tooltip title="Delete template">
            <IconButton size="small" color="error" onClick={handleDeleteClick}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the template "{template.name}"? This
            action cannot be undone.
          </DialogContentText>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            disabled={isDeleting}
            autoFocus
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateCard;
