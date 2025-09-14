const fs = require('fs');
const path = require('path');

function fixImports(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Remove version numbers from imports
      content = content.replace(/@radix-ui\/react-[a-z-]+@[\d.]+/g, (match) => {
        return match.replace(/@[\d.]+$/, '');
      });

      content = content.replace(/from ['"]([^'"]+)@[\d.]+['"]/g, (match, pkg) => {
        if (pkg.includes('lucide-react') ||
            pkg.includes('sonner') ||
            pkg.includes('vaul') ||
            pkg.includes('recharts') ||
            pkg.includes('react-resizable-panels') ||
            pkg.includes('react-hook-form') ||
            pkg.includes('react-day-picker') ||
            pkg.includes('next-themes') ||
            pkg.includes('input-otp') ||
            pkg.includes('embla-carousel-react') ||
            pkg.includes('cmdk') ||
            pkg.includes('class-variance-authority')) {
          return `from '${pkg}'`;
        }
        return match;
      });

      fs.writeFileSync(filePath, content);
      console.log(`Fixed imports in: ${filePath}`);
    }
  });
}

// Fix imports in src directory
fixImports('./src');

console.log('Import fixes completed!');