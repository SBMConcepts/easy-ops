import { useState } from "react"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "sonner"
import {
	QrCode,
	Fingerprint,
	MessageCircle,
	MapPin,
	Clock,
	CheckCircle2,
} from "lucide-react"

type CheckInMethod = "qr" | "biometric" | "whatsapp"

const CheckIn = () => {
	const { user } = useAuth()
	const [isClockedIn, setIsClockedIn] = useState(false)
	const [clockInTime, setClockInTime] = useState<string | null>(null)
	const [selectedMethod, setSelectedMethod] = useState<CheckInMethod>("qr")

	const handleClockIn = () => {
		const now = new Date()
		const timeStr = now.toLocaleTimeString("en-ZA", {
			hour: "2-digit",
			minute: "2-digit",
		})
		setIsClockedIn(true)
		setClockInTime(timeStr)
		toast.success(
			`Clocked in at ${timeStr} via ${selectedMethod.toUpperCase()}`,
		)
	}

	const handleClockOut = () => {
		const now = new Date()
		const timeStr = now.toLocaleTimeString("en-ZA", {
			hour: "2-digit",
			minute: "2-digit",
		})
		setIsClockedIn(false)
		toast.success(`Clocked out at ${timeStr}`)
		setClockInTime(null)
	}

	const methods = [
		{
			id: "qr" as const,
			label: "QR Code",
			icon: QrCode,
			desc: "Scan workplace QR code",
		},
		{
			id: "biometric" as const,
			label: "Biometric",
			icon: Fingerprint,
			desc: "Fingerprint verification",
		},
		{
			id: "whatsapp" as const,
			label: "WhatsApp",
			icon: MessageCircle,
			desc: "Chat-based check-in",
		},
	]

	return (
		<div className="space-y-6 max-w-2xl mx-auto">
			<div className="text-center">
				<h1 className="font-display text-2xl font-bold text-foreground">
					Attendance Check-In
				</h1>
				<p className="text-muted-foreground text-sm mt-1">
					{user?.name} ·{" "}
					{new Date().toLocaleDateString("en-ZA", {
						weekday: "long",
						day: "numeric",
						month: "long",
						year: "numeric",
					})}
				</p>
			</div>

			{/* Current Status */}
			<Card
				className={`shadow-card border-2 ${isClockedIn ? "border-secondary" : "border-border"}`}>
				<CardContent className="p-6 text-center">
					{isClockedIn ?
						<div className="space-y-3">
							<CheckCircle2 className="h-12 w-12 text-secondary mx-auto" />
							<p className="font-display text-xl font-bold text-foreground">
								You are clocked in
							</p>
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Clock className="h-4 w-4" />
								<span>Since {clockInTime}</span>
								<span>·</span>
								<MapPin className="h-4 w-4" />
								<span>Johannesburg HQ</span>
							</div>
							<Badge
								className="bg-secondary/10 text-secondary border-secondary/20"
								variant="outline">
								{selectedMethod.toUpperCase()} verified
							</Badge>
						</div>
					:	<div className="space-y-3">
							<Clock className="h-12 w-12 text-muted-foreground mx-auto" />
							<p className="font-display text-xl font-bold text-foreground">
								Not clocked in
							</p>
							<p className="text-sm text-muted-foreground">
								Select a method and clock in below
							</p>
						</div>
					}
				</CardContent>
			</Card>

			{/* Method Selection */}
			<div className="grid grid-cols-3 gap-3">
				{methods.map((method) => (
					<button
						key={method.id}
						onClick={() => setSelectedMethod(method.id)}
						className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
							selectedMethod === method.id ?
								"border-secondary bg-secondary/5"
							:	"border-border hover:border-muted-foreground/30"
						}`}>
						<method.icon
							className={`h-8 w-8 ${selectedMethod === method.id ? "text-secondary" : "text-muted-foreground"}`}
						/>
						<span className="text-sm font-medium text-foreground">
							{method.label}
						</span>
						<span className="text-xs text-muted-foreground text-center">
							{method.desc}
						</span>
					</button>
				))}
			</div>

			{/* QR Code Display (when QR method selected) */}
			{selectedMethod === "qr" && !isClockedIn && (
				<Card className="shadow-card">
					<CardHeader className="text-center">
						<CardTitle className="font-display text-lg">Scan QR Code</CardTitle>
						<CardDescription>
							Point your camera at the workplace QR code, or tap the button to
							simulate
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
							<QrCode className="h-24 w-24 text-muted-foreground/50" />
						</div>
					</CardContent>
				</Card>
			)}

			{selectedMethod === "biometric" && !isClockedIn && (
				<Card className="shadow-card">
					<CardHeader className="text-center">
						<CardTitle className="font-display text-lg">
							Biometric Verification
						</CardTitle>
						<CardDescription>
							Place your finger on the scanner to verify identity
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border animate-pulse-soft">
							<Fingerprint className="h-16 w-16 text-muted-foreground/50" />
						</div>
					</CardContent>
				</Card>
			)}

			{selectedMethod === "whatsapp" && !isClockedIn && (
				<Card className="shadow-card">
					<CardHeader className="text-center">
						<CardTitle className="font-display text-lg">
							WhatsApp Check-In
						</CardTitle>
						<CardDescription>
							Send "CHECK IN" to +27 XX XXX XXXX or tap the button below
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<div className="w-32 h-32 rounded-full bg-secondary/10 flex items-center justify-center">
							<MessageCircle className="h-16 w-16 text-secondary" />
						</div>
					</CardContent>
				</Card>
			)}

			{/* Action Button */}
			<div className="flex justify-center">
				{isClockedIn ?
					<Button
						size="lg"
						variant="destructive"
						className="w-full max-w-xs text-lg py-6"
						onClick={handleClockOut}>
						<Clock className="h-5 w-5 mr-2" />
						Clock Out
					</Button>
				:	<Button
						size="lg"
						className="w-full max-w-xs text-lg py-6 bg-secondary hover:bg-secondary/90"
						onClick={handleClockIn}>
						<CheckCircle2 className="h-5 w-5 mr-2" />
						Clock In
					</Button>
				}
			</div>
		</div>
	)
}

export default CheckIn
