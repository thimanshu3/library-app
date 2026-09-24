const fs = require('fs');

const file = 'src/app/components/BookViewModal.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import ShareCardModal')) {
  content = content.replace("import { Book } from '../page'", "import { Book } from '../page'\nimport ShareCardModal from './ShareCardModal'");
}

const functionStart = 'export default function BookViewModal({';
const stateToAdd = '\n  const [isSharing, setIsSharing] = useState(false)\n';

if (!content.includes('isSharing')) {
  content = content.replace('  const cover = book.coverFile', stateToAdd + '  const cover = book.coverFile');
}

const shareButton = `
        {/* Share button */}
        {book.status === 'Read' && (
          <button
            onClick={() => setIsSharing(true)}
            className="w-full mt-2 py-3 rounded-full font-black tracking-[0.1em] uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              boxShadow: '0 8px 24px -4px rgba(16,185,129,0.45)',
              color: 'white'
            }}
          >
            ✨ Share to Socials
          </button>
        )}
`;

content = content.replace('{/* Read PDF button */}', shareButton + '\n        {/* Read PDF button */}');

const modalHtml = `
      {isSharing && (
        <ShareCardModal book={book} onClose={() => setIsSharing(false)} />
      )}
    </>
  )
`;
content = content.replace('    </>\n  )\n}\n', modalHtml + '}\n');
if (!content.includes(modalHtml)) {
   content = content.replace('    </>\n  )\n}', modalHtml + '}');
}

fs.writeFileSync(file, content);
