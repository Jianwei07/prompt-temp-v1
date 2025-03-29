import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { Collection } from "../types";

interface CollectionCardProps {
  collection: Collection;
  onClick?: () => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onClick,
}) => {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div">
          {collection.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {collection.count} {collection.count === 1 ? "prompt" : "prompts"}
        </Typography>
      </CardContent>
      <Button
        size="small"
        component={Link}
        to={`/templates?collection=${collection.name}`}
        onClick={onClick}
        sx={{ alignSelf: "flex-start", m: 1 }}
      >
        View
      </Button>
    </Card>
  );
};

export default CollectionCard;
