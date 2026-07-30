import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface NotFoundProps {
  onGoHome?: () => void;
  message?: string;
}

export function NotFound({ onGoHome, message }: NotFoundProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-3">🔍</div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {message || "The page you're looking for doesn't exist or has been moved."}
          </p>
          <div className="mt-4 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            Try checking the URL or use the navigation menu to find what you need.
          </div>
        </CardContent>
        <CardFooter className="justify-center gap-2">
          {onGoHome && (
            <Button variant="gold" onClick={onGoHome}>
              🏠 Go to Dashboard
            </Button>
          )}
          <Button variant="outline" onClick={() => window.history.back()}>
            ← Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
