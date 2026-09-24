const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the <BookViewModal ... /> usage
const originalUsage = `        <BookViewModal
          book={viewingBook}
          isDark={isDark}
          onClose={() => setViewingBook(null)}
          onEdit={() => {
            setViewingBook(null)
            setEditingBook(viewingBook)
          }}
          onReadPdf={() => {
            setViewingBook(null)
            setReadingPdfBook(viewingBook)
          }}
        />`;

const updatedUsage = `        <BookViewModal
          book={viewingBook}
          isDark={isDark}
          onClose={() => setViewingBook(null)}
          onEdit={() => {
            setViewingBook(null)
            setEditingBook(viewingBook)
          }}
          onReadPdf={() => {
            setViewingBook(null)
            setReadingPdfBook(viewingBook)
          }}
          onSave={(updated) => {
            const newBooks = books.map(b => b.id === updated.id ? updated : b);
            setBooks(newBooks);
            saveBooks(newBooks);
            setViewingBook(updated); // Refresh modal view
          }}
        />`;

content = content.replace(originalUsage, updatedUsage);
fs.writeFileSync(file, content);
