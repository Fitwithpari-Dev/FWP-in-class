const fs = require('fs');
const path = require('path');

// Create a simple PNG icon using SVG as base64
function createIcon(size, filename) {
  // Create SVG content
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#10B981"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="${size/4}">FWP</text>
    </svg>
  `;

  // Convert SVG to base64 (this creates a valid SVG that browsers can use)
  const base64 = Buffer.from(svg).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  // For now, let's create a simple placeholder file that references the SVG
  // In production, this would ideally be converted to PNG, but SVG works for icons too
  fs.writeFileSync(
    path.join(__dirname, 'public', filename.replace('.png', '.svg')),
    svg
  );

  console.log(`Created ${filename.replace('.png', '.svg')}`);
}

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Create icons
createIcon(192, 'pwa-192x192.png');
createIcon(512, 'pwa-512x512.png');

console.log('Icons created successfully!');