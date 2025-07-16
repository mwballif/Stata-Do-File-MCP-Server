#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon for Stata
const svgIcon = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#1f4e79"/>
  <text x="32" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">S</text>
  <text x="32" y="55" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" fill="white">STATA</text>
</svg>`;

// Write the SVG file
fs.writeFileSync('icon.svg', svgIcon);

console.log('Icon created: icon.svg');
console.log('Note: You may want to convert this to PNG format for better compatibility.');
console.log('You can use online tools or ImageMagick to convert SVG to PNG.'); 