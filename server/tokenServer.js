/**
 * Sample Backend Server for Zoom Video SDK Token Generation
 *
 * This is a simple Express server that generates JWT tokens for Zoom Video SDK
 * Run this server separately from your React app in production
 *
 * Installation:
 * npm install express cors jsonwebtoken dotenv
 *
 * Usage:
 * node server/tokenServer.js
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Generate Zoom Video SDK JWT Token
 * POST /api/zoom/token
 *
 * Body:
 * {
 *   sessionName: string,
 *   role: number (1 for host, 0 for participant),
 *   sessionKey: string,
 *   userIdentity: string
 * }
 */
app.post('/api/zoom/token', (req, res) => {
  try {
    const { sessionName, role, sessionKey, userIdentity } = req.body;

    // Validate input
    if (!sessionName || role === undefined || !sessionKey || !userIdentity) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['sessionName', 'role', 'sessionKey', 'userIdentity']
      });
    }

    // Validate role
    if (role !== 0 && role !== 1) {
      return res.status(400).json({
        error: 'Invalid role. Must be 0 (participant) or 1 (host)'
      });
    }

    // Check for SDK credentials
    const SDK_KEY = process.env.VITE_ZOOM_SDK_KEY || process.env.ZOOM_SDK_KEY;
    const SDK_SECRET = process.env.VITE_ZOOM_SDK_SECRET || process.env.ZOOM_SDK_SECRET;

    if (!SDK_KEY || !SDK_SECRET) {
      console.error('Zoom SDK credentials not configured');
      return res.status(500).json({
        error: 'Server configuration error. Please contact support.'
      });
    }

    // Generate token payload
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
      exp: exp,
      // Optional: Add additional claims for your application
      // custom_data: {
      //   fitness_level: req.body.fitnessLevel,
      //   is_coach: role === 1
      // }
    };

    // Sign the token
    const token = jwt.sign(payload, SDK_SECRET, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT'
      }
    });

    // Log token generation (for monitoring)
    console.log(`Token generated for user: ${userIdentity}, session: ${sessionName}, role: ${role === 1 ? 'host' : 'participant'}`);

    // Return the token
    res.json({
      token: token,
      expires_at: exp,
      session_info: {
        name: sessionName,
        user: userIdentity,
        is_host: role === 1
      }
    });

  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate token',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Validate a token (optional endpoint for debugging)
 * POST /api/zoom/validate
 */
app.post('/api/zoom/validate', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const SDK_SECRET = process.env.VITE_ZOOM_SDK_SECRET || process.env.ZOOM_SDK_SECRET;

    // Verify and decode the token
    const decoded = jwt.verify(token, SDK_SECRET, {
      algorithms: ['HS256']
    });

    res.json({
      valid: true,
      decoded: decoded,
      expires_in: decoded.exp - Math.floor(Date.now() / 1000)
    });

  } catch (error) {
    res.json({
      valid: false,
      error: error.message
    });
  }
});

/**
 * Get session configuration (optional)
 * GET /api/zoom/config
 */
app.get('/api/zoom/config', (req, res) => {
  // Return public configuration (never include secrets)
  res.json({
    features: {
      maxParticipants: 100,
      recordingEnabled: true,
      screenShareEnabled: true,
      chatEnabled: true,
    },
    limits: {
      sessionDuration: 90, // minutes
      maxVideos: 25,
    },
    // Session recovery
    sessionRecovery: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 2000
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
    🚀 Zoom Token Server is running!

    Environment: ${process.env.NODE_ENV || 'development'}
    Port: ${PORT}

    Endpoints:
    - POST /api/zoom/token    Generate JWT token
    - POST /api/zoom/validate Validate token (debug)
    - GET  /api/zoom/config   Get public configuration
    - GET  /health           Health check

    Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}

    ${!process.env.VITE_ZOOM_SDK_KEY ? '⚠️  Warning: VITE_ZOOM_SDK_KEY not set in environment' : '✅ SDK Key configured'}
    ${!process.env.VITE_ZOOM_SDK_SECRET ? '⚠️  Warning: VITE_ZOOM_SDK_SECRET not set in environment' : '✅ SDK Secret configured'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});