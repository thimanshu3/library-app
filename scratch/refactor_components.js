const fs = require('fs');
const glob = require('glob');

const workFields = ['title', 'author', 'genre', 'hours', 'recommendedBy', 'volume', 'photoUrl', 'summary', 'description', 'launchYear', 'originalLanguage', 'countryOfOrigin', 'authorDescription', 'coverFile', 'isbn', 'tags', 'collections', 'series', 'apiData', 'readingSpans'];
const copyFields = ['format', 'condition', 'shelfLocation', 'purchased', 'purchasePrice', 'investedAmount', 'status', 'pdfPath', 'currentPage', 'totalPages', 'lastReadTimestamp', 'readingSessions', 'rating', 'quotes', 'amazonLink', 'loans', 'readingStartDate', 'readingEndDate', 'givenTo', 'loanDate'];

const files = glob.sync('src/app/components/**/*.tsx');
files.push('src/app/page.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace import { Book } from '../page' with import { Book } from '../types'
  content = content.replace(/import\s+\{\s*Book\s*\}\s+from\s+['"]\.\.\/page['"]/g, "import { Book } from '../types'");
  content = content.replace(/import\s+\{\s*Book\s*\}\s+from\s+['"]\.\/page['"]/g, "import { Book } from './types'");

  // Replace book.field with book.work.field or book.copy.field
  workFields.forEach(field => {
    const regex = new RegExp(`book\\.${field}(\\b)`, 'g');
    content = content.replace(regex, `book.work.${field}$1`);
    
    // Also handle b.field in iterators
    const regexB = new RegExp(`b\\.${field}(\\b)`, 'g');
    content = content.replace(regexB, `b.work.${field}$1`);

    // updated.field
    const regexUpdated = new RegExp(`updated\\.${field}(\\b)`, 'g');
    content = content.replace(regexUpdated, `updated.work.${field}$1`);
  });

  copyFields.forEach(field => {
    const regex = new RegExp(`book\\.${field}(\\b)`, 'g');
    content = content.replace(regex, `book.copy.${field}$1`);
    
    const regexB = new RegExp(`b\\.${field}(\\b)`, 'g');
    content = content.replace(regexB, `b.copy.${field}$1`);

    const regexUpdated = new RegExp(`updated\\.${field}(\\b)`, 'g');
    content = content.replace(regexUpdated, `updated.copy.${field}$1`);
  });

  fs.writeFileSync(file, content);
});

console.log("Refactored fields in", files.length, "files.");
