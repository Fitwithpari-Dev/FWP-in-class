// Simple debug server that receives browser logs and writes them to files
// Run with: node debug-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const DEBUG_LOG_FILE = path.join(__dirname, 'browser-debug-logs.json');
const PORT = 3999;

// Ensure debug log file exists
if (!fs.existsSync(DEBUG_LOG_FILE)) {
    fs.writeFileSync(DEBUG_LOG_FILE, JSON.stringify([], null, 2));
}

const server = http.createServer((req, res) => {
    // Enable CORS for browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/debug-log') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const logEntry = JSON.parse(body);

                // Read existing logs
                const existingLogs = JSON.parse(fs.readFileSync(DEBUG_LOG_FILE, 'utf8'));

                // Add new log entry
                existingLogs.push({
                    ...logEntry,
                    receivedAt: new Date().toISOString()
                });

                // Keep only last 100 logs
                if (existingLogs.length > 100) {
                    existingLogs.splice(0, existingLogs.length - 100);
                }

                // Write back to file
                fs.writeFileSync(DEBUG_LOG_FILE, JSON.stringify(existingLogs, null, 2));

                console.log(`[${new Date().toLocaleTimeString()}] Received debug log:`, logEntry.type);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

            } catch (error) {
                console.error('Error processing debug log:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });

    } else if (req.method === 'GET' && req.url === '/debug-logs') {
        // Endpoint for Claude to read logs
        try {
            const logs = JSON.parse(fs.readFileSync(DEBUG_LOG_FILE, 'utf8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(logs, null, 2));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Could not read logs' }));
        }

    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🤖 Autonomous Debug Server running on http://localhost:${PORT}`);
    console.log(`📝 Debug logs will be written to: ${DEBUG_LOG_FILE}`);
    console.log(`🔍 Claude can read logs at: http://localhost:${PORT}/debug-logs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Debug server shutting down...');
    server.close();
});

process.on('SIGINT', () => {
    console.log('🛑 Debug server shutting down...');
    server.close();
    process.exit(0);
});