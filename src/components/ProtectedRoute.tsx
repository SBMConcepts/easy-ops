import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth, type UserRole } from "../contexts/AuthContext"

interface ProtectedRouteProps {
	children: React.ReactNode
	allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
	const { isAuthenticated, user } = useAuth()

	if (!isAuthenticated)
		return React.createElement(Navigate, { to: "/login", replace: true })
	if (allowedRoles && user && !allowedRoles.includes(user.role)) {
		return React.createElement(Navigate, { to: "/app", replace: true })
	}

	return React.createElement(React.Fragment, null, children)
}

export default ProtectedRoute
