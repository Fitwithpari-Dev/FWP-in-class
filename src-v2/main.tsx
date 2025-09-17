import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { pwaService } from './services/pwaService';

/**
 * Main Entry Point for V2 Clean Architecture
 * Bootstrap the React application with the new video session system
 */

// Global error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('[V2] Unhandled Promise Rejection:', event.reason);
  // In production, send to error tracking service
});

window.addEventListener('error', (event) => {
  console.error('[V2] Unhandled Error:', event.error);
  // In production, send to error tracking service
});

// Initialize PWA service for better mobile experience
console.log('🚀 V2: Initializing PWA service for FitWithPari');
pwaService.setupMessageListener();

// Initialize React application
const container = document.getElementById('root-v2');

if (!container) {
  throw new Error('Root element #root-v2 not found. Please ensure the HTML includes a div with id="root-v2"');
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Export for testing
export { App } from './App';