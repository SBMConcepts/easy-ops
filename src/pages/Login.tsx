import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../components/ui/card"
import { toast } from "sonner"
import { LogIn, UserPlus } from "lucide-react"

const Login = () => {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [fullName, setFullName] = useState("")
	const [loading, setLoading] = useState(false)
	const [isSignup, setIsSignup] = useState(false)
	const { login, signup } = useAuth()
	const navigate = useNavigate()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		if (isSignup) {
			const success = await signup(email, password, fullName)
			setLoading(false)
			if (success) {
				toast.success(
					"Account created! Check your email to confirm, then sign in.",
				)
				setIsSignup(false)
			} else {
				toast.error("Sign up failed. Please try again.")
			}
		} else {
			const success = await login(email, password)
			setLoading(false)
			if (success) {
				toast.success("Welcome to EazyOps!")
				navigate("/app")
			} else {
				toast.error("Invalid credentials.")
			}
		}
	}

	return (
		<div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 geometric-pattern">
			<div className="w-full max-w-md space-y-6">
				<div className="flex flex-col items-center gap-3">
					{/* <img src={logo} alt="EazyOps" className="h-14 w-14 rounded-lg shadow-hero" /> */}
					<h1 className="font-display text-3xl font-bold text-primary-foreground">
						EazyOps
					</h1>
					<p className="text-primary-foreground/70 text-sm">
						Workforce Management Platform
					</p>
				</div>

				<Card className="shadow-hero border-0">
					<CardHeader className="text-center">
						<CardTitle className="font-display text-xl">
							{isSignup ? "Create Account" : "Sign In"}
						</CardTitle>
						<CardDescription>
							{isSignup ?
								"Fill in your details to get started"
							:	"Enter your credentials to continue"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{isSignup && (
								<div className="space-y-2">
									<Label htmlFor="fullName">Full Name</Label>
									<Input
										id="fullName"
										placeholder="e.g. Thabo Mokoena"
										value={fullName}
										onChange={(e) => setFullName(e.target.value)}
										required
									/>
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="name@company.co.za"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>
							<Button type="submit" className="w-full" disabled={loading}>
								{isSignup ?
									<UserPlus className="h-4 w-4 mr-2" />
								:	<LogIn className="h-4 w-4 mr-2" />}
								{isSignup ? "Sign Up" : "Sign In"}
							</Button>
						</form>

						<div className="mt-4 text-center">
							<button
								type="button"
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
								onClick={() => setIsSignup(!isSignup)}>
								{isSignup ?
									"Already have an account? Sign In"
								:	"Don't have an account? Sign Up"}
							</button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export default Login
