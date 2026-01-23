import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
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
        console.error('Error caught by boundary:', error, errorInfo);
        // In production, send to error tracking service
    }

    handleRefresh = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--bg-color, #1a1a1a)',
                    color: 'var(--text-primary, #fff)'
                }}>
                    <h1 style={{ marginBottom: '1rem', color: 'hsl(340, 70%, 60%)' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: 'var(--text-secondary, #888)', marginBottom: '1.5rem' }}>
                        An unexpected error occurred. Please try refreshing the page.
                    </p>
                    {this.state.error && (
                        <pre style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.8rem',
                            maxWidth: '600px',
                            overflow: 'auto',
                            marginBottom: '1.5rem'
                        }}>
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        onClick={this.handleRefresh}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'hsl(250, 80%, 60%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
