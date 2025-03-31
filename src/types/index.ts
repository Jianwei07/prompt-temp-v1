import { Key } from "react";

// Core types matching your Figma design
export interface Template {
  updatedBy: string;
  updatedAt: Date;
  createdAt: Date;
  createdBy: string;
  id: string;
  name: string;
  content: string;
  version?: string;
  lastUsed: string;
  collection?: string;
  departmentCodes: string[];
}

export interface User {
  id?: string;
  name: string;
  role: string;
  department: string;
  lastActivity: string;
}

export interface Collection {
  name: string;
  count: number;
}

export interface Activity {
  action: string; // "created" | "edited" | "deleted"
  templateName: string;
  timestamp: string;
  user: string;
}

export interface User {
  [x: string]: Key | null | undefined;
  name: string;
  role: string;
  department: string;
  lastActivity: string;
}

// API communication types
export interface ApiLog {
  endpoint: string;
  method: string;
  payload: object;
  timestamp: string;
}

// Minimal types for frontend-backend communication
export interface CreateTemplateData {
  name: string;
  content?: string;
  departmentCodes: string[];
}

export interface UpdateTemplateData extends CreateTemplateData {
  id: string;
  name: string;
  content?: string;
  collection?: string;
  tags?: string[];
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
