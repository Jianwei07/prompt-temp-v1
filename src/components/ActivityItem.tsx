import React from "react";
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { Activity } from "../types";

interface ActivityItemProps {
  activity: Activity;
  lastItem?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  lastItem = false,
}) => {
  return (
    <>
      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
        <ListItemText
          primary={
            <Typography variant="body1">
              <Box component="span" fontWeight={600}>
                {activity.user}
              </Box>
              {` ${activity.action} `}
              <Box component="span" fontStyle="italic">
                {activity.templateName}
              </Box>
            </Typography>
          }
          secondary={
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              {activity.timestamp}
            </Typography>
          }
          sx={{ my: 0 }}
        />
      </ListItem>
      {!lastItem && <Divider component="li" sx={{ my: 1 }} />}
    </>
  );
};

export default ActivityItem;
