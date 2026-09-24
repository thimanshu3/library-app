const fs = require('fs');
let pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. handleManualAdd
pageContent = pageContent.replace(/setEditingBook\(\{\n\s*title: 'New Book Title',/g, 
  "setEditingBook({\n      id: '', workId: '', condition: 'Good', shelfLocation: '', title: 'New Book Title',");

// 2. handleSelectSearchedBook
pageContent = pageContent.replace(/setEditingBook\(\{\n\s*title: 'New Book Title',/g, 
  "setEditingBook({\n      id: bookData.id || '', workId: '', condition: 'Good', shelfLocation: '', title: 'New Book Title',");
// The second regex replace above won't match if it's already replaced. So let's do it precisely:

pageContent = pageContent.replace(/const handleSelectSearchedBook = \(bookData: Partial<Book>\) => \{\n    setIsAddingBook\(false\)\n    setEditingBook\(\{/g, 
  "const handleSelectSearchedBook = (bookData: Partial<Book>) => {\n    setIsAddingBook(false)\n    setEditingBook({\n      id: (bookData.id || '') as string, workId: '', condition: 'Good', shelfLocation: '',");

// 3. filter loop generic access
pageContent = pageContent.replace(/const v = \(b as Record<string, unknown>\)\[h\]/g, 
  "const v = (b as unknown as Record<string, unknown>)[h]");

fs.writeFileSync('src/app/page.tsx', pageContent);

let viewModal = fs.readFileSync('src/app/components/BookViewModal.tsx', 'utf8');
viewModal = viewModal.replace(/onClose: \(\) => void/g, "onClose: () => void\n  onSave?: (b: Book) => void");
fs.writeFileSync('src/app/components/BookViewModal.tsx', viewModal);

