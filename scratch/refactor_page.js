const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove the export type Book block
const typeStart = '// ─── Types ────────────────────────────────────────────────────────────────────\nexport type Book = {';
const typeEnd = '}\n\ntype ViewMode';

const startIdx = content.indexOf(typeStart);
const endIdx = content.indexOf(typeEnd) + 2; // to keep type ViewMode

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + 
            "import { BookWork, BookCopy, JoinedBook } from './types'\n\n" + 
            "// ─── Types ────────────────────────────────────────────────────────────────────\n\n" +
            content.substring(endIdx);
}

fs.writeFileSync(file, content);
