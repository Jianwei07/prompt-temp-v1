import {
  Template,
  Collection,
  Activity,
  User,
  CreateTemplateData,
  UpdateTemplateData,
  ApiLog,
  VersionHistory,
} from "../types";

// Mock database (simple arrays)
let templates: Template[] = [
  {
    id: "1",
    departmentCodes: ["3DS"],
    name: "Risk Assessment",
    content: "Identify and evaluate risks...",
    version: "v1.2",
    lastUsed: "2 hours ago",
    collection: "Security",
    updatedBy: "",
  },
  {
    id: "2",
    departmentCodes: ["3DS"],
    name: "Customer Support",
    content: "Standard responses for inquiries...",
    version: "v1.0",
    lastUsed: "5 hours ago",
    collection: "Favorites",
    updatedBy: "",
  },
];

// Simple logger for frontend actions
const logToBackend = async (log: ApiLog): Promise<void> => {
  console.log("[API LOG]:", log); // Replace with actual API call later
  // Example fetch:
  // await fetch('/api/logs', {
  //   method: 'POST',
  //   body: JSON.stringify(log)
  // });
};

// Basic CRUD operations
export const getTemplates = async (): Promise<Template[]> => {
  await logToBackend({
    endpoint: "/templates",
    method: "GET",
    payload: {},
    timestamp: new Date().toISOString(),
  });
  return [...templates];
};

export const createTemplate = async (
  data: CreateTemplateData
): Promise<Template> => {
  const newTemplate = {
    id: Date.now().toString(),
    name: data.name,
    content: data.content || "",
    updatedBy: "",
    version: "v1.0",
    lastUsed: "Just now",
    departmentCodes: [],
  };

  templates.push(newTemplate);

  await logToBackend({
    endpoint: "/templates",
    method: "POST",
    payload: data,
    timestamp: new Date().toISOString(),
  });

  return newTemplate;
};

// Mock data for UI (aligned with your Figma)
export const getCollections = async (): Promise<Collection[]> => [
  { name: "Favorites", count: 12 },
  { name: "Security", count: 8 },
  { name: "HR", count: 15 },
];

export const getRecentActivities = async (): Promise<Activity[]> => [
  {
    action: "edited",
    templateName: "Risk Assessment",
    timestamp: "2 hours ago",
    user: "John Doe",
  },
  {
    action: "created",
    templateName: "Compliance Check",
    timestamp: "5 hours ago",
    user: "Sarah Smith",
  },
];

export const getUsers = async (): Promise<User[]> => [
  {
    name: "Sarah Wilson",
    role: "Admin",
    department: "Retail Banking",
    lastActivity: "2 hours ago",
  },
  {
    name: "Mike Johnson",
    role: "Editor",
    department: "Security",
    lastActivity: "5 hours ago",
  },
];
// Add these to your existing templateService.ts

export const getTemplateById = async (id: string): Promise<Template> => {
  if (!id) throw new Error("Template ID is required");

  await logToBackend({
    endpoint: `/templates/${id}`,
    method: "GET",
    payload: {},
    timestamp: new Date().toISOString(),
  });

  const template = templates.find((t) => t.id === id);
  if (!template) throw new Error(`Template with ID ${id} not found`);
  return { ...template };
};

export const updateTemplate = async (
  data: UpdateTemplateData
): Promise<Template> => {
  if (!data.id) throw new Error("Template ID is required");

  const index = templates.findIndex((t) => t.id === data.id);
  if (index === -1) throw new Error(`Template with ID ${data.id} not found`);

  const currentVersion = templates[index].version || "v1.0"; // Fallback if undefined
  const updatedTemplate = {
    ...templates[index],
    ...data,
    version: incrementVersion(currentVersion),
    lastUsed: "Just now",
  };

  templates[index] = updatedTemplate;

  await logToBackend({
    endpoint: `/templates/${data.id}`,
    method: "PUT",
    payload: data,
    timestamp: new Date().toISOString(),
  });

  return { ...updatedTemplate };
};

export const deleteTemplate = async (id: string): Promise<void> => {
  if (!id) throw new Error("Template ID is required");

  templates = templates.filter((t) => t.id !== id);

  await logToBackend({
    endpoint: `/templates/${id}`,
    method: "DELETE",
    payload: { id },
    timestamp: new Date().toISOString(),
  });
};

// Update the version helper to handle undefined
function incrementVersion(version?: string): string {
  if (!version) return "v1.0";
  const versionNum = parseInt(version.substring(1));
  return `v${versionNum + 1}.0`;
}

export const getVersionHistory = async (
  templateId: string
): Promise<VersionHistory[]> => {
  await logToBackend({
    endpoint: `/templates/${templateId}/history`,
    method: "GET",
    payload: {},
    timestamp: new Date().toISOString(),
  });

  // Mock version history - in a real app this would come from backend
  return [
    {
      commitId: Date.now().toString(),
      templateId,
      version: "v1.1",
      message: "Updated content",
      userId: "user-123",
      userDisplayName: "Editor",
      timestamp: new Date().toISOString(),
    },
    {
      commitId: (Date.now() - 10000).toString(),
      templateId,
      version: "v1.0",
      message: "Initial version",
      userId: "user-456",
      userDisplayName: "Creator",
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ];
};
