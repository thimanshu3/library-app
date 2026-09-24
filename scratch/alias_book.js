const fs = require('fs');
const file = 'src/app/types.ts';
let content = fs.readFileSync(file, 'utf8');

content += '\nexport type Book = JoinedBook;\n';
fs.writeFileSync(file, content);
