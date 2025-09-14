#!/usr/bin/env node

const http = require('http')

console.log('🔌 Testing Zoom SDK Integration...')
console.log('================================')

// Test token server health
function testTokenServer() {
  return new Promise((resolve, reject) => {
    console.log('🏥 Testing token server health...')

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Token server is healthy')
          resolve(JSON.parse(data))
        } else {
          console.log(`⚠️  Token server health check failed: ${res.statusCode}`)
          reject(new Error(`Health check failed: ${res.statusCode}`))
        }
      })
    })

    req.on('error', (err) => {
      console.log('❌ Token server is not running:', err.message)
      reject(err)
    })

    req.end()
  })
}

// Test zoom config endpoint
function testZoomConfig() {
  return new Promise((resolve, reject) => {
    console.log('⚙️  Testing Zoom config endpoint...')

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/zoom/config',
      method: 'GET'
    }, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          const config = JSON.parse(data)
          console.log('✅ Zoom config retrieved')
          console.log(`📍 SDK Key: ${config.sdkKey.substring(0, 10)}...`)
          resolve(config)
        } else {
          console.log(`⚠️  Zoom config failed: ${res.statusCode}`)
          reject(new Error(`Config failed: ${res.statusCode}`))
        }
      })
    })

    req.on('error', (err) => {
      console.log('❌ Zoom config request failed:', err.message)
      reject(err)
    })

    req.end()
  })
}

// Test JWT token generation
function testJWTGeneration() {
  return new Promise((resolve, reject) => {
    console.log('🔑 Testing JWT token generation...')

    const postData = JSON.stringify({
      sessionName: 'test-fitness-session',
      userName: 'Test Coach',
      userRole: 'coach'
    })

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/zoom/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data)
          console.log('✅ JWT token generated successfully')
          console.log(`🎫 Token: ${response.token.substring(0, 20)}...`)
          resolve(response)
        } else {
          console.log(`⚠️  JWT generation failed: ${res.statusCode}`)
          console.log(`Response: ${data}`)
          reject(new Error(`Token generation failed: ${res.statusCode}`))
        }
      })
    })

    req.on('error', (err) => {
      console.log('❌ JWT generation request failed:', err.message)
      reject(err)
    })

    req.write(postData)
    req.end()
  })
}

// Run all tests
async function runTests() {
  try {
    console.log('🧪 Starting Zoom SDK integration tests...\n')

    await testTokenServer()
    await testZoomConfig()
    await testJWTGeneration()

    console.log('\n🎉 All tests passed!')
    console.log('✅ Zoom SDK integration is working correctly')
    console.log('\n📋 Integration Status:')
    console.log('- Token server: ✅ Running')
    console.log('- SDK credentials: ✅ Configured')
    console.log('- JWT generation: ✅ Working')
    console.log('- Ready for video sessions: ✅ Yes')

  } catch (error) {
    console.log('\n❌ Integration test failed:', error.message)
    console.log('\n📋 Troubleshooting:')
    console.log('1. Ensure token server is running: node server/tokenServer.js')
    console.log('2. Check Zoom SDK credentials in .env file')
    console.log('3. Verify port 3001 is available')
  }
}

runTests()