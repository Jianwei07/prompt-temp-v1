import React from "react";
import { ListItem, ListItemText, Chip, Box, Divider } from "@mui/material";
import { VersionHistory } from "../types";

interface VersionHistoryItemProps {
  version: VersionHistory;
  current?: boolean;
  lastItem?: boolean;
}

const VersionHistoryItem: React.FC<VersionHistoryItemProps> = ({
  version,
  current = false,
  lastItem = false,
}) => {
  return (
    <>
      <ListItem>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {version.message}
              {current && <Chip label="Current" size="small" color="primary" />}
            </Box>
          }
          secondary={new Date(version.timestamp).toLocaleString()}
        />
      </ListItem>
      {!lastItem && <Divider component="li" />}
    </>
  );
};

export default VersionHistoryItem;
