
# FitWithPari - Online Fitness Class Platform 🏋️‍♀️

A production-ready React fitness platform with unified video streaming capabilities, supporting both Zoom and Agora video services.

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

## 🚀 Production Deployment

**For complete deployment instructions, see:**
**[📋 MASTER_DEPLOYMENT_GUIDE.md](./MASTER_DEPLOYMENT_GUIDE.md)**

This comprehensive guide covers:
- AWS Amplify deployment
- Environment configuration
- Video service setup (Zoom/Agora)
- Security & performance optimization
- Monitoring & troubleshooting

## 📖 Documentation

### Core Documentation
- **[🏗️ ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and WebRTC patterns
- **[👨‍💻 DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Development setup and guidelines
- **[📊 TECHNICAL_DIAGRAMS.md](./TECHNICAL_DIAGRAMS.md)** - Visual system overview

### Deployment & Operations
- **[🚀 MASTER_DEPLOYMENT_GUIDE.md](./MASTER_DEPLOYMENT_GUIDE.md)** - Complete deployment workflow
- **[⚠️ DEPLOYMENT_DEPRECATION_NOTICE.md](./DEPLOYMENT_DEPRECATION_NOTICE.md)** - Legacy documentation notice

## 🎯 Features

- **Unified Video Architecture**: Support for both Zoom and Agora video services
- **Event-Driven State Management**: WebRTC best practices for participant synchronization
- **Production-Ready**: TypeScript, comprehensive error handling, monitoring
- **Mobile Responsive**: Optimized for desktop and mobile devices
- **Real-time Sync**: Cross-browser participant state synchronization

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Video Services**: Zoom Video SDK / Agora RTC SDK (configurable)
- **Build Tool**: Vite
- **Hosting**: AWS Amplify + CloudFront CDN
- **Monitoring**: CloudWatch + Custom analytics

## 🔧 Environment Configuration

Create `.env.local` for development:
```env
VITE_VIDEO_SERVICE=agora  # or 'zoom'
VITE_AGORA_APP_ID=your_agora_app_id
VITE_APP_ENV=development
VITE_ENABLE_DEBUG_PANEL=true
```

## 📱 Original Design

Based on the Figma design: [Online Fitness Class Platform](https://www.figma.com/design/mUq4IYcwX0jSM246dpRGeq/Online-Fitness-Class-Platform)
  