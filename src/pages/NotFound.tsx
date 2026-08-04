/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

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
          <div className="w-16 h-16 rounded-xl bg-surface-warm flex items-center justify-center mx-auto mb-3 text-3xl">🔍</div>
          <CardTitle className="text-2xl font-heading">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {message || "The page you're looking for doesn't exist or has been moved."}
          </p>
          <div className="mt-4 text-xs rounded-xl p-3" style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)' }}>
            Try checking the URL or use the navigation menu to find what you need.
          </div>
        </CardContent>
        <CardFooter className="justify-center gap-2">
          {onGoHome && (
            <Button variant="gold" onClick={onGoHome}>🏠 Go to Dashboard</Button>
          )}
          <Button variant="outline" onClick={() => window.history.back()}>← Go Back</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
