/**
 * Fresh Zoom Video SDK JWT Token Generation Lambda
 * Completely rewritten for production reliability
 */

const crypto = require('crypto');

// Zoom SDK Configuration - Using production credentials
const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY || 'Hfg9TGvcT5LutNnUGETcmoswIXNeCxHJsVm6';
const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET || 'GYcKilkH05kkorqhqUFwrh1a4GEofW2s0SC4';

/**
 * Generate JWT token for Zoom Video SDK
 */
function generateZoomToken(payload) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (2 * 60 * 60); // 2 hours from now

    const jwtPayload = {
        iss: ZOOM_SDK_KEY,
        alg: 'HS256',
        aud: 'zoom',
        appKey: ZOOM_SDK_KEY,
        tokenExp: exp,
        sessionName: payload.sessionName,
        userIdentity: payload.userIdentity,
        sessionKey: payload.sessionKey || '',
        role: payload.role === 'host' ? 1 : 0, // 1 = host, 0 = participant
        iat: now,
        exp: exp
    };

    // Base64 encode header and payload
    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(jwtPayload));

    // Create signature
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', ZOOM_SDK_SECRET)
        .update(signingInput)
        .digest('base64url');

    return `${signingInput}.${signature}`;
}

/**
 * Base64 URL encode
 */
function base64urlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * CORS headers for all responses
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('🚀 Fresh Zoom Token Handler - Event:', JSON.stringify(event, null, 2));

    try {
        // Handle CORS preflight
        if (event.requestContext?.http?.method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }

        // Parse request body
        let requestBody;
        try {
            requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid JSON in request body',
                    details: parseError.message
                })
            };
        }

        // Validate required fields
        const { sessionName, userIdentity, role, sessionKey } = requestBody;

        if (!sessionName || !userIdentity || !role) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Missing required fields',
                    required: ['sessionName', 'userIdentity', 'role'],
                    received: requestBody
                })
            };
        }

        // Validate role
        if (!['host', 'participant'].includes(role)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid role',
                    expected: ['host', 'participant'],
                    received: role
                })
            };
        }

        // Check for required environment variables
        if (!ZOOM_SDK_KEY || ZOOM_SDK_KEY === 'YOUR_ZOOM_SDK_KEY') {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Zoom SDK Key not configured',
                    message: 'Please set ZOOM_SDK_KEY environment variable'
                })
            };
        }

        if (!ZOOM_SDK_SECRET || ZOOM_SDK_SECRET === 'YOUR_ZOOM_SDK_SECRET') {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Zoom SDK Secret not configured',
                    message: 'Please set ZOOM_SDK_SECRET environment variable'
                })
            };
        }

        // Generate JWT token
        console.log('🔐 Generating JWT token for:', {
            sessionName,
            userIdentity,
            role,
            sessionKey: sessionKey ? '[SET]' : '[EMPTY]'
        });

        const signature = generateZoomToken({
            sessionName,
            userIdentity,
            role,
            sessionKey
        });

        const response = {
            signature,
            sdkKey: ZOOM_SDK_KEY,
            sessionName,
            userIdentity,
            role,
            generated: new Date().toISOString(),
            expiresIn: '2 hours'
        };

        console.log('✅ Token generated successfully for user:', userIdentity);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('❌ Lambda execution error:', error);

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * Test function for local development
 */
if (require.main === module) {
    const testEvent = {
        requestContext: { http: { method: 'POST' } },
        body: JSON.stringify({
            sessionName: 'test-fitness-session',
            userIdentity: 'test-coach',
            role: 'host',
            sessionKey: 'test-key'
        })
    };

    exports.handler(testEvent).then(result => {
        console.log('Test result:', JSON.stringify(result, null, 2));
    }).catch(error => {
        console.error('Test error:', error);
    });
}