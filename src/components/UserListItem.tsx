import React from "react";
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  lastActivity: string;
}

interface UserListItemProps {
  user: User;
}

const UserListItem: React.FC<UserListItemProps> = ({ user }) => {
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return timestamp;
    }
  };

  return (
    <ListItem alignItems="flex-start">
      <ListItemText
        primary={
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography component="span" variant="subtitle1">
              {user.name}
            </Typography>
            <Chip
              label={user.role}
              size="small"
              color={user.role.toLowerCase() === "admin" ? "primary" : "default"}
            />
          </Box>
        }
        secondary={
          <>
            <Typography component="span" variant="body2" color="text.primary">
              {user.department}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {" — "}{formatTime(user.lastActivity)}
            </Typography>
          </>
        }
      />
    </ListItem>
  );
};

export default UserListItem;
