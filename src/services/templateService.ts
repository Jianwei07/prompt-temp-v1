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
// Can not delete or update or create since hardcoded for now
let templates: Template[] = [
  {
    id: "1",
    departmentCodes: ["3DS"],
    name: "Risk Assessment",
    content: "Identify and evaluate risks...",
    version: "v1.2",
    lastUsed: "2 hours ago",
    collection: "Security",
    updatedBy: "J Chua",
    createdAt: new Date(2025, 1, 30, 14, 58),
    updatedAt: new Date(2025, 1, 31, 14, 58),
    createdBy: "J Chua",
  },
  {
    id: "2",
    departmentCodes: ["3DS"],
    name: "Customer Support Test",
    content: "Standard responses for inquiries...",
    version: "v1.0",
    lastUsed: "5 hours ago",
    collection: "Favorites",
    updatedBy: "J Chua",
    createdAt: new Date(2025, 1, 30, 14, 58),
    updatedAt: new Date(NaN),
    createdBy: "",
  },
  {
    id: "3",
    departmentCodes: ["DDP"],
    name: "Developer Portal",
    content: "Standard responses for inquiries...",
    version: "v1.0",
    lastUsed: "5 hours ago",
    collection: "Favorites",
    updatedBy: "J Chua",
    createdAt: new Date(2025, 2, 3, 14, 58),
    updatedAt: new Date(2025, 2, 4, 14, 58),
    createdBy: "J Chua",
  },
  {
    id: "4",
    departmentCodes: ["DVX"],
    name: "DevOps Services",
    content: "Standard responses for inquiries...",
    version: "v1.0",
    lastUsed: "5 hours ago",
    collection: "Favorites",
    updatedBy: "J Chua",
    createdAt: new Date(2025, 3, 30, 14, 58),
    updatedAt: new Date(2025, 3, 31, 14, 58),
    createdBy: "J Chua",
  },
  {
    id: "5",
    departmentCodes: ["HR"],
    name: "Human Resources",
    content: "Standard responses for inquiries...",
    version: "v1.0",
    lastUsed: "5 hours ago",
    collection: "HR",
    updatedBy: "J Chua",
    createdAt: new Date(2025, 2, 10, 14, 58),
    updatedAt: new Date(2025, 2, 12, 14, 58),
    createdBy: "J Chua",
  },
  {
    id: "6",
    departmentCodes: ["CCM"],
    name: "Control Management",
    content: "Standard responses for inquiries...",
    version: "v1.0",
    lastUsed: "5 hours ago",
    collection: "CCM",
    updatedBy: "J Chua",
    createdAt: new Date(2025, 3, 10, 14, 58),
    updatedAt: new Date(2025, 3, 11, 14, 58),
    createdBy: "J Chua",
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

export async function getTemplates(): Promise<Template[]> {
  const response = await fetch("http://localhost:4000/api/templates");
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error fetching templates:", response.status, errorText);
    throw new Error("Failed to fetch templates from Bitbucket");
  }
  const data = await response.json();
  // If data is not an array, check if it's an object containing a 'values' property:
  return Array.isArray(data) ? data : data.values || [];
}

export async function createTemplate(
  data: CreateTemplateData
): Promise<Template> {
  const response = await fetch("http://localhost:4000/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  // If the response is not OK, try to get the error text and throw an error.
  if (!response.ok) {
    const errorText = await response.text();
    console.error("CreateTemplate error:", response.status, errorText);
    throw new Error("Failed to create template");
  }

  // Get the response text
  const responseText = await response.text();
  let result: { filePath?: string } = {};
  if (responseText && responseText.trim().length > 0) {
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.warn("Response is not valid JSON. Proceeding with empty result.");
    }
  } else {
    console.warn("Response body is empty. Proceeding with empty result.");
  }

  console.log("Template created. File stored at:", result.filePath);

  // Simulate returning a new template object based on the input.
  const newTemplate: Template = {
    id: Date.now().toString(),
    name: data.name,
    content: data.content || "",
    version: "v1.0",
    lastUsed: "Just now",
    departmentCodes: data.departmentCodes,
    createdAt: new Date(),
    createdBy: "Test User",
    updatedAt: new Date(NaN),
    updatedBy: "",
  };
  return newTemplate;
}

// Mock data for UI (aligned with your Figma)
export const getCollections = async (): Promise<Collection[]> => {
  // Create a map to count templates per collection
  const collectionCounts = new Map<string, number>();

  // Count templates for each collection
  templates.forEach((template) => {
    if (template.collection) {
      collectionCounts.set(
        template.collection,
        (collectionCounts.get(template.collection) || 0) + 1
      );
    }
  });

  // Convert the map to array of Collection objects
  const collections: Collection[] = Array.from(collectionCounts.entries()).map(
    ([name, count]) => ({
      name,
      count,
    })
  );

  return collections;
};

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
    id: "1", // added id
    name: "Sarah Wilson",
    role: "Admin",
    department: "Retail Banking",
    lastActivity: "2 hours ago",
  },
  {
    id: "2", // added id
    name: "Mike Johnson",
    role: "Editor",
    department: "Security",
    lastActivity: "5 hours ago",
  },
];

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

  // Find the index of the template to delete
  const templateIndex = templates.findIndex((t) => t.id === id);

  // If template not found, throw error
  if (templateIndex === -1) {
    throw new Error(`Template with ID ${id} not found`);
  }

  // Remove the template from the array
  templates.splice(templateIndex, 1);

  // Log the deletion
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

/**TODO: Integrate with Bitbucket API
 * Get the version history of a template
 * @param templateId - The ID of the template
 * @returns The version history of the template
 */
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
