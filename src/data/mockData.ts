export interface Employee {
	id: string
	name: string
	email: string
	role: "admin" | "manager" | "supervisor" | "employee"
	department: string
	site: string
	status: "present" | "late" | "absent" | "off-site" | "on-leave"
	clockIn?: string
	clockOut?: string
	checkInMethod?: "qr" | "biometric" | "whatsapp" | "manual"
}

export interface AttendanceRecord {
	id: string
	employeeId: string
	employeeName: string
	date: string
	clockIn: string
	clockOut?: string
	hoursWorked?: number
	overtime?: number
	status: "present" | "late" | "absent" | "on-leave"
	method: "qr" | "biometric" | "whatsapp" | "manual"
	site: string
	verified: boolean
}

export const employees: Employee[] = [
	{
		id: "e1",
		name: "Zanele Mthembu",
		email: "zanele@company.co.za",
		role: "employee",
		department: "Warehouse",
		site: "Johannesburg HQ",
		status: "present",
		clockIn: "07:55",
		checkInMethod: "qr",
	},
	{
		id: "e2",
		name: "Bongani Khumalo",
		email: "bongani@company.co.za",
		role: "employee",
		department: "Warehouse",
		site: "Johannesburg HQ",
		status: "late",
		clockIn: "08:22",
		checkInMethod: "biometric",
	},
	{
		id: "e3",
		name: "Lerato Molefe",
		email: "lerato@company.co.za",
		role: "employee",
		department: "Operations",
		site: "Cape Town Branch",
		status: "present",
		clockIn: "07:48",
		checkInMethod: "whatsapp",
	},
	{
		id: "e4",
		name: "Mandla Zulu",
		email: "mandla@company.co.za",
		role: "employee",
		department: "Operations",
		site: "Cape Town Branch",
		status: "absent",
	},
	{
		id: "e5",
		name: "Nokuthula Ndaba",
		email: "nokuthula@company.co.za",
		role: "employee",
		department: "Retail",
		site: "Durban Store",
		status: "present",
		clockIn: "08:00",
		checkInMethod: "qr",
	},
	{
		id: "e6",
		name: "Themba Shabalala",
		email: "themba@company.co.za",
		role: "employee",
		department: "Retail",
		site: "Durban Store",
		status: "on-leave",
	},
	{
		id: "e7",
		name: "Ayanda Ngcobo",
		email: "ayanda@company.co.za",
		role: "employee",
		department: "Construction",
		site: "Pretoria Site A",
		status: "present",
		clockIn: "06:30",
		checkInMethod: "biometric",
	},
	{
		id: "e8",
		name: "Palesa Mosia",
		email: "palesa@company.co.za",
		role: "employee",
		department: "Construction",
		site: "Pretoria Site A",
		status: "off-site",
	},
	{
		id: "e9",
		name: "Kagiso Motaung",
		email: "kagiso@company.co.za",
		role: "employee",
		department: "Warehouse",
		site: "Johannesburg HQ",
		status: "present",
		clockIn: "07:50",
		checkInMethod: "qr",
	},
	{
		id: "e10",
		name: "Nomsa Dube",
		email: "nomsa@company.co.za",
		role: "employee",
		department: "Admin",
		site: "Johannesburg HQ",
		status: "present",
		clockIn: "08:05",
		checkInMethod: "manual",
	},
]

export const attendanceRecords: AttendanceRecord[] = [
	{
		id: "a1",
		employeeId: "e1",
		employeeName: "Zanele Mthembu",
		date: "2026-03-11",
		clockIn: "07:55",
		clockOut: "17:02",
		hoursWorked: 9.1,
		overtime: 1.1,
		status: "present",
		method: "qr",
		site: "Johannesburg HQ",
		verified: true,
	},
	{
		id: "a2",
		employeeId: "e2",
		employeeName: "Bongani Khumalo",
		date: "2026-03-11",
		clockIn: "08:22",
		status: "late",
		method: "biometric",
		site: "Johannesburg HQ",
		verified: true,
	},
	{
		id: "a3",
		employeeId: "e3",
		employeeName: "Lerato Molefe",
		date: "2026-03-11",
		clockIn: "07:48",
		clockOut: "16:50",
		hoursWorked: 9.0,
		overtime: 1.0,
		status: "present",
		method: "whatsapp",
		site: "Cape Town Branch",
		verified: true,
	},
	{
		id: "a4",
		employeeId: "e4",
		employeeName: "Mandla Zulu",
		date: "2026-03-11",
		status: "absent",
		method: "manual",
		site: "Cape Town Branch",
		verified: false,
		clockIn: "",
	},
	{
		id: "a5",
		employeeId: "e5",
		employeeName: "Nokuthula Ndaba",
		date: "2026-03-11",
		clockIn: "08:00",
		status: "present",
		method: "qr",
		site: "Durban Store",
		verified: true,
	},
	{
		id: "a6",
		employeeId: "e7",
		employeeName: "Ayanda Ngcobo",
		date: "2026-03-11",
		clockIn: "06:30",
		clockOut: "15:30",
		hoursWorked: 9.0,
		overtime: 1.0,
		status: "present",
		method: "biometric",
		site: "Pretoria Site A",
		verified: true,
	},
	{
		id: "a7",
		employeeId: "e9",
		employeeName: "Kagiso Motaung",
		date: "2026-03-11",
		clockIn: "07:50",
		status: "present",
		method: "qr",
		site: "Johannesburg HQ",
		verified: true,
	},
	{
		id: "a8",
		employeeId: "e10",
		employeeName: "Nomsa Dube",
		date: "2026-03-11",
		clockIn: "08:05",
		status: "present",
		method: "manual",
		site: "Johannesburg HQ",
		verified: false,
	},
]

export const dashboardStats = {
	totalEmployees: 10,
	presentToday: 6,
	lateToday: 1,
	absentToday: 1,
	onLeave: 1,
	offSite: 1,
	avgHoursWorked: 8.5,
	overtimeHours: 3.1,
	complianceScore: 94,
}

export const sites = [
	"Johannesburg HQ",
	"Cape Town Branch",
	"Durban Store",
	"Pretoria Site A",
]

export const departments = [
	"Warehouse",
	"Operations",
	"Retail",
	"Construction",
	"Admin",
	"IT",
]
