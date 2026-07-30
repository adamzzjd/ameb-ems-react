import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="text-5xl mb-2">⚠️</div>
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                An unexpected error occurred. Please try again.
              </p>
              <details className="text-xs text-left text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <summary className="cursor-pointer font-medium mb-1">Error details</summary>
                {this.state.error?.message || 'Unknown error'}
              </details>
            </CardContent>
            <CardFooter className="justify-center gap-2">
              <Button variant="gold" onClick={this.handleRetry}>
                🔄 Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Go to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
