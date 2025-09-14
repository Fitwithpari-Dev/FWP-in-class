#!/usr/bin/env node

/**
 * Supabase MCP Real-time Server for FitWithPari Fitness Platform
 * Provides real-time database access and subscriptions for fitness sessions
 */

const { createClient } = require('@supabase/supabase-js');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseFitnessMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "supabase-fitness",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Handle fitness platform specific tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'get_active_sessions',
          description: 'Get all active fitness class sessions',
          inputSchema: {
            type: 'object',
            properties: {},
          }
        },
        {
          name: 'get_session_participants',
          description: 'Get participants for a specific session',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'Session ID to get participants for'
              }
            },
            required: ['sessionId']
          }
        },
        {
          name: 'update_participant_status',
          description: 'Update participant video/audio status in real-time',
          inputSchema: {
            type: 'object',
            properties: {
              participantId: { type: 'string' },
              sessionId: { type: 'string' },
              isVideoOn: { type: 'boolean' },
              isAudioOn: { type: 'boolean' },
              hasRaisedHand: { type: 'boolean' }
            },
            required: ['participantId', 'sessionId']
          }
        },
        {
          name: 'get_health_considerations',
          description: 'Get health considerations for participants (coaches only)',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              coachId: { type: 'string' }
            },
            required: ['sessionId', 'coachId']
          }
        },
        {
          name: 'subscribe_session_updates',
          description: 'Subscribe to real-time updates for a session',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' }
            },
            required: ['sessionId']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_active_sessions':
          return await this.getActiveSessions();

        case 'get_session_participants':
          return await this.getSessionParticipants(args.sessionId);

        case 'update_participant_status':
          return await this.updateParticipantStatus(args);

        case 'get_health_considerations':
          return await this.getHealthConsiderations(args.sessionId, args.coachId);

        case 'subscribe_session_updates':
          return await this.subscribeSessionUpdates(args.sessionId);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async getActiveSessions() {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          id,
          title,
          start_time,
          duration,
          is_recording,
          coach_mode,
          current_exercise,
          exercise_timer,
          created_at,
          coach:user_profiles!coach_id(id, full_name, avatar_url)
        `)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessions: data,
            count: data.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  async getSessionParticipants(sessionId) {
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          id,
          user_id,
          is_video_on,
          is_audio_on,
          has_raised_hand,
          connection_quality,
          rep_count,
          variation,
          joined_at,
          user:user_profiles!user_id(
            id,
            full_name,
            avatar_url,
            fitness_level,
            health_considerations:health_considerations(
              id,
              type,
              description,
              severity,
              affected_exercises
            )
          )
        `)
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (error) throw error;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            participants: data,
            sessionId,
            count: data.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            sessionId
          }, null, 2)
        }]
      };
    }
  }

  async updateParticipantStatus(args) {
    try {
      const { participantId, sessionId, ...updates } = args;

      // Update participant status
      const { data, error } = await supabase
        .from('session_participants')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', participantId)
        .eq('session_id', sessionId)
        .select();

      if (error) throw error;

      // Create real-time update event
      const { error: updateError } = await supabase
        .from('participant_updates')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          update_type: 'status_change',
          update_data: updates,
          created_at: new Date().toISOString()
        });

      if (updateError) console.warn('Failed to log update:', updateError);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            updated: data,
            participantId,
            sessionId
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            participantId: args.participantId,
            sessionId: args.sessionId
          }, null, 2)
        }]
      };
    }
  }

  async getHealthConsiderations(sessionId, coachId) {
    try {
      // Verify coach has access to this session
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .select('coach_id')
        .eq('id', sessionId)
        .eq('coach_id', coachId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Unauthorized access to session health data');
      }

      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          user_id,
          user:user_profiles!user_id(
            id,
            full_name,
            health_considerations:health_considerations(
              id,
              type,
              description,
              severity,
              affected_exercises,
              recommended_modifications,
              medical_notes
            )
          )
        `)
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (error) throw error;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            healthData: data,
            sessionId,
            coachId,
            count: data.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            sessionId,
            coachId
          }, null, 2)
        }]
      };
    }
  }

  async subscribeSessionUpdates(sessionId) {
    try {
      // In a real implementation, this would set up a WebSocket subscription
      // For MCP, we'll return subscription setup info
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Real-time subscription setup initiated',
            sessionId,
            channels: [
              `session:${sessionId}:participants`,
              `session:${sessionId}:exercise_updates`,
              `session:${sessionId}:chat`
            ]
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            sessionId
          }, null, 2)
        }]
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supabase Fitness MCP Server running on stdio');
  }
}

// Start the server
const server = new SupabaseFitnessMCPServer();
server.start().catch(console.error);