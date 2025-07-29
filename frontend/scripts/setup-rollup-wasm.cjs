const fs = require('fs');
const path = require('path');
const targetDir = path.join(__dirname, '..', 'node_modules', '@rollup', 'rollup-linux-x64-gnu');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
fs.writeFileSync(path.join(targetDir, 'index.js'), "module.exports = require('@rollup/wasm-node/dist/native.js');\n");
fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify({name:'@rollup/rollup-linux-x64-gnu',version:'4.46.1',main:'index.js'}, null, 2));
