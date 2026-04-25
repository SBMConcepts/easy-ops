import React, { createContext, useContext, useState, useCallback } from "react"

export type UserRole = "admin" | "manager" | "supervisor" | "employee"

export interface User {
	id: string
	name: string
	email: string
	role: UserRole
	department: string
	avatar?: string
}

interface AuthContextType {
	user: User | null
	isAuthenticated: boolean
	login: (email: string, password: string) => Promise<boolean>
	logout: () => void
	switchRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Mock users for prototype
const MOCK_USERS: Record<string, User> = {
	"admin@eazyops.co.za": {
		id: "u1",
		name: "Thabo Mokoena",
		email: "admin@eazyops.co.za",
		role: "admin",
		department: "IT",
	},
	"manager@eazyops.co.za": {
		id: "u2",
		name: "Naledi Dlamini",
		email: "manager@eazyops.co.za",
		role: "manager",
		department: "Operations",
	},
	"supervisor@eazyops.co.za": {
		id: "u3",
		name: "Sipho Nkosi",
		email: "supervisor@eazyops.co.za",
		role: "supervisor",
		department: "Warehouse",
	},
	"employee@eazyops.co.za": {
		id: "u4",
		name: "Zanele Mthembu",
		email: "employee@eazyops.co.za",
		role: "employee",
		department: "Warehouse",
	},
}

export function AuthProvider({
	children,
}: {
	children: React.ReactNode
}): React.ReactElement {
	const [user, setUser] = useState<User | null>(null)

	const login = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		async (email: string, _password: string): Promise<boolean> => {
			const mockUser = MOCK_USERS[email.toLowerCase()]
			if (mockUser) {
				setUser(mockUser)
				return true
			}
			return false
		},
		[],
	)

	const logout = useCallback(() => setUser(null), [])

	const switchRole = useCallback(
		(role: UserRole) => {
			if (user) {
				const entry = Object.values(MOCK_USERS).find((u) => u.role === role)
				if (entry) setUser(entry)
			}
		},
		[user],
	)

	return React.createElement(
		AuthContext.Provider,
		{ value: { user, isAuthenticated: !!user, login, logout, switchRole } },
		children,
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error("useAuth must be used within AuthProvider")
	return ctx
}
