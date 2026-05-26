import { Navigate } from 'react-router-dom'

/**
 * Legacy entry router pointing traffic directly to the Auth0-backed LoginPage
 */
const Login = () => <Navigate to="/login" replace />

export default Login
