#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Create a test directory
const testDir = path.join(__dirname, 'test-stata-files');
const fs = require('fs');

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create a test .do file
const testDoFile = path.join(testDir, 'test.do');
fs.writeFileSync(testDoFile, `* Test Stata file
* This is a comment

// Another comment
use "data.dta", clear

summarize variable1 variable2

regress dependent_var independent_var1 independent_var2

* End of file
`);

console.log('Test directory and file created:', testDir);

// Test the server
const server = spawn('node', ['dist/index.js', testDir], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

server.on('close', (code) => {
  console.log('Server output:', output);
  console.log('Server errors:', errorOutput);
  console.log('Server exited with code:', code);
});

// Send a simple test request
setTimeout(() => {
  const testRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
  };
  
  server.stdin.write(JSON.stringify(testRequest) + '\n');
  
  setTimeout(() => {
    server.kill();
  }, 2000);
}, 1000); 