const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/components/**/*.tsx');
files.push('src/app/page.tsx');
files.push('src/app/types.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // book.id -> book.copy.id
  content = content.replace(/\bbook\.id\b/g, 'book.copy.id');
  content = content.replace(/\bb\.id\b/g, 'b.copy.id');
  content = content.replace(/\bupdated\.id\b/g, 'updated.copy.id');
  content = content.replace(/\bfinalBook\.id\b/g, 'finalBook.copy.id');
  content = content.replace(/\bformData\.id\b/g, 'formData.copy.id');
  content = content.replace(/\breadingPdfBook\.id\b/g, 'readingPdfBook.copy.id');

  // Also catch readingPdfBook missing copy properties
  content = content.replace(/\breadingPdfBook\.pdfPath\b/g, 'readingPdfBook.copy.pdfPath');
  content = content.replace(/\breadingPdfBook\.currentPage\b/g, 'readingPdfBook.copy.currentPage');
  content = content.replace(/\breadingPdfBook\.readingSessions\b/g, 'readingPdfBook.copy.readingSessions');

  // Fix other miscellaneous missing ones reported
  content = content.replace(/\ba\.launchYear\b/g, 'a.work.launchYear');
  content = content.replace(/\ba\.purchasePrice\b/g, 'a.copy.purchasePrice');
  content = content.replace(/\bfinalBook\.photoUrl\b/g, 'finalBook.work.photoUrl');
  content = content.replace(/\bfinalBook\.isbn\b/g, 'finalBook.work.isbn');
  content = content.replace(/\bfinalBook\.coverFile\b/g, 'finalBook.work.coverFile');
  
  content = content.replace(/\bp\.quotes\b/g, 'p.copy.quotes');
  content = content.replace(/\bp\.work\?\.copy\?\./g, 'p.copy?.'); // fix any double replace
  
  fs.writeFileSync(file, content);
});
