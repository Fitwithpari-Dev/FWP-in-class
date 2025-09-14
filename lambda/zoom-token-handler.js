/**
 * AWS Lambda Function for Zoom Video SDK Token Generation
 *
 * This Lambda function replaces the Express server for production deployment
 * Optimized for AWS API Gateway integration with proper error handling
 */

const jwt = require('jsonwebtoken');

// CORS headers for API Gateway
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Configure specific domain in production
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  'Content-Type': 'application/json'
};

// Response helper function
const createResponse = (statusCode, body, additionalHeaders = {}) => {
  return {
    statusCode,
    headers: { ...corsHeaders, ...additionalHeaders },
    body: JSON.stringify(body)
  };
};

// Main Lambda handler
exports.handler = async (event, context) => {
  console.log('Lambda function invoked:', {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId
  });

  try {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }

    // Route based on path
    const path = event.path || event.rawPath;

    if (path.includes('/health')) {
      return await handleHealthCheck(event);
    } else if (path.includes('/token')) {
      return await handleTokenGeneration(event);
    } else if (path.includes('/validate')) {
      return await handleTokenValidation(event);
    } else if (path.includes('/config')) {
      return await handleConfigRequest(event);
    } else {
      return createResponse(404, {
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    }

  } catch (error) {
    console.error('Lambda execution error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      requestId: context.awsRequestId
    });
  }
};

// Health check handler
async function handleHealthCheck(event) {
  return createResponse(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
}

// Token generation handler
async function handleTokenGeneration(event) {
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      error: 'Method Not Allowed',
      message: 'Only POST method is allowed'
    });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    return createResponse(400, {
      error: 'Invalid JSON',
      message: 'Request body must be valid JSON'
    });
  }

  const { sessionName, role, sessionKey, userIdentity } = requestBody;

  // Validate required parameters
  if (!sessionName || role === undefined || !sessionKey || !userIdentity) {
    return createResponse(400, {
      error: 'Missing required parameters',
      required: ['sessionName', 'role', 'sessionKey', 'userIdentity'],
      received: Object.keys(requestBody)
    });
  }

  // Validate role
  if (role !== 0 && role !== 1) {
    return createResponse(400, {
      error: 'Invalid role',
      message: 'Role must be 0 (participant) or 1 (host)'
    });
  }

  // Get SDK credentials from environment variables
  const SDK_KEY = process.env.ZOOM_SDK_KEY;
  const SDK_SECRET = process.env.ZOOM_SDK_SECRET;

  if (!SDK_KEY || !SDK_SECRET) {
    console.error('Missing Zoom SDK credentials in environment variables');
    return createResponse(500, {
      error: 'Server Configuration Error',
      message: 'Zoom SDK credentials not configured. Please contact support.'
    });
  }

  try {
    // Generate JWT token
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // Token expires in 2 hours

    const payload = {
      app_key: SDK_KEY,
      version: 1,
      tpc: sessionName,
      role_type: role,
      user_identity: userIdentity,
      session_key: sessionKey,
      iat: iat,
      exp: exp
    };

    const token = jwt.sign(payload, SDK_SECRET, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT'
      }
    });

    // Log token generation for monitoring
    console.log('Token generated successfully:', {
      user: userIdentity,
      session: sessionName,
      role: role === 1 ? 'host' : 'participant',
      expiresAt: new Date(exp * 1000).toISOString()
    });

    return createResponse(200, {
      token: token,
      expires_at: exp,
      session_info: {
        name: sessionName,
        user: userIdentity,
        is_host: role === 1
      }
    });

  } catch (error) {
    console.error('Token generation failed:', error);
    return createResponse(500, {
      error: 'Token Generation Failed',
      message: 'Unable to generate JWT token'
    });
  }
}

// Token validation handler (for debugging)
async function handleTokenValidation(event) {
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      error: 'Method Not Allowed',
      message: 'Only POST method is allowed'
    });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    return createResponse(400, {
      error: 'Invalid JSON',
      message: 'Request body must be valid JSON'
    });
  }

  const { token } = requestBody;

  if (!token) {
    return createResponse(400, {
      error: 'Missing Token',
      message: 'Token is required for validation'
    });
  }

  const SDK_SECRET = process.env.ZOOM_SDK_SECRET;

  if (!SDK_SECRET) {
    return createResponse(500, {
      error: 'Server Configuration Error',
      message: 'Unable to validate token due to missing configuration'
    });
  }

  try {
    const decoded = jwt.verify(token, SDK_SECRET, {
      algorithms: ['HS256']
    });

    return createResponse(200, {
      valid: true,
      decoded: decoded,
      expires_in: decoded.exp - Math.floor(Date.now() / 1000)
    });

  } catch (error) {
    return createResponse(200, {
      valid: false,
      error: error.message,
      code: error.name
    });
  }
}

// Configuration handler
async function handleConfigRequest(event) {
  if (event.httpMethod !== 'GET') {
    return createResponse(405, {
      error: 'Method Not Allowed',
      message: 'Only GET method is allowed'
    });
  }

  return createResponse(200, {
    features: {
      maxParticipants: 100,
      recordingEnabled: true,
      screenShareEnabled: true,
      chatEnabled: true,
      videoPlatformOptimized: true
    },
    limits: {
      sessionDuration: 90, // minutes
      maxVideos: 25,
      maxAudioStreams: 50
    },
    sessionRecovery: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 2000
    },
    videoOptimization: {
      adaptiveBitrate: true,
      qualityLevels: ['720p', '480p', '360p'],
      compressionEnabled: true
    }
  });
}