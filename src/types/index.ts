export interface Template {
  id: string;
  name: string;
  department: string;
  appCode: string;
  content: string;
  instructions: string;
  examples: Array<{
    "User Input": string;
    "Expected Output": string;
  }>;
  version: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  department: string;
  appCode: string;
  content: string;
  instructions: string;
  examples: Array<{
    "User Input": string;
    "Expected Output": string;
  }>;
}

export interface UpdateTemplateData {
  id: string;
  name: string;
  department: string;
  appCode: string;
  content: string;
  instructions?: string;
  examples?: Array<{
    "User Input": string;
    "Expected Output": string;
  }>;
}

export interface Activity {
  user: string;
  action: string;
  templateName: string;
  timestamp: string;
}

export interface VersionHistory {
  commitId: string;
  templateId: string;
  version: string;
  message: string;
  userId: string;
  userDisplayName: string;
  timestamp: string;
}

export interface ApiLog {
  endpoint: string;
  method: string;
  payload: any;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  lastActivity: string;
}