import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
// import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
//import CheckIn from "./pages/CheckIn";
//import LiveAttendance from "./pages/LiveAttendance";
//import Reports from "./pages/Reports";
//import EmployeeManagement from "./pages/EmployeeManagement";
//import Compliance from "./pages/Compliance";
//import ComingSoon from "./pages/ComingSoon";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardRouter />} />
            <Route
              path="check-in"
              element={
                <ProtectedRoute allowedRoles={["employee", "supervisor"]}>
                  <CheckIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "manager", "supervisor"]}
                >
                  <LiveAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
            //{" "}
            <Route
              path="team"
              element={
                <ProtectedRoute allowedRoles={["supervisor"]}>
                  <ComingSoon title="Team Overview" />
                </ProtectedRoute>
              }
            />
            //
            <Route
              path="compliance"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Compliance />
                </ProtectedRoute>
              }
            />
            //
            <Route
              path="sites"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ComingSoon title="Sites & Departments" />
                </ProtectedRoute>
              }
            />
            //
            <Route
              path="payroll"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <ComingSoon title="Payroll Export" />
                </ProtectedRoute>
              }
            />
            //
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ComingSoon title="System Settings" />
                </ProtectedRoute>
              }
            />
          </Route>
          //
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
