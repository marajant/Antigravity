import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/ui/Button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground space-y-6 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full"></div>
                        <AlertTriangle className="h-20 w-20 text-destructive relative z-10" />
                    </div>

                    <div className="max-w-md space-y-2">
                        <h1 className="text-2xl font-bold">Something went wrong</h1>
                        <p className="text-muted-foreground">
                            We encountered an unexpected error. Your data is safe locally.
                        </p>
                        {this.state.error && (
                            <div className="p-4 bg-muted/30 rounded-md text-xs font-mono text-left overflow-auto max-h-32 border border-border">
                                {this.state.error.toString()}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reload Application
                        </Button>
                        <Button variant="outline" onClick={() => localStorage.clear()} className="text-destructive hover:bg-destructive/10">
                            Reset Local Storage (Emergency)
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
