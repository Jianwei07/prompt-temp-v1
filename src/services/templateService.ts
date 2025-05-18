import {
  Activity,
  ApiLog,
  CreateTemplateData,
  Template,
  UpdateTemplateData,
  User,
  VersionHistory,
} from "../types";

/** Backend API Base URL */
const API_BASE_URL = "http://localhost:8080/api";

export function extractTemplate(obj: any): any | null {
  if (!obj) return null;
  if (obj.template) return obj.template;
  if (obj.data) return extractTemplate(obj.data);
  if (obj.success && typeof obj.success === "boolean") {
    const keys = Object.keys(obj).filter((k) => k !== "success");
    for (const key of keys) {
      const value = extractTemplate(obj[key]);
      if (value) return value;
    }
  }
  // If it looks like a template itself
  if (obj.id && obj.name) return obj;
  return null;
}

/** Logs API interactions (non-blocking, fire-and-forget) */
export const logToBackend = async (log: ApiLog): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...log,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Silently ignore errors for logging
    console.error("Failed to log to backend:", error);
  }
};

/**
 * Fetches templates from backend, handling the deeply nested structure from Spring Boot.
 * @returns Array of Template objects.
 */
export async function getTemplates(): Promise<Template[]> {
  const response = await fetch(`${API_BASE_URL}/templates`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error fetching templates:", response.status, errorText);
    throw new Error("Failed to fetch templates");
  }
  const data = await response.json();

  // Robustly handle different possible backend response shapes
  if (
    data &&
    data.templates &&
    data.templates.body &&
    Array.isArray(data.templates.body.templates)
  ) {
    return data.templates.body.templates;
  }
  // Fallback for other possible response shapes
  if (data && Array.isArray(data.templates)) {
    return data.templates;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

export async function getTemplate(id: string): Promise<Template | null> {
  const response = await fetch(`${API_BASE_URL}/templates/${id}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error fetching template:", response.status, errorText);
    throw new Error("Failed to fetch template");
  }
  const data = await response.json();
  return extractTemplate(data);
}

/**
 * Creates a new template.
 */
export async function createTemplate(
  data: CreateTemplateData
): Promise<Template> {
  const response = await fetch(`${API_BASE_URL}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error creating template:", response.status, errorText);
    throw new Error("Failed to create template");
  }

  const result = await response.json();
  if (result && result.template) {
    return result.template;
  }
  throw new Error("Template creation: Invalid response from server");
}

/**
 * Updates a template.
 */
export async function updateTemplate(
  data: UpdateTemplateData
): Promise<Template> {
  if (!data.id) throw new Error("Template ID is required for updates");
  const response = await fetch(`${API_BASE_URL}/templates/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      content: data.content,
      department: data.department,
      appCode: data.appCode,
      instructions: data.instructions || "",
      examples: data.examples || [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error updating template:", response.status, errorText);
    throw new Error(`Failed to update template: ${errorText}`);
  }
  const result = await response.json();
  if (result && result.success && result.template) {
    return result.template;
  }
  throw new Error("Template update: Invalid response from server");
}

/**
 * Deletes a template by ID.
 */
export async function deleteTemplate(
  id: string,
  comment?: string
): Promise<{
  success: boolean;
  status?: "deleted" | "pending_approval";
  pullRequestUrl?: string;
  message?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestComment: comment || "" }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error deleting template:", response.status, errorText);
    throw new Error("Failed to delete template");
  }

  const result = await response.json();
  return {
    success: !!result.success,
    status: result.status || "deleted",
    pullRequestUrl: result.pullRequestUrl,
    message: result.message,
  };
}

/**
 * Fetches recent activities.
 */
export async function getRecentActivities(): Promise<Activity[]> {
  const response = await fetch(`${API_BASE_URL}/activities`);
  if (!response.ok) {
    console.error("Error fetching activities:", response.status);
    return [];
  }
  return await response.json();
}

/**
 * Fetches user information.
 */
export const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/users`);
  if (!response.ok) {
    console.error("Error fetching users:", response.status);
    return [
      {
        id: "1",
        name: "Default User",
        role: "Editor",
        department: "Technology",
        lastActivity: "Just now",
      },
    ];
  }
  return await response.json();
};

/**
 * Fetches the version history for a template.
 */
export async function getVersionHistory(
  templateId: string
): Promise<VersionHistory[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/templates/${templateId}/history`
    );
    if (!response.ok) {
      console.error("Error fetching version history:", response.status);
      return [];
    }
    const data = await response.json();
    if (data.success === false) {
      console.error("Error in version history response:", data.error);
      return [];
    }
    const history = data.history || data;
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error("Error fetching version history:", error);
    return [];
  }
}

/**
 * Fetches the Bitbucket structure (departments/appCodes).
 */
export async function getBitbucketStructure(): Promise<{
  departments: string[];
  appCodes: Array<{ department: string; appCode: string }>;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/bitbucket/structure`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(
        `Failed to fetch structure: ${response.status} - ${errorText}`
      );
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to fetch structure");
    }
    return {
      departments: data.departments || [],
      appCodes: data.appCodes || [],
    };
  } catch (err) {
    console.error("Error in getBitbucketStructure:", err);
    throw err;
  }
}
