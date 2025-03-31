import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  CardActionArea,
} from "@mui/material";
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
  const collectionUrl = `/collections/${encodeURIComponent(collection.name)}`;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 3,
        },
      }}
    >
      <CardActionArea
        component={Link}
        to={collectionUrl}
        onClick={onClick}
        sx={{ flexGrow: 1, p: 2 }}
      >
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            {collection.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {collection.count} {collection.count === 1 ? "prompt" : "prompts"}
          </Typography>
        </CardContent>
      </CardActionArea>
      <Button
        size="small"
        component={Link}
        to={collectionUrl}
        onClick={onClick}
        sx={{ alignSelf: "flex-end", m: 1 }}
      >
        View
      </Button>
    </Card>
  );
};

export default CollectionCard;
