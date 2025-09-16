import { defineBackend } from '@aws-amplify/backend';

/**
 * FitWithPari Frontend-Only Backend Configuration
 *
 * This is a minimal Gen2 backend that only handles frontend hosting.
 * External services:
 * - Supabase: Authentication & Database
 * - AWS Lambda: Zoom token generation
 * - Route 53: Custom domain (classes.tribe.fit)
 */
const backend = defineBackend({
  // No auth - using Supabase
  // No data - using Supabase
  // No functions - using external Lambda
});

// Export for any future extensions
export default backend;