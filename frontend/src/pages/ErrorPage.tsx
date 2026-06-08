import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { reset?: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-8xl font-extrabold text-(--c-accent)">Oops</p>
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        An unexpected error occurred. Please try again or head back home.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {reset && <Button onClick={reset}>Try again</Button>}
        <Button asChild variant="outline">
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    </div>
  );
}
