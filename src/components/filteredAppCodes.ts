import React, { useState, useEffect } from "react";

const [appCodes, setAppCodes] = useState<{ department: string; appCode: string }[]>([]);
const [filteredAppCodes, setFilteredAppCodes] = useState<string[]>([]);

useEffect(() => {
  // Fetch app codes from API
  const fetchAppCodes = async () => {
    const response = await fetch("/api/your-endpoint");
    const data = await response.json();
    setAppCodes(data.appCodes);
  };

  fetchAppCodes();
}, []);

useEffect(() => {
  if (formData.department) {
    const filtered = appCodes
      .filter((item) => item.department === formData.department)
      .map((item) => item.appCode);

    setFilteredAppCodes(filtered);
  } else {
    setFilteredAppCodes([]);
  }
}, [formData.department, appCodes]);
