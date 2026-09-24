const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const functionToAdd = `
  const checkWishlistPrices = async () => {
    const wishlistBooks = books.filter(b => b.status === 'Wishlist' && b.amazonLink);
    if (wishlistBooks.length === 0) {
      toast('No Wishlist books with Amazon links found', 'info');
      return;
    }

    toast(\`Checking prices for \${wishlistBooks.length} books...\`, 'info');
    setLoading(true);

    let updatedBooks = [...books];
    let updatedCount = 0;

    for (const book of wishlistBooks) {
      try {
        const res = await fetch('/api/price-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: book.amazonLink })
        });
        const data = await res.json();
        if (data.price !== undefined && data.price !== null) {
          updatedBooks = updatedBooks.map(b => 
            b.id === book.id ? { ...b, purchasePrice: data.price } : b
          );
          updatedCount++;
        }
      } catch (err) {
        console.error('Failed to fetch price for', book.title, err);
      }
    }

    if (updatedCount > 0) {
      setBooks(updatedBooks);
      saveBooks(updatedBooks);
      toast(\`Updated prices for \${updatedCount} books\`, 'success');
    } else {
      toast('No prices were updated', 'info');
    }
    
    setLoading(false);
  }
`;

content = content.replace('const exportLibrary = (format: \'json\' | \'csv\') => {', functionToAdd + '\n  const exportLibrary = (format: \'json\' | \'csv\') => {');

const wishlistViewHtml = `          {viewMode === 'wishlist' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Wishlist</h2>
                <button 
                  onClick={checkWishlistPrices}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Check Prices
                </button>
              </div>`;

content = content.replace(`          {viewMode === 'wishlist' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Wishlist</h2>
              </div>`, wishlistViewHtml);

fs.writeFileSync(file, content);
