
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Statistics from "./pages/Statistics";
import Controls from "./pages/Controls";
import Maintenance from "./pages/Maintenance";

import "./App.css";
import "./styles/Dashboard.css";

function App() {
  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem("plantpulse_active_page");

    const validPages = [
      "dashboard",
      "statistics",
      "controls",
      "maintenance",
    ];

    return validPages.includes(savedPage) ? savedPage : "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("plantpulse_active_page", activePage);
  }, [activePage]);

  return (
    <div className="app-layout">
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <div className="main-content">
        {activePage === "dashboard" && <Dashboard />}

        {activePage === "statistics" && <Statistics />}

        {activePage === "controls" && <Controls />}

        {activePage === "maintenance" && <Maintenance />}
        
      </div>
    </div>
  );
}

export default App;
