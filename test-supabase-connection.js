#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vzhpqjvkutveghznjgcf.supabase.co'
const supabaseKey = 'sb_publishable_HyeFmpuM8KjK3m4MkiI4Yw_Hv9l7Rni'

console.log('🔌 Testing Supabase connection...')
console.log(`📡 URL: ${supabaseUrl}`)
console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.log('⚠️  Auth check:', error.message)
    } else {
      console.log('✅ Supabase connection successful!')
    }

    // Test database access
    const { data: tables, error: dbError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)

    if (dbError) {
      console.log('⚠️  Database access:', dbError.message)
      console.log('💡 This is expected if no tables exist yet')
    } else {
      console.log('✅ Database access working!')
    }

  } catch (err) {
    console.error('❌ Connection failed:', err.message)
  }
}

testConnection()