import BusinessIcon from "@mui/icons-material/Business";
import CodeIcon from "@mui/icons-material/Code";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import useDeleteTemplate from "../hooks/useDeleteTemplate";
import { Template } from "../types";

interface TemplateCardProps {
  template: Template;
  onDelete?: () => void;
}

const MAX_CONTENT_LENGTH = 80;

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onDelete }) => {
  const {
    deleteStatus,
    deleteMessage,
    error,
    deleteComment,
    setDeleteComment,
    handleDelete,
    handleCloseDeleteDialog,
  } = useDeleteTemplate(template.id, onDelete);

  // Explicitly control dialog open
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleOpenDeleteDialog = () => setDeleteDialogOpen(true);
  const handleFullCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    handleCloseDeleteDialog();
  };

  return (
    <>
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography
            gutterBottom
            variant="h6"
            noWrap
            title={template.name || "Untitled"}
          >
            {template.name || "Untitled"}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Chip
              icon={<BusinessIcon />}
              label={template.department || "Unknown Dept"}
              size="small"
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip
              icon={<CodeIcon />}
              label={template.appCode || "No Code"}
              size="small"
              sx={{ mb: 1 }}
            />
            {Array.isArray(template.examples) &&
              template.examples.length > 0 && (
                <Chip
                  label={`${template.examples.length} Example${
                    template.examples.length > 1 ? "s" : ""
                  }`}
                  size="small"
                  sx={{ mb: 1, ml: 1 }}
                  color="info"
                />
              )}
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            paragraph
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              minHeight: 50,
            }}
          >
            {(template.content || "No content").length > MAX_CONTENT_LENGTH
              ? template.content?.substring(0, MAX_CONTENT_LENGTH) + "..."
              : template.content || "No content"}
          </Typography>

          <Box sx={{ mt: 1 }}>
            <Chip
              label={`v${template.version || "0.0.1"}`}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            {template.updatedAt && (
              <Chip
                label={new Date(template.updatedAt).toLocaleDateString()}
                size="small"
                variant="outlined"
              />
            )}
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
            <IconButton
              size="small"
              color="error"
              onClick={handleOpenDeleteDialog}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>

      <Dialog
        open={deleteDialogOpen || deleteStatus !== "idle"}
        onClose={
          deleteStatus === "loading" ? undefined : handleFullCloseDeleteDialog
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
                Are you sure you want to delete "{template.name}"? This action
                may require approval.
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
        </DialogContent>
        <DialogActions>
          {deleteStatus === "idle" ? (
            <>
              <Button onClick={handleFullCloseDeleteDialog}>Cancel</Button>
              <Button onClick={handleDelete} color="error" variant="contained">
                Delete
              </Button>
            </>
          ) : (
            <Button onClick={handleFullCloseDeleteDialog} color="primary">
              {deleteStatus === "success" ? "Close" : "Cancel"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateCard;
