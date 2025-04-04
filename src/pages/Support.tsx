import React from "react";
import {
  Container,
  Typography,
  Paper,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import Header from "../components/Header";

const Support: React.FC = () => {
  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Support Center
        </Typography>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Contact Us
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText
                primary="Email Support"
                secondary={
                  <Link href="mailto:support@promptlib.com">
                    support@promptlib.com
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PhoneIcon />
              </ListItemIcon>
              <ListItemText
                primary="Phone Support"
                secondary="+1 (555) 123-4567 (9AM-5PM EST)"
              />
            </ListItem>
          </List>
        </Paper>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            FAQs
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText
                primary="How do I create a new template?"
                secondary="Navigate to the Create Template page from the header menu."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText
                primary="Can I share templates with my team?"
                secondary="Yes, templates can be shared through team collections."
              />
            </ListItem>
          </List>
        </Paper>
      </Container>
    </>
  );
};

export default Support;
