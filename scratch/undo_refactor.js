const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/components/**/*.tsx');
files.push('src/app/page.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Undo work. and copy.
  content = content.replace(/\.work\?\.|\.work\./g, '.');
  content = content.replace(/\.copy\?\.|\.copy\./g, '.');

  fs.writeFileSync(file, content);
});
console.log("Reverted fields to flat");
