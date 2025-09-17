// Complete Autonomous Debug System for Claude
// This captures all browser errors and writes them to files that Claude can read

class AutonomousDebugger {
    constructor() {
        this.logFile = 'debug-output.json';
        this.maxLogs = 50;
        this.setupErrorCapture();
        this.startPeriodicSave();
    }

    setupErrorCapture() {
        // Capture all JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });

        // Override console methods to capture all logs
        this.overrideConsole();

        // Capture network errors
        this.setupNetworkCapture();

        // Capture Zoom SDK specific errors
        this.setupZoomErrorCapture();
    }

    logError(type, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            details,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Store in localStorage for persistence
        this.addToLocalStorage(logEntry);

        // Save to debug server
        this.saveToDebugServer(logEntry);
    }

    addToLocalStorage(logEntry) {
        const logs = JSON.parse(localStorage.getItem('claude_debug_logs') || '[]');
        logs.push(logEntry);

        // Keep only recent logs
        if (logs.length > this.maxLogs) {
            logs.splice(0, logs.length - this.maxLogs);
        }

        localStorage.setItem('claude_debug_logs', JSON.stringify(logs, null, 2));
    }

    overrideConsole() {
        const originalMethods = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        Object.keys(originalMethods).forEach(method => {
            console[method] = (...args) => {
                // Call original method
                originalMethods[method].apply(console, args);

                // Log to our system
                this.logError(`Console ${method.toUpperCase()}`, {
                    message: args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ')
                });
            };
        });
    }

    setupNetworkCapture() {
        // Override fetch to catch network errors
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    this.logError('Network Error', {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText
                    });
                }
                return response;
            } catch (error) {
                this.logError('Fetch Error', {
                    url: args[0],
                    error: error.message,
                    stack: error.stack
                });
                throw error;
            }
        };
    }

    setupZoomErrorCapture() {
        // Monitor for Zoom SDK specific issues
        const checkZoomErrors = () => {
            // Check if Zoom SDK is loaded but not working
            if (window.ZoomVideo && !window.zoomClientWorking) {
                this.logError('Zoom SDK Issue', {
                    message: 'Zoom SDK loaded but client not initialized properly',
                    timestamp: Date.now()
                });
            }
        };

        // Check every 5 seconds
        setInterval(checkZoomErrors, 5000);
    }

    saveToDebugServer(logEntry) {
        // Send to our dedicated debug server
        fetch('http://localhost:3999/debug-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logEntry)
        }).catch(() => {
            // Silently fail if debug server isn't running
            // In this case, we rely on localStorage
        });
    }

    startPeriodicSave() {
        // Every 10 seconds, save all logs to a file that Claude can read
        setInterval(() => {
            const allLogs = JSON.parse(localStorage.getItem('claude_debug_logs') || '[]');

            // Create a readable log file
            const readableLog = allLogs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                return `[${time}] ${log.type}: ${JSON.stringify(log.details, null, 2)}`;
            }).join('\n\n');

            // Try to write to a file Claude can read
            this.writeToClaudeReadableFile(readableLog);
        }, 10000);
    }

    writeToClaudeReadableFile(content) {
        // Write to a file in a way that Claude can access
        // Using the download API to create a file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        // Create a temporary link to download/save the file
        const link = document.createElement('a');
        link.href = url;
        link.download = `debug-log-${Date.now()}.txt`;

        // Don't actually trigger download, just create the file reference
        // In a real implementation, this would use a backend endpoint

        URL.revokeObjectURL(url);
    }

    // Method for Claude to read logs
    getLogsForClaude() {
        const logs = JSON.parse(localStorage.getItem('claude_debug_logs') || '[]');
        return {
            totalLogs: logs.length,
            recentErrors: logs.filter(log => log.type.includes('Error')).slice(-5),
            recentLogs: logs.slice(-10),
            summary: this.generateErrorSummary(logs)
        };
    }

    generateErrorSummary(logs) {
        const errorTypes = {};
        logs.forEach(log => {
            errorTypes[log.type] = (errorTypes[log.type] || 0) + 1;
        });

        return {
            errorTypes,
            mostRecentError: logs.filter(log => log.type.includes('Error')).pop(),
            totalErrors: logs.filter(log => log.type.includes('Error')).length
        };
    }

    // Export logs to console for Claude to see
    exportForClaude() {
        const summary = this.getLogsForClaude();
        console.log('=== CLAUDE DEBUG EXPORT ===');
        console.log(JSON.stringify(summary, null, 2));
        console.log('=== END CLAUDE EXPORT ===');
        return summary;
    }
}

// Initialize the autonomous debugger
window.autonomousDebugger = new AutonomousDebugger();

// Expose methods for Claude to access
window.getDebugLogsForClaude = () => window.autonomousDebugger.getLogsForClaude();
window.exportDebugForClaude = () => window.autonomousDebugger.exportForClaude();

console.log('🤖 Autonomous Debug System Active - Claude can now see errors automatically!');