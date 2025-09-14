# Supabase MCP Server Integration for FitWithPari

## Overview
This guide sets up Model Context Protocol (MCP) servers for direct Supabase database access within Claude Code, enabling real-time fitness platform operations.

## 🚀 Quick Setup

### 1. Install MCP Dependencies
```bash
# Install MCP packages
npm install --save-dev @modelcontextprotocol/sdk

# Make scripts executable (Unix/Mac)
chmod +x scripts/install-mcp-packages.sh
./scripts/install-mcp-packages.sh

# Windows PowerShell
npm install -g @supabase/mcp-server
npm install --save-dev @modelcontextprotocol/sdk
```

### 2. Configure Environment Variables
Update `.claudeconfig` with your Supabase credentials:

```json
{
  "mcp": {
    "mcpServers": {
      "supabase-fitness": {
        "command": "npx",
        "args": ["@supabase/mcp-server"],
        "env": {
          "SUPABASE_URL": "https://your-project-id.supabase.co",
          "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
        }
      }
    }
  }
}
```

### 3. Test MCP Connection
After restarting Claude Code, you should have access to these MCP tools:

## 🛠️ Available MCP Tools

### Core Database Operations
- **`mcp_supabase_query`** - Direct SQL queries to your fitness database
- **`mcp_supabase_insert`** - Insert new records (sessions, participants, etc.)
- **`mcp_supabase_update`** - Update existing records in real-time
- **`mcp_supabase_delete`** - Remove records with proper cleanup

### Fitness Platform Specific Tools
- **`get_active_sessions`** - Retrieve all active fitness class sessions
- **`get_session_participants`** - Get participant list for specific session
- **`update_participant_status`** - Real-time video/audio status updates
- **`get_health_considerations`** - Access health data (coach authorization required)
- **`subscribe_session_updates`** - Set up real-time subscriptions

## 📋 Usage Examples

### Get Active Fitness Sessions
```
Use MCP tool: get_active_sessions
```
Returns all currently active fitness class sessions with coach info.

### Update Participant Status
```
Use MCP tool: update_participant_status
Parameters:
- participantId: "user-123"
- sessionId: "session-456"
- isVideoOn: true
- isAudioOn: false
- hasRaisedHand: true
```

### Query Health Considerations (Coach Only)
```
Use MCP tool: get_health_considerations
Parameters:
- sessionId: "session-456"
- coachId: "coach-789"
```

## 🔐 Security & Permissions

### Row Level Security (RLS)
All MCP operations respect Supabase RLS policies:
- **Health data**: Only accessible by participant and assigned coach
- **Session data**: Participants can only access their own sessions
- **Real-time updates**: Filtered by session membership

### Coach Permissions
Coaches can:
- View all participants in their sessions
- Access health considerations for session participants
- Update exercise targeting and session state
- Manage participant video/audio permissions

### Student Permissions
Students can:
- View their own session data
- Update their personal status (hand raising, etc.)
- Access exercises targeted to their fitness level
- View other participants' basic info (not health data)

## 🔄 Real-time Features

### Live Session Updates
MCP servers provide real-time capabilities for:
- **Participant join/leave events**
- **Video/audio status changes**
- **Hand raising notifications**
- **Exercise transitions**
- **Chat messages**
- **Rep count updates**

### Subscription Management
```javascript
// Example subscription setup via MCP
subscribe_session_updates({
  sessionId: "session-123"
})
```

## 🧪 Development & Testing

### Local Development
```bash
# Test MCP server locally
node scripts/supabase-mcp-realtime.js
```

### Environment Variables
Required for MCP servers:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 Performance Considerations

### Database Optimization
- All queries use proper indexes for fitness platform operations
- Real-time subscriptions are filtered by session membership
- Health data queries are optimized for coach workflow

### Caching Strategy
- Session participant lists cached for 30 seconds
- Exercise content cached for 5 minutes
- Health considerations cached per session

## 🔧 Troubleshooting

### Common Issues

**MCP Server Not Loading:**
1. Verify `.claudeconfig` syntax
2. Check environment variables are set
3. Restart Claude Code completely

**Database Connection Errors:**
1. Verify Supabase URL and keys
2. Check RLS policies allow access
3. Ensure service role key has proper permissions

**Real-time Updates Not Working:**
1. Check Supabase real-time is enabled
2. Verify subscription filters
3. Monitor network connectivity

### Debug Commands
```bash
# Test Supabase connection
npx supabase status

# Verify MCP server
echo '{"method": "tools/list"}' | node scripts/supabase-mcp-realtime.js

# Check database schema
npx supabase db diff
```

## 🚀 Production Deployment

When deploying to production:

1. **Update environment variables** in AWS Amplify Console
2. **Configure MCP servers** for production Supabase instance
3. **Monitor performance** with Supabase dashboard
4. **Set up alerts** for critical fitness platform operations

The MCP integration provides direct database access within Claude Code, enabling seamless real-time fitness platform development and management!