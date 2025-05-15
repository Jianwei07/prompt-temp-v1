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
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import useDeleteTemplate from "../hooks/useDeleteTemplate";
import { Template } from "../types";

interface TemplateCardProps {
  template: Template;
  onDelete?: () => void;
}

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

  return (
    <>
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h6" component="div">
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
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            {template.content?.substring(0, 80) || "No content"}
            {template.content && template.content.length > 80 ? "..." : ""}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Chip
              label={`v${template.version || "0.0.1"}`}
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
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteComment("")}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>

      <Dialog
        open={deleteStatus !== "idle"}
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
                Are you sure you want to delete the template "{template.name}"?
                This action may require approval from a department
                administrator.
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
              <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
              <Button onClick={handleDelete} color="error" variant="contained">
                Delete
              </Button>
            </>
          ) : (
            <Button onClick={handleCloseDeleteDialog} color="primary">
              {deleteStatus === "success" ? "Close" : "Cancel"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateCard;
