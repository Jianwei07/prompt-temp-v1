import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CreateTemplate from "./pages/CreateTemplate";
import EditTemplate from "./pages/UpdateTemplate";
import ViewTemplate from "./pages/ViewTemplate";
import Support from "./pages/Support";
import "./styles/global.css";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-template" element={<CreateTemplate />} />
        <Route path="/edit-template/:id" element={<EditTemplate />} />
        <Route path="/view-template/:id" element={<ViewTemplate />} />
        <Route path="/support" element={<Support />} />
      </Routes>
    </Router>
  );
};

export default App;
