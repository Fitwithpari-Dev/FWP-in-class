# FitWithPari - Live Fitness Platform with Multi-Video SDK Support

## 🚀 V2 CLEAN ARCHITECTURE (PRIMARY REFERENCE)

**⚠️ IMPORTANT: Use V2 Implementation as Primary Reference**

The project has been redesigned with **Clean Architecture** principles for scalability to 1000+ participants. All new development should reference the V2 implementation:

### V2 Documentation (Primary Source)
- **📁 Location**: `src-v2/` folder
- **📖 Documentation**: `src-v2/docs/` folder
- **🏗️ Architecture Guide**: [`src-v2/docs/CLEAN_ARCHITECTURE_DESIGN.md`](src-v2/docs/CLEAN_ARCHITECTURE_DESIGN.md)
- **👥 UX/UI Stories**: [`src-v2/docs/UX_UI_USER_STORIES.md`](src-v2/docs/UX_UI_USER_STORIES.md)
- **🎨 Figma Mapping**: [`src-v2/docs/FIGMA_DESIGN_MAPPING.md`](src-v2/docs/FIGMA_DESIGN_MAPPING.md)
- **📊 Experience Flow**: [`src-v2/docs/IN_CLASS_EXPERIENCE_FLOW.md`](src-v2/docs/IN_CLASS_EXPERIENCE_FLOW.md)
- **📚 Implementation README**: [`src-v2/README.md`](src-v2/README.md)

### V2 Key Features
- ✅ Clean Architecture with Domain-Driven Design
- ✅ Modular Video Service Factory (Zoom + Agora + WebRTC)
- ✅ Scalable to 1000+ participants with virtual scrolling
- ✅ TypeScript strict typing with immutable domain entities
- ✅ Comprehensive test coverage
- ✅ Fitness platform UX/UI optimized for coach/student experience

**🔄 Migration Status**: V1 (below) is maintained for reference. All new development uses V2 architecture.

---

## V1 Legacy Implementation (Reference Only)

### Project Overview
A real-time fitness platform built with React + TypeScript + Vite, featuring modular video service architecture with support for both Zoom Video SDK and Agora Interactive Live Streaming. Uses Supabase for backend services and deployed on AWS Amplify.

**IMPORTANT**: This is a production fitness platform using real video SDK integrations with a unified service provider architecture for easy switching between video platforms.

## Video Service Architecture
The platform uses a **Unified Video Service Provider** pattern allowing seamless switching between:
- **Primary**: Agora Interactive Live Streaming SDK (current default)
- **Fallback**: Zoom Video SDK (for compatibility/backup)

Switch between services by changing `VIDEO_SERVICE` in `src/config/video.config.ts`

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Video Services**:
  - **Agora Interactive Live Streaming SDK** (primary - supports 50+ participants)
  - **Zoom Video SDK** (fallback - enterprise-grade backup)
- **Backend**: Supabase (authentication, database) + AWS Lambda (token generation)
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
**CRITICAL**: These must be configured for real video sessions:

```bash
# Agora Interactive Live Streaming SDK (Primary)
VITE_AGORA_APP_ID=your_agora_app_id
VITE_AGORA_APP_CERTIFICATE=your_agora_app_certificate
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Zoom Video SDK (Fallback)
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

## Agora Interactive Live Streaming SDK Integration

### Official Documentation
- **Product Overview**: https://docs.agora.io/en/interactive-live-streaming/overview/product-overview
- **Main Documentation**: https://docs.agora.io/en/
- **Authentication Workflow**: https://docs.agora.io/en/interactive-live-streaming/get-started/authentication-workflow

### Core Components
- `src/services/agoraSDKService.ts` - Core Agora RTC SDK wrapper
- `src/services/agoraVideoService.ts` - Unified video service implementation
- `src/services/agoraTokenService.ts` - Token generation and management
- `src/config/agora.config.ts` - Agora-specific configuration
- `src/hooks/useVideoFitnessPlatform.ts` - React hook for unified video services

### Authentication Architecture
```
1. App ID + App Certificate → Token Generation
2. Role-based Access: Coach (Host/Publisher) | Student (Audience/Subscriber)
3. Channel Management: fitwithpari_sessionId naming convention
4. Token Expiration: 1 hour with automatic renewal capability
```

### Session Lifecycle (Agora)
1. **Initialize**: Configure Agora client in 'live' mode for role-based streaming
2. **Generate Token**: Use App Certificate for secure channel access
3. **Join Channel**: Coach as 'host', Students as 'audience'
4. **Stream Management**: Real-time video/audio publishing and subscribing
5. **Leave Channel**: Cleanup tracks and connections

### Key Features Implemented (Agora)
- ✅ Interactive Live Streaming with 50+ participants
- ✅ Token-based authentication with automatic generation
- ✅ Role-based permissions (host/audience)
- ✅ Real-time video/audio streaming optimized for fitness
- ✅ Channel management with session-based naming
- ✅ Network quality monitoring and connection recovery
- ✅ Testing mode fallback for development

## Agora Core Concepts & Channel Management

### Critical Channel Management Rules
Based on [Agora Core Concepts](https://docs.agora.io/en/video-calling/overview/core-concepts?platform=web):

1. **Channel Identification**: Channels are "identified by a unique channel name"
2. **Same Channel Requirement**: Users MUST use identical channel names to interact
3. **Channel Lifecycle**: Created when first user joins, dissolved when last user leaves
4. **Unique UID Requirement**: Each user needs unique User ID to prevent conflicts

### Common Channel Issues & Solutions

**Issue: Users don't see each other in the same session**
- ❌ **Different Channel Names**: Check `generateChannelName()` consistency
- ❌ **UID Conflicts**: Multiple users using same UID causes "unexpected behavior"
- ❌ **Token Mismatches**: Inconsistent authentication between users
- ❌ **Role Permission Issues**: Host/audience role configuration problems

**Diagnostic Steps:**
1. **Console Check**: Verify identical channel names in browser logs
2. **UID Verification**: Ensure each participant gets unique UID
3. **Token Validation**: Check token generation for same channel/session
4. **Role Mapping**: Confirm coach=host, student=audience mapping

### Current Implementation Status
```
✅ Channel Generation: fitwithpari_${sessionId} format
✅ UID Assignment: null (auto-generated by Agora)
✅ Token Generation: Per-channel with role-based permissions
✅ Role Mapping: coach→host, student→audience
```

### Next Steps for Channel Debugging
1. Add channel name logging in browser console
2. Verify identical sessionId between coach/student
3. Monitor participant join/leave events
4. Check UID uniqueness in multi-user scenarios

### Agora vs Zoom Comparison
| Feature | Agora ILS | Zoom SDK |
|---------|-----------|----------|
| **Participants** | 50+ (optimized) | 50+ (enterprise) |
| **Role System** | Host/Audience | Meeting/Webinar |
| **Authentication** | Token-based | JWT-based |
| **Pricing** | Usage-based | Subscription |
| **Latency** | Ultra-low | Low |
| **Global CDN** | 200+ regions | Global |

### Configuration Files
- **agora.config.ts**: Streaming optimization, role configs, network settings
- **video.config.ts**: Service provider selection (`VIDEO_SERVICE = 'agora'`)
- **agoraTokenService.ts**: Secure token generation with role mapping

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

### Testing Real Video Sessions

#### Agora Testing (Primary)
1. Configure `VITE_AGORA_APP_ID` and optionally `VITE_AGORA_APP_CERTIFICATE`
2. Set `VIDEO_SERVICE = 'agora'` in `src/config/video.config.ts`
3. Join as Coach (host) and Student (audience) in separate browsers
4. Test role-based permissions and streaming capabilities
5. Monitor token generation and authentication workflow

#### Zoom Testing (Fallback)
1. Ensure `VITE_ZOOM_TOKEN_ENDPOINT` points to working Lambda Function URL
2. Set `VIDEO_SERVICE = 'zoom'` in `src/config/video.config.ts`
3. Join as different roles in separate browser windows/devices
4. Test video/audio controls, participant management, chat
5. Monitor browser console for SDK errors

#### Cross-Platform Testing
1. Test service switching between Agora and Zoom
2. Verify fallback mechanisms work correctly
3. Check unified interface consistency across both SDKs

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
├── components/          # React components (CoachView, StudentView, UnifiedVideoTile)
├── hooks/              # Custom hooks (useVideoFitnessPlatform, useZoomFitnessPlatform)
├── services/           # Video SDK services
│   ├── videoServiceProvider.ts    # Unified service provider/factory
│   ├── agoraSDKService.ts         # Core Agora RTC SDK wrapper
│   ├── agoraVideoService.ts       # Agora unified interface implementation
│   ├── agoraTokenService.ts       # Agora token generation
│   ├── zoomSDKService.ts          # Zoom SDK wrapper
│   ├── zoomVideoService.ts        # Zoom unified interface implementation
│   └── tokenService.ts            # Zoom JWT token service
├── context/            # React context providers
│   └── FitnessPlatformContext.tsx # Unified video platform context
├── types/              # TypeScript type definitions
│   ├── video-service.ts           # Unified video service interfaces
│   └── fitness-platform.ts       # Platform-specific types
├── utils/              # Utility functions and validators
├── config/             # Configuration files
│   ├── video.config.ts            # Video service provider selection
│   ├── agora.config.ts            # Agora-specific configuration
│   └── zoom.config.ts             # Zoom-specific configuration
└── lib/                # Core libraries and security

lambda/                 # AWS Lambda functions
├── zoom-token-handler.js          # Zoom JWT token generation
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

### Agora Debugging (Primary)
1. **Authentication Issues**:
   - Check `VITE_AGORA_APP_ID` format (32-character string)
   - Verify App Certificate configuration in Agora Console
   - Monitor token generation logs in browser console
   - Test with testing mode (empty App Certificate) first

2. **Connection Errors**:
   - Look for `CAN_NOT_GET_GATEWAY_SERVER` in console
   - Verify network connectivity and firewall settings
   - Check Agora service region availability
   - Test with different browser/incognito mode

3. **Role & Permission Issues**:
   - Verify coach = 'host', student = 'audience' mapping
   - Check setClientRole() calls for 'live' mode requirement
   - Monitor user-published/unpublished events

### Zoom Debugging (Fallback)
1. Check browser console for Zoom SDK errors
2. Monitor network tab for failed token requests
3. Verify JWT token structure and expiration
4. Test Lambda function directly with curl
5. Check AWS CloudWatch logs for Lambda errors

### Universal Debugging
1. **Service Provider Issues**:
   - Check `VIDEO_SERVICE` setting in `video.config.ts`
   - Verify service initialization in browser console
   - Test service switching mechanism
   - Monitor unified interface consistency

2. **General Video Issues**:
   - Use incognito mode to test without cache
   - Check camera/microphone permissions
   - Verify HTTPS connection (required for media access)
   - Test with multiple participants when possible
   - Monitor video track rendering and cleanup

3. **Performance Debugging**:
   - Check network quality indicators
   - Monitor video/audio bitrate and quality
   - Test with different device capabilities
   - Verify optimal encoder configurations

---
**CRITICAL**: This platform handles real-time video sessions for fitness classes. Always prioritize session reliability and participant experience.