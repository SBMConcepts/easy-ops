import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { KeyRound } from "lucide-react"

const ResetPassword = () => {
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [loading, setLoading] = useState(false)
    const [ready, setReady] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Supabase auto-handles the recovery / invite token in the URL hash.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setReady(true)
            }
        })
        // If already signed in (invite link landed user), allow setting password.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true)
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.")
            return
        }
        if (password !== confirm) {
            toast.error("Passwords do not match.")
            return
        }
        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)
        if (error) {
            toast.error(error.message || "Could not update password.")
            return
        }
        toast.success("Password set! Redirecting…")
        navigate("/app")
    }

    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 geometric-pattern">
            <div className="w-full max-w-md space-y-6">
                <div className="flex flex-col items-center gap-3">
                    <h1 className="font-display text-3xl font-bold text-primary-foreground">
                        EazyOps
                    </h1>
                </div>

                <Card className="shadow-hero border-0">
                    <CardHeader className="text-center">
                        <CardTitle className="font-display text-xl">
                            Set Your Password
                        </CardTitle>
                        <CardDescription>
                            {ready
                                ? "Choose a strong password to access the EazyOps app."
                                : "Verifying your invitation link…"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    disabled={!ready}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="confirm"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    disabled={!ready}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !ready}
                            >
                                <KeyRound className="h-4 w-4 mr-2" />
                                {loading ? "Saving…" : "Set Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default ResetPassword
