const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionalDefaults = `
      workId: '',
      tags: [],
      collections: [],
      apiData: {},
      readingSpans: [],
      loans: [],
      quotes: [],`;

content = content.replace(/readingSessions: \[\]\n    \}\)/g, "readingSessions: []," + additionalDefaults + "\n    })");

// handleSelectSearchedBook uses Partial<Book> which is fine, but it might override editingBook with less.
// Let's make sure handleBatchSelect expects string for id.
content = content.replace(/const handleBatchSelect = \(id: number\) => {/g, "const handleBatchSelect = (id: string) => {");

fs.writeFileSync(file, content);
