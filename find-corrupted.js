const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

const corrupted = [];
walkDir('src', function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('׳©׳') || content.includes('׳—׳₪') || content.includes('׳”׳–׳ ׳×')) {
    corrupted.push(filePath);
  }
});
console.log('Corrupted files:', corrupted);
