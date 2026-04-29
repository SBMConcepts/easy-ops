import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card'
import { toast } from 'sonner'
import { LogIn, UserPlus } from 'lucide-react'
import '../styles/loginpage.css'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignup, setIsSignup] = useState(false)
    const { login, signup } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (isSignup) {
                const success = await signup(email, password, fullName)
                if (success) {
                    toast.success(
                        'Account created! Check your email to confirm, then sign in.'
                    )
                    setIsSignup(false)
                } else {
                    toast.error('Sign up failed. Please try again.')
                }
            } else {
                const success = await login(email, password)
                if (success) {
                    toast.success('Welcome to EasyOps!')
                    navigate('/app')
                } else {
                    toast.error('Invalid credentials.')
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const toggleMode = () => setIsSignup((prev) => !prev)

    return (
        <div className="login-page">
            <div className="login-content-column">
                <div className="login-brand-block">
                    <h1 className="login-brand-title">EasyOps</h1>
                    <p className="login-brand-subtitle">
                        Workforce Management Platform
                    </p>
                </div>

                <Card className="login-card">
                    <CardHeader className="login-card-header">
                        <CardTitle className="login-card-title">
                            {isSignup ? 'Create Account' : 'Sign In'}
                        </CardTitle>
                        <CardDescription className="login-card-description">
                            {isSignup
                                ? 'Fill in your details to get started'
                                : 'Enter your credentials to continue'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="login-form">
                            {isSignup && (
                                <div className="login-field-group">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="e.g. Thabo Mokoena"
                                        value={fullName}
                                        onChange={(e) =>
                                            setFullName(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                            )}

                            <div className="login-field-group">
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

                            <div className="login-field-group">
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

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {isSignup ? (
                                    <UserPlus className="h-4 w-4 mr-2" />
                                ) : (
                                    <LogIn className="h-4 w-4 mr-2" />
                                )}
                                {isSignup ? 'Sign Up' : 'Sign In'}
                            </Button>
                        </form>

                        <div className="login-toggle-row">
                            <button
                                type="button"
                                className="login-toggle-button"
                                onClick={toggleMode}
                            >
                                {isSignup
                                    ? 'Already have an account? Sign In'
                                    : "Don't have an account? Sign Up"}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default LoginPage
