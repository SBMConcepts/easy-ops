import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../integrations/supabase/client"
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
import { LogIn, ArrowLeft } from "lucide-react"
import logo from "../assets/logo.png"

const Login = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [forgot, setForgot] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (forgot) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            setLoading(false)
            if (error) {
                toast.error("Could not send reset email. Please try again.")
            } else {
                toast.success("Password reset link sent. Check your inbox.")
                setForgot(false)
            }
            return
        }

        const success = await login(email, password)
        setLoading(false)
        if (success) {
            toast.success("Welcome to EazyOps!")
            navigate("/app")
        } else {
            toast.error("Invalid credentials.")
        }
    }

    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 geometric-pattern">
            <div className="w-full max-w-md space-y-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground text-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to website
                </Link>

                <div className="flex flex-col items-center gap-3">
                    <img
                        src={logo}
                        alt="EazyOps"
                        className="h-14 w-14 rounded-lg shadow-hero"
                    />
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
                            {forgot ? "Reset Password" : "Sign In"}
                        </CardTitle>
                        <CardDescription>
                            {forgot
                                ? "Enter your email to receive a reset link"
                                : "Enter your credentials to continue"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name..company.co.za"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            {!forgot && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                <LogIn className="h-4 w-4 mr-2" />
                                {forgot ? "Send Reset Link" : "Sign In"}
                            </Button>
                        </form>

                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setForgot(!forgot)}
                            >
                                {forgot
                                    ? "Back to Sign In"
                                    : "Forgot password?"}
                            </button>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border text-center">
                            <p className="text-xs text-muted-foreground">
                                EazyOps is invite-only. Companies are onboarded
                                by an EazyOps administrator. Employees receive
                                an invitation email from their company admin.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Login
