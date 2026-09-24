const fs = require('fs');

const file = 'src/app/components/BookViewModal.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import ReadingTimer')) {
  content = content.replace("import ShareCardModal from './ShareCardModal'", "import ShareCardModal from './ShareCardModal'\nimport ReadingTimer from './ReadingTimer'");
}

// Add onSave prop
if (!content.includes('onSave?: (book: Book) => void')) {
  content = content.replace('  onReadPdf?: () => void\n}', '  onReadPdf?: () => void\n  onSave?: (book: Book) => void\n}');
  content = content.replace('  onReadPdf,\n  isDark = false\n}: {', '  onReadPdf,\n  onSave,\n  isDark = false\n}: {');
}

// Add isTiming state
const stateToAdd = '\n  const [isTiming, setIsTiming] = useState(false)\n';
if (!content.includes('isTiming')) {
  content = content.replace('  const [isSharing, setIsSharing] = useState(false)', '  const [isSharing, setIsSharing] = useState(false)' + stateToAdd);
}

const timerButton = `
        {/* Timer button */}
        {book.status === 'Reading' && onSave && (
          <button
            onClick={() => setIsTiming(true)}
            className="w-full mt-2 py-3 rounded-full font-black tracking-[0.1em] uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              boxShadow: '0 8px 24px -4px rgba(245,158,11,0.45)',
              color: 'white'
            }}
          >
            ⏱️ Start Reading Session
          </button>
        )}
`;
content = content.replace('{/* Read PDF button */}', timerButton + '\n        {/* Read PDF button */}');

const modalHtml = `
      {isTiming && onSave && (
        <ReadingTimer 
          book={book} 
          onClose={() => setIsTiming(false)} 
          onSaveSession={(durationMinutes, startPage, endPage) => {
            const newSession = {
              date: new Date().toISOString(),
              durationMinutes,
              startPage,
              endPage
            }
            onSave({
              ...book,
              currentPage: endPage > 0 ? endPage : book.currentPage,
              readingSessions: [...(book.readingSessions || []), newSession]
            })
          }}
        />
      )}
    </>
`;
content = content.replace('    </>\n', modalHtml);

fs.writeFileSync(file, content);
