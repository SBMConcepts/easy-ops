import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'

const NotFound = () => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Error 404</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-muted-foreground">
          We couldn&apos;t find{' '}
          <code className="break-all rounded bg-background px-1.5 py-0.5 text-sm">
            {location.pathname}
          </code>
          . It may have been moved, or the link may be incorrect.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => navigate('/')}>Return to Home</Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Need help?{' '}
          <Link to="/contact" className="text-primary underline hover:text-primary/90">
            Contact us
          </Link>
        </p>
      </div>
    </main>
  )
}

export default NotFound
