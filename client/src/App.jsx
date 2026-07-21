import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";


// ================= PUBLIC PAGES =================

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";



// ================= PROTECTED PAGES =================

import Dashboard from "./pages/Dashboard";

import ActionPoints from "./pages/ActionPoints";

import ChecklistSubmission from "./pages/ChecklistSubmission";

import ChecklistReports from "./pages/ChecklistReports";


import Users from "./pages/Users";

import ReportsTo from "./pages/ReportsTo";


import Profile from "./pages/Profile";


import Departments from "./pages/Departments";

import Designations from "./pages/Designations";

import StoreManagement from "./pages/StoreManagement";


import ChecklistTypes from "./pages/ChecklistTypes";

import Questions from "./pages/Questions";





function App(){


return(

<BrowserRouter>


<Routes>





{/* =================================================
    PUBLIC ROUTES
================================================= */}



<Route

path="/"

element={<Login />}

/>



<Route

path="/forgot-password"

element={<ForgotPassword />}

/>



<Route

path="/reset-password"

element={<ResetPassword />}

/>









{/* =================================================
    PROTECTED ROUTES
================================================= */}



<Route

element={

<ProtectedRoute>

<Layout />

</ProtectedRoute>

}

>




{/* ================= DASHBOARD ================= */}


<Route

path="/dashboard"

element={<Dashboard />}

/>








{/* ================= CHECKLIST ================= */}



<Route

path="/checklist-submit"

element={<ChecklistSubmission />}

/>




<Route

path="/checklist-reports"

element={<ChecklistReports />}

/>





<Route

path="/action-points"

element={<ActionPoints />}

/>









{/* ================= SETTINGS ================= */}



<Route

path="/checklist-types"

element={<ChecklistTypes />}

/>





<Route

path="/questions"

element={<Questions />}

/>





<Route

path="/departments"

element={<Departments />}

/>





<Route

path="/designations"

element={<Designations />}

/>





<Route

path="/stores"

element={<StoreManagement />}

/>






<Route

path="/users"

element={<Users />}

/>







<Route

path="/reports-to"

element={<ReportsTo />}

/>









{/* ================= PROFILE ================= */}



<Route

path="/profile"

element={<Profile />}

/>






</Route>





{/* ================= FALLBACK ================= */}


<Route

path="*"

element={<Login />}

/>





</Routes>


</BrowserRouter>


);


}



export default App;