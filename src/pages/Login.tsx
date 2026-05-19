import { Navigate } from "react-router-dom"

// This legacy login page redirects to the Auth0-based login flow.
const Login = () => <Navigate to="/login" replace />

export default Login
