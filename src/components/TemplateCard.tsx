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
  TextField,
  Alert,
  Link,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Template } from "../types";
import CodeIcon from "@mui/icons-material/Code";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { deleteTemplate } from "../services/templateService";

interface TemplateCardProps {
  template: Template;
  onDelete?: () => void; // Optional callback for parent component to refresh
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onDelete }) => {
  // New state variables for enhanced delete functionality, matching UpdateTemplate
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "loading" | "success" | "pending_approval" | "error"
  >("idle");
  const [deletePrUrl, setDeletePrUrl] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [error, setError] = useState("");

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    // If deleted or pending approval, refresh the page
    if (deleteStatus === "success" || deleteStatus === "pending_approval") {
      if (onDelete) {
        onDelete();
      } else {
        window.location.reload();
      }
    }

    // Reset delete dialog state
    setDeleteDialogOpen(false);
    setDeleteComment("");
    setDeleteStatus("idle");
    setDeletePrUrl("");
    setDeleteMessage("");
    setError("");
  };

  // Enhanced delete functionality matching UpdateTemplate
  const handleConfirmDelete = async () => {
    setDeleteStatus("loading");
    setError("");

    try {
      const result = await deleteTemplate(template.id, deleteComment);

      if (result.status === "pending_approval") {
        setDeleteStatus("pending_approval");
        setDeletePrUrl(result.pullRequestUrl || "");
        setDeleteMessage(
          result.message || "Deletion request submitted for approval"
        );
      } else {
        setDeleteStatus("success");
        setDeleteMessage(result.message || "Template deleted successfully");
      }
    } catch (err) {
      setDeleteStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to delete template"
      );
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
                component={RouterLink}
                to={`/view-template/${template.id}`}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit template">
              <IconButton
                size="small"
                color="primary"
                component={RouterLink}
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

      {/* Enhanced Delete Dialog - matching UpdateTemplate */}
      <Dialog
        open={deleteDialogOpen}
        onClose={
          deleteStatus === "loading" ? undefined : handleCloseDeleteDialog
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {deleteStatus === "idle" ? "Confirm Delete" : "Delete Template"}
        </DialogTitle>
        <DialogContent>
          {deleteStatus === "idle" && (
            <>
              <DialogContentText>
                Are you sure you want to delete the template "{template.name}"? This
                action may require approval from a department administrator.
              </DialogContentText>
              <TextField
                fullWidth
                label="Reason for deletion (optional)"
                value={deleteComment}
                onChange={(e) => setDeleteComment(e.target.value)}
                margin="normal"
                multiline
                rows={2}
              />
            </>
          )}

          {deleteStatus === "loading" && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {deleteStatus === "error" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error || "Failed to delete template. Please try again."}
            </Alert>
          )}

          {deleteStatus === "success" && (
            <Alert severity="success">
              {deleteMessage || "Template deleted successfully!"}
            </Alert>
          )}

          {deleteStatus === "pending_approval" && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                {deleteMessage || "Deletion request submitted for approval"}
              </Alert>
              <DialogContentText>
                Your request to delete this template has been submitted and is
                awaiting approval from a department administrator.
              </DialogContentText>
              {deletePrUrl && (
                <Box sx={{ mt: 2 }}>
                  <Link
                    href={deletePrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View pull request
                  </Link>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {deleteStatus === "idle" ? (
            <>
              <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
              <Button onClick={handleConfirmDelete} color="error" variant="contained">
                Delete
              </Button>
            </>
          ) : (
            <Button onClick={handleCloseDeleteDialog} color="primary">
              {deleteStatus === "pending_approval" || deleteStatus === "success"
                ? "Close"
                : "Cancel"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateCard;
