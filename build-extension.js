import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const publicDir = join(process.cwd(), 'public');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
copyFileSync(
  join(process.cwd(), 'manifest.json'),
  join(distDir, 'manifest.json')
);

// Copy background script (will be compiled by Vite, but we need to ensure it's named correctly)
// Vite will handle the compilation, we just need to make sure the source is available

// Copy demo.mp4 if it exists
if (existsSync(join(publicDir, 'demo.mp4'))) {
  copyFileSync(
    join(publicDir, 'demo.mp4'),
    join(distDir, 'demo.mp4')
  );
} else if (existsSync(join(process.cwd(), 'demo.mp4'))) {
  copyFileSync(
    join(process.cwd(), 'demo.mp4'),
    join(distDir, 'demo.mp4')
  );
}

// Copy icon files from public/ if they exist
const iconSizes = [16, 48, 128];
iconSizes.forEach(size => {
  const iconFile = join(publicDir, `icon${size}.png`);
  if (existsSync(iconFile)) {
    copyFileSync(iconFile, join(distDir, `icon${size}.png`));
  }
});

// Copy HTML files from dist/components/ to dist/ root and fix script paths
const htmlFiles = ['popup.html', 'dashboard.html', 'blocked.html'];
const componentsDir = join(distDir, 'components');
htmlFiles.forEach(htmlFile => {
  const sourceFile = join(componentsDir, htmlFile);
  const destFile = join(distDir, htmlFile);
  if (existsSync(sourceFile)) {
    // Read the HTML file
    let htmlContent = readFileSync(sourceFile, 'utf-8');
    
    // Fix absolute paths to relative paths for Chrome extension
    // Replace /popup.js, /dashboard.js, /blocked.js with relative paths
    htmlContent = htmlContent.replace(/src="\/(popup|dashboard|blocked)\.js"/g, 'src="$1.js"');
    htmlContent = htmlContent.replace(/href="\/(assets\/[^"]+)"/g, 'href="$1"');
    
    // Write the fixed HTML file
    writeFileSync(destFile, htmlContent, 'utf-8');
    console.log(`Copied and fixed ${htmlFile} to dist/`);
  }
});

console.log('Extension files copied to dist/');

