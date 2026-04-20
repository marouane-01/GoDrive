const fs = require('fs');
const path = require('path');

function cleanFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                cleanFiles(fullPath);
            }
        } else {
            if (fullPath.endsWith('.js') || fullPath.endsWith('.html') || fullPath.endsWith('.css')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                if (content.endsWith('\\n')) {
                    content = content.slice(0, -2);
                    fs.writeFileSync(fullPath, content);
                }
            }
        }
    }
}

cleanFiles(__dirname);
console.log('Cleaned up \\n from files.');
