import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
  Paper,
  Divider,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import type { VersionHistory as VersionHistoryType } from "../types";

interface VersionHistoryProps {
  history: VersionHistoryType[];
  containerSx?: any; // For custom styling of the container
}

const VersionHistoryCard: React.FC<VersionHistoryProps> = ({ history, containerSx = {} }) => {
  // Function to generate a color based on the user's name (for avatars)
  const getUserColor = (name: string) => {
    const colors = [
      "#1976d2", // blue
      "#388e3c", // green
      "#d32f2f", // red
      "#f57c00", // orange
      "#7b1fa2", // purple
      "#0288d1", // light blue
      "#c2185b", // pink
    ];
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name || name === "Unknown") return "?";
    return name
      .split(/\s+/)
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2, 
        height: "100%", 
        bgcolor: "background.paper",
        ...containerSx
      }}
    >
      <Typography
        variant="h6"
        sx={{ 
          display: "flex", 
          alignItems: "center",
          mb: 2 
        }}
      >
        <HistoryIcon sx={{ mr: 1 }} />
        Version History
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      {Array.isArray(history) && history.length > 0 ? (
        <Stack spacing={1.5} sx={{ maxHeight: "70vh", overflow: "auto", pr: 1 }}>
          {history.map((version, index) => (
            <Card 
              key={version.commitId || `version-${index}`}
              variant="outlined" 
              sx={{ 
                boxShadow: "none",
                borderRadius: 1,
                borderLeft: `3px solid ${getUserColor(version.userDisplayName)}`,
              }}
            >
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: getUserColor(version.userDisplayName),
                      width: 24,
                      height: 24,
                      fontSize: "0.8rem",
                      mr: 1
                    }}
                  >
                    {getInitials(version.userDisplayName)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {version.userDisplayName}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip 
                    label={version.version} 
                    color="primary" 
                    size="small"
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                </Box>
                
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: "block", 
                    color: "text.secondary",
                    mb: 1
                  }}
                >
                  {new Date(version.timestamp).toLocaleString()}
                </Typography>
                
                <Box sx={{ 
                  p: 1, 
                  bgcolor: "rgba(0,0,0,0.02)", 
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  wordBreak: "break-word",
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  {version.message}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ 
          p: 3, 
          textAlign: "center", 
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "1px dashed",
          borderColor: "divider"
        }}>
          <HistoryIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No version history available
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default VersionHistoryCard; 