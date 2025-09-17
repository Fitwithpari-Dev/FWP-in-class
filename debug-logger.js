// Autonomous Debug Logger - Writes browser errors to files
class DebugLogger {
    static logToFile(message, type = 'info') {
        // This would need a backend endpoint, but we can use localStorage for now
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            type,
            message,
            url: window.location.href
        });
        localStorage.setItem('debug_logs', JSON.stringify(logs.slice(-100))); // Keep last 100 logs

        // Also send to server endpoint if available
        fetch('/api/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, message, timestamp: new Date().toISOString() })
        }).catch(() => {}); // Fail silently if endpoint doesn't exist
    }

    static getStoredLogs() {
        return JSON.parse(localStorage.getItem('debug_logs') || '[]');
    }

    static clearLogs() {
        localStorage.removeItem('debug_logs');
    }
}

// Auto-capture all errors
window.addEventListener('error', (e) => {
    DebugLogger.logToFile(`Error: ${e.message} at ${e.filename}:${e.lineno}`, 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    DebugLogger.logToFile(`Unhandled Promise Rejection: ${e.reason}`, 'error');
});

// Override console methods to capture logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
    DebugLogger.logToFile(args.join(' '), 'log');
    originalLog.apply(console, args);
};

console.error = (...args) => {
    DebugLogger.logToFile(args.join(' '), 'error');
    originalError.apply(console, args);
};

console.warn = (...args) => {
    DebugLogger.logToFile(args.join(' '), 'warn');
    originalWarn.apply(console, args);
};

window.DebugLogger = DebugLogger;