import {
  Template,
  Activity,
  User,
  CreateTemplateData,
  UpdateTemplateData,
  ApiLog,
  VersionHistory,
} from "../types";

// Mock database (simple arrays)
// Can not delete or update or create since hardcoded for now
// let templates: Template[] = [
//   {
//     id: "1",
//     departmentCodes: ["3DS"],
//     name: "Risk Assessment",
//     content: "Identify and evaluate risks...",
//     version: "v1.2",
//     lastUsed: "2 hours ago",
//     collection: "Security",
//     updatedBy: "J Chua",
//     createdAt: new Date(2025, 1, 30, 14, 58),
//     updatedAt: new Date(2025, 1, 31, 14, 58),
//     createdBy: "J Chua",
//   },
//   {
//     id: "2",
//     departmentCodes: ["3DS"],
//     name: "Customer Support Test",
//     content: "Standard responses for inquiries...",
//     version: "v1.0",
//     lastUsed: "5 hours ago",
//     collection: "Favorites",
//     updatedBy: "J Chua",
//     createdAt: new Date(2025, 1, 30, 14, 58),
//     updatedAt: new Date(NaN),
//     createdBy: "",
//   },
//   {
//     id: "3",
//     departmentCodes: ["DDP"],
//     name: "Developer Portal",
//     content: "Standard responses for inquiries...",
//     version: "v1.0",
//     lastUsed: "5 hours ago",
//     collection: "Favorites",
//     updatedBy: "J Chua",
//     createdAt: new Date(2025, 2, 3, 14, 58),
//     updatedAt: new Date(2025, 2, 4, 14, 58),
//     createdBy: "J Chua",
//   },
//   {
//     id: "4",
//     departmentCodes: ["DVX"],
//     name: "DevOps Services",
//     content: "Standard responses for inquiries...",
//     version: "v1.0",
//     lastUsed: "5 hours ago",
//     collection: "Favorites",
//     updatedBy: "J Chua",
//     createdAt: new Date(2025, 3, 30, 14, 58),
//     updatedAt: new Date(2025, 3, 31, 14, 58),
//     createdBy: "J Chua",
//   },
//   {
//     id: "5",
//     departmentCodes: ["HR"],
//     name: "Human Resources",
//     content: "Standard responses for inquiries...",
//     version: "v1.0",
//     lastUsed: "5 hours ago",
//     collection: "HR",
//     updatedBy: "J Chua",
//     createdAt: new Date(2025, 2, 10, 14, 58),
//     updatedAt: new Date(2025, 2, 12, 14, 58),
//     createdBy: "J Chua",
//   },
//   {
//     id: "6",
//     departmentCodes: ["CCM"],
//     name: "Control Management",
//     content: "Standard responses for inquiries...",
//     version: "v1.0",
//     lastUsed: "5 hours ago",
//     collection: "CCM",
//     updatedBy: "J Chua",
//     createdAt: new Date(2025, 3, 10, 14, 58),
//     updatedAt: new Date(2025, 3, 11, 14, 58),
//     createdBy: "J Chua",
//   },
// ];

// Export logToBackend so it can be used elsewhere
export const logToBackend = async (log: ApiLog): Promise<void> => {
  try {
    await fetch("http://localhost:4000/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...log,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Failed to log to backend:", error);
  }
};

export async function getTemplates(): Promise<Template[]> {
  const response = await fetch("http://localhost:4000/api/templates");
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error fetching templates:", response.status, errorText);
    throw new Error("Failed to fetch templates");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.values || [];
}

export async function getTemplate(id: string): Promise<Template> {
  const response = await fetch(`http://localhost:4000/api/templates/${id}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error fetching template:", response.status, errorText);
    throw new Error("Failed to fetch template");
  }
  return await response.json();
}

export async function createTemplate(
  data: CreateTemplateData
): Promise<Template> {
  const response = await fetch("http://localhost:4000/api/templates", {
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

  return await response.json();
}

export async function updateTemplate(
  data: UpdateTemplateData
): Promise<Template> {
  const response = await fetch(
    `http://localhost:4000/api/templates/${data.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error updating template:", response.status, errorText);
    throw new Error("Failed to update template");
  }

  return await response.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`http://localhost:4000/api/templates/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error deleting template:", response.status, errorText);
    throw new Error("Failed to delete template");
  }
}

export async function getRecentActivities(): Promise<Activity[]> {
  const response = await fetch("http://localhost:4000/api/activities");
  if (!response.ok) {
    console.error("Error fetching activities:", response.status);
    return [];
  }
  return await response.json();
}

export const getUsers = async (): Promise<User[]> => {
  const response = await fetch("http://localhost:4000/api/users");
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

export async function getVersionHistory(
  templateId: string
): Promise<VersionHistory[]> {
  const response = await fetch(
    `http://localhost:4000/api/templates/${templateId}/history`
  );
  if (!response.ok) {
    console.error("Error fetching version history:", response.status);
    return [];
  }
  return await response.json();
}

export async function getBitbucketStructure(): Promise<{
  departments: string[];
  appCodes: Array<{ department: string; appCode: string }>;
}> {
  try {
    console.log("Fetching Bitbucket structure...");
    const response = await fetch(
      "http://localhost:4000/api/bitbucket/structure"
    );

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(
        `Failed to fetch structure: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Received structure data:", data);

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
