# Supabase MCP Server Setup for FitWithPari

## 🎯 Quick Setup (Official Supabase MCP)

Following the official Supabase MCP documentation, here's how to set up the MCP server for your FitWithPari project:

### **Step 1: Get Supabase Access Token**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Settings** → **Access Tokens**
3. Click **"Generate new token"**
4. Give it a name like "FitWithPari MCP"
5. Copy the generated access token

### **Step 2: Configure MCP Server**

Your project already has the configuration files ready:

**Option A: Project-scoped (.mcp.json)**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--project-ref=vzhpqjvkutveghznjgcf"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your_supabase_access_token_here"
      }
    }
  }
}
```

**Option B: CLI Command**
```bash
claude mcp add supabase -s local -e SUPABASE_ACCESS_TOKEN=your_token_here -- npx -y @supabase/mcp-server-supabase@latest --project-ref=vzhpqjvkutveghznjgcf
```

### **Step 3: Update Configuration**

1. **Update `.mcp.json`**:
   - Replace `your_supabase_access_token_here` with your actual access token

2. **Update `.claudeconfig`**:
   - Replace `your_supabase_access_token_here` with your actual access token

### **Step 4: Restart Claude Code**

After updating the configuration:
1. Close Claude Code completely
2. Reopen Claude Code
3. The Supabase MCP server will be loaded automatically

### **Step 5: Test MCP Integration**

Once Claude Code restarts, you should have access to Supabase MCP tools:

```
# Test MCP connection
Use Supabase MCP tools to:
- Create database tables
- Insert sample data
- Query existing data
- Set up real-time subscriptions
```

## 🛠️ Available MCP Tools

After setup, you'll have access to:

- **`mcp_supabase_query`** - Execute SQL queries directly
- **`mcp_supabase_insert`** - Insert data into tables
- **`mcp_supabase_update`** - Update existing records
- **`mcp_supabase_delete`** - Delete records
- **`mcp_supabase_realtime`** - Set up real-time subscriptions

## 🎯 Next Steps for FitWithPari

Once MCP is configured, we can:

### **1. Create Database Schema**
```sql
-- Use mcp_supabase_query to create tables
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  user_role VARCHAR(20) DEFAULT 'student',
  fitness_level VARCHAR(20) DEFAULT 'beginner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. Insert Sample Data**
```sql
-- Use mcp_supabase_insert for sample data
INSERT INTO user_profiles (email, full_name, user_role, fitness_level)
VALUES
  ('coach@fitwithpari.com', 'Sarah Johnson', 'coach', 'advanced'),
  ('student@fitwithpari.com', 'Mike Chen', 'student', 'beginner');
```

### **3. Test Real-time Features**
```sql
-- Set up real-time subscriptions for live fitness sessions
SELECT * FROM session_participants WHERE session_id = 'live-session-123';
```

## 🔐 Security Notes

- **Read-only mode**: The MCP server can be configured with `--read-only` flag for safety
- **Project-scoped**: Configuration is scoped to your specific Supabase project
- **Access token**: Keep your access token secure and don't commit it to git

## 🚀 Production Ready

With Supabase MCP configured, your FitWithPari platform will have:

- ✅ Direct database access through Claude Code
- ✅ Real-time data manipulation capabilities
- ✅ Seamless integration with existing React app
- ✅ Production-ready Supabase backend
- ✅ Complete fitness platform functionality

**Your access token is the final piece needed to activate the MCP server!**