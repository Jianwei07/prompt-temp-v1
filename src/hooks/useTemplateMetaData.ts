import axios from "axios";
import { useEffect, useState } from "react";

export interface TemplateMetadata {
  id: string;
  name: string;
  department: string;
  appCode: string;
  version?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function useTemplateMetadata() {
  const [metadata, setMetadata] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<TemplateMetadata[]>("/api/templates/metadata") // Adjust as needed
      .then((res) => {
        setMetadata(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch metadata");
        setLoading(false);
      });
  }, []);

  return { metadata, loading, error };
}
