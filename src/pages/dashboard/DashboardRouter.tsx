import { useAuth } from "../../contexts/AuthContext"
import AdminDashboard from "./AdminDashboard"
import ManagerDashboard from "./ManagerDashboard"
import SupervisorDashboard from "./SupervisorDashboard"
import EmployeeDashboard from "./EmployeeDashboard"

const DashboardRouter = () => {
	const { user } = useAuth()

	switch (user?.role) {
		case "admin":
			return <AdminDashboard />
		case "manager":
			return <ManagerDashboard />
		case "supervisor":
			return <SupervisorDashboard />
		case "employee":
		default:
			return <EmployeeDashboard />
	}
}

export default DashboardRouter
