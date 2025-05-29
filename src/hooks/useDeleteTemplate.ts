import { useState } from "react";
import { deleteTemplate } from "../services/templateService";

interface UseDeleteTemplateProps {
  deleteStatus: "idle" | "loading" | "success" | "error";
  deleteMessage: string;
  error: string | null;
  deletePrUrl: string | null;
  deleteComment: string;
  setDeleteComment: (comment: string) => void;
  handleDelete: () => void;
  handleCloseDeleteDialog: () => void;
}

const useDeleteTemplate = (
  templateId: string,
  onDelete?: () => void
): UseDeleteTemplateProps => {
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletePrUrl, setDeletePrUrl] = useState<string | null>(null);
  const [deleteComment, setDeleteComment] = useState("");

  const handleDelete = async () => {
    console.log("Hook handleDelete started for template id:", templateId);
    setDeleteStatus("loading");
    try {
      const result = await deleteTemplate(templateId, deleteComment);
      setDeleteStatus("success");
      setDeleteMessage(result.message || "Template deleted successfully.");
      if (result.pullRequestUrl) {
        setDeletePrUrl(result.pullRequestUrl);
      }
      console.log("Hook handleDelete calling onDelete prop");
      if (onDelete) onDelete();
    } catch (err) {
      setDeleteStatus("error");
      setError(err instanceof Error ? err.message : "Failed to delete the template.");
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteStatus("idle");
    setDeleteMessage("");
    setError(null);
    setDeletePrUrl(null);
    setDeleteComment("");
  };

  return {
    deleteStatus,
    deleteMessage,
    error,
    deletePrUrl,
    deleteComment,
    setDeleteComment,
    handleDelete,
    handleCloseDeleteDialog,
  };
};

export default useDeleteTemplate;
