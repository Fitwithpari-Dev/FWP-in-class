# FitWithPari - Live Fitness Platform with Zoom Video SDK

## Project Overview
A real-time fitness platform built with React + TypeScript + Vite, integrated with Zoom Video SDK for live video sessions, Supabase for backend services, and deployed on AWS Amplify.

**IMPORTANT**: This is a production fitness platform using real Zoom Video SDK integration, not mock data.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Video**: Zoom Video SDK (real-time video streaming for 50+ participants)
- **Backend**: Supabase (authentication, database) + AWS Lambda (Zoom token generation)
- **Deployment**: AWS Amplify Gen2 + CloudFront (Mumbai region: ap-south-1)
- **Domain**: classes.tribe.fit (production)

## Essential Commands

### Development
```bash
npm install                 # Install dependencies
npm run dev                # Start dev server (localhost:3000)
npm run build              # Build for production
npm run typecheck          # Run TypeScript checks
npm run lint               # Run ESLint
```

### Deployment
```bash
git add . && git commit -m "message"  # Commit changes
git push origin master               # Deploy to AWS Amplify automatically
```

### Lambda Functions (Zoom Token Service)
```bash
cd lambda
npm install                         # Install Lambda dependencies
aws lambda update-function-code --function-name fitwithpari-zoom-token-staging --zip-file fileb://function.zip --region ap-south-1
```

## Environment Variables (.env)
**CRITICAL**: These must be configured for real Zoom sessions:

```bash
# Zoom Video SDK (Required for real sessions)
VITE_ZOOM_SDK_KEY=your_zoom_sdk_key
VITE_ZOOM_SDK_SECRET=your_zoom_sdk_secret
VITE_ZOOM_TOKEN_ENDPOINT=https://your-lambda-url.lambda-url.ap-south-1.on.aws

# Supabase (Backend services)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Session Configuration
VITE_DEFAULT_SESSION_NAME=fitwithpari-session
VITE_SESSION_PASSWORD=your_session_password
```

## Zoom Video SDK Integration

### Core Components
- `src/services/zoomSDKService.ts` - Main SDK service wrapper
- `src/services/tokenService.ts` - JWT token generation/validation
- `src/hooks/useZoomFitnessPlatform.ts` - React hook for Zoom integration
- `lambda/zoom-token-handler.js` - AWS Lambda token generation endpoint

### Session Lifecycle
1. **Join Session**: User selects role (coach/student) → JWT token generated → Zoom session joined
2. **Real-time Events**: Video/audio state changes, participant management, chat
3. **Leave Session**: Cleanup SDK instance and reset state

### Key Features Implemented
- ✅ Real-time video streaming (50+ participants)
- ✅ JWT token generation via AWS Lambda
- ✅ Role-based permissions (coach/student)
- ✅ Participant management (mute, remove, spotlight)
- ✅ Session recording capabilities
- ✅ Real-time chat and hand raising
- ✅ Network quality monitoring

## Development Workflow

### IMPORTANT: Always run typecheck after code changes
```bash
npm run typecheck
```

### Testing Real Zoom Sessions
1. Ensure `VITE_ZOOM_TOKEN_ENDPOINT` points to working Lambda Function URL
2. Join as different roles in separate browser windows/devices
3. Test video/audio controls, participant management, chat
4. Monitor browser console for SDK errors

### Code Style
- Use ES modules with explicit imports
- TypeScript strict mode enabled
- Tailwind CSS for styling
- Destructure imports when possible
- Use const assertions for literal types

## AWS Infrastructure

### Amplify Gen2 Configuration
- `amplify/backend.ts` - Minimal Gen2 backend (frontend-only hosting)
- External services pattern: Supabase (auth/DB) + Lambda (tokens)
- Custom domain: classes.tribe.fit via Route 53
- Region: Mumbai (ap-south-1)

### Lambda Function URLs
- Production: `https://oorxo2zdkjrmmbzdfhaktk5ipa0phjlp.lambda-url.ap-south-1.on.aws`
- Function: `fitwithpari-zoom-token-staging`
- Handles: Token generation, validation, configuration endpoints

## Common Issues & Solutions

### "HIIT Cardio Blast" Mock Data Showing
**Solution**: This indicates the app is using old cached version or development mode
- Check `VITE_ZOOM_TOKEN_ENDPOINT` is set correctly
- Clear browser cache and hard refresh
- Verify production deployment has latest changes

### JWT Token Generation Errors
**Solution**: Check Lambda Function URL and credentials
```bash
curl -X POST your-lambda-url/token -H "Content-Type: application/json" -d '{"sessionName":"test","role":1,"sessionKey":"test123","userIdentity":"test-user"}'
```

### Video SDK Initialization Failures
**Solution**: Browser compatibility and permissions
- Ensure HTTPS connection (required for media access)
- Check camera/microphone permissions
- Verify SDK credentials are valid
- Test in incognito mode to bypass cache

### Deployment Issues
**Solution**: Amplify build configuration
- `amplify.yml` must include `npm install --include=dev` for Vite
- Check build logs in AWS Amplify console
- Verify environment variables are set in Amplify

## File Structure
```
src/
├── components/          # React components (CoachView, StudentView, etc.)
├── hooks/              # Custom hooks (useZoomFitnessPlatform)
├── services/           # SDK services (zoomSDKService, tokenService)
├── context/            # React context providers
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and validators
└── config/             # Configuration files

lambda/                 # AWS Lambda functions
├── zoom-token-handler.js
└── package.json

amplify/               # AWS Amplify Gen2 configuration
└── backend.ts
```

## Repository Information
- **GitHub**: https://github.com/Fitwithpari-Dev/FWP-in-class
- **Production URL**: https://classes.tribe.fit
- **AWS Region**: ap-south-1 (Mumbai)

## YOU MUST
- Always test real Zoom sessions after making SDK-related changes
- Run typecheck before committing code
- Verify Lambda Function URL is working before deployment
- Use production domain (classes.tribe.fit) for final testing
- Never commit `.env` files with real credentials
- Test with multiple participants when possible

## Debugging Tips
1. Check browser console for Zoom SDK errors
2. Monitor network tab for failed token requests
3. Verify JWT token structure and expiration
4. Test Lambda function directly with curl
5. Use incognito mode to test without cache
6. Check AWS CloudWatch logs for Lambda errors

---
**CRITICAL**: This platform handles real-time video sessions for fitness classes. Always prioritize session reliability and participant experience.