import { useState } from "react";

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
    setDeleteStatus("loading");
    try {
      // Simulate API call to delete the template
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDeleteStatus("success");
      setDeleteMessage("Template deleted successfully.");
      setDeletePrUrl(`https://bitbucket.org/pr/${templateId}`); // Example PR URL
      if (onDelete) onDelete();
    } catch (err) {
      setDeleteStatus("error");
      setError("Failed to delete the template.");
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
