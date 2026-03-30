import "./storage-polyfill.js";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import EnergyCalcApp from "./energy-calc.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EnergyCalcApp />
  </React.StrictMode>
);
