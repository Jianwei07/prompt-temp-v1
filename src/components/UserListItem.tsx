import React from "react";
import {
  ListItem,
  ListItemText,
  Avatar,
  ListItemAvatar,
  Typography,
  Divider,
} from "@mui/material";
import { User } from "../types";

interface UserListItemProps {
  user: User;
  lastItem?: boolean;
}

const UserListItem: React.FC<UserListItemProps> = ({
  user,
  lastItem = false,
}) => {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <>
      <ListItem>
        <ListItemAvatar>
          <Avatar>{initials}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={user.name}
          secondary={
            <>
              <Typography component="span" variant="body2" color="text.primary">
                {user.role} | {user.department}
              </Typography>
              <br />
              Last active {user.lastActivity}
            </>
          }
        />
      </ListItem>
      {!lastItem && <Divider variant="inset" component="li" />}
    </>
  );
};

export default UserListItem;
