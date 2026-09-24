const fs = require('fs');
const file = 'src/app/components/EditModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const workFields = ['title', 'author', 'genre', 'hours', 'recommendedBy', 'volume', 'photoUrl', 'summary', 'description', 'launchYear', 'originalLanguage', 'countryOfOrigin', 'authorDescription', 'coverFile', 'isbn', 'tags', 'collections', 'series', 'apiData', 'readingSpans'];
const copyFields = ['format', 'condition', 'shelfLocation', 'purchased', 'purchasePrice', 'investedAmount', 'status', 'pdfPath', 'currentPage', 'totalPages', 'lastReadTimestamp', 'readingSessions', 'rating', 'quotes', 'amazonLink', 'loans', 'readingStartDate', 'readingEndDate', 'givenTo', 'loanDate'];

workFields.forEach(field => {
  const regex = new RegExp(`formData\\.${field}(\\b)`, 'g');
  content = content.replace(regex, `formData.work?.${field}$1`);
  
  const regexP = new RegExp(`p\\.${field}(\\b)`, 'g');
  content = content.replace(regexP, `p.work?.${field}$1`);
});

copyFields.forEach(field => {
  const regex = new RegExp(`formData\\.${field}(\\b)`, 'g');
  content = content.replace(regex, `formData.copy?.${field}$1`);
  
  const regexP = new RegExp(`p\\.${field}(\\b)`, 'g');
  content = content.replace(regexP, `p.copy?.${field}$1`);
});

fs.writeFileSync(file, content);
