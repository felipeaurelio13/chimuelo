const fs = require('fs');
const path = require('path');

// Create the target directory structure
const targetDir = path.join(__dirname, '..', 'node_modules', '@rollup', 'rollup-linux-x64-gnu');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Verify that @rollup/wasm-node is installed
const wasmNodePath = path.join(__dirname, '..', 'node_modules', '@rollup', 'wasm-node');
if (!fs.existsSync(wasmNodePath)) {
  console.error('❌ @rollup/wasm-node not found. Installing...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install @rollup/wasm-node', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to install @rollup/wasm-node:', error.message);
    process.exit(1);
  }
}

// Create the index.js file that exports the WASM module
const indexContent = `module.exports = require('@rollup/wasm-node/dist/native.js');\n`;
fs.writeFileSync(path.join(targetDir, 'index.js'), indexContent);

// Create the package.json for the native module
const packageJson = {
  name: '@rollup/rollup-linux-x64-gnu',
  version: '4.46.1',
  main: 'index.js',
  optionalDependencies: {
    '@rollup/wasm-node': '^4.46.1'
  }
};
fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

console.log('✅ Rollup WASM setup completed');
