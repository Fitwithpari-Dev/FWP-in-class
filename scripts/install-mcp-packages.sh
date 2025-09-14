#!/bin/bash

# Install MCP packages for Supabase integration
echo "Installing Supabase MCP Server packages..."

# Install the official Supabase MCP server
npm install -g @supabase/mcp-server

# Install MCP SDK dependencies for custom real-time server
npm install --save-dev @modelcontextprotocol/sdk

# Make the real-time server executable
chmod +x scripts/supabase-mcp-realtime.js

echo "✅ MCP packages installed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .claudeconfig with your Supabase credentials"
echo "2. Restart Claude Code to load the MCP servers"
echo "3. Use MCP tools for real-time database operations"

echo ""
echo "Available MCP tools:"
echo "- get_active_sessions: Get all active fitness sessions"
echo "- get_session_participants: Get participants for a session"
echo "- update_participant_status: Real-time participant updates"
echo "- get_health_considerations: Access health data (coaches only)"
echo "- subscribe_session_updates: Set up real-time subscriptions"