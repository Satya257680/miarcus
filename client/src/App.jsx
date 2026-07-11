import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ActionPoints from "./pages/ActionPoints";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login Page */}
        <Route path="/" element={<Login />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Action Points */}
        <Route path="/action-points" element={<ActionPoints />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;