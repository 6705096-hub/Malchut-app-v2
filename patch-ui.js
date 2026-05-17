const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add ArrowUpDown to imports if not there
  if (!content.includes('ArrowUpDown')) {
    content = content.replace(/import \{([^}]+)\} from 'lucide-react'/, "import { ArrowUpDown, $1 } from 'lucide-react'");
  }

  // 2. Add states
  if (!content.includes('const [showSortOption')) {
    content = content.replace(
      'const [showFilters, setShowFilters] = useState(false)',
      "const [showFilters, setShowFilters] = useState(false)\n  const [showSortOption, setShowSortOption] = useState(false)\n  const [sortOrder, setSortOrder] = useState<'DATE' | 'NEWEST'>('DATE')"
    );
  }

  // 3. Add sortedFilteredOrders logic
  if (!content.includes('const sortedFilteredOrders')) {
    content = content.replace(
      "const zoneGroups: Record<string, CompleteOrder[]> = {}",
      `const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortOrder === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });
  const zoneGroups: Record<string, CompleteOrder[]> = {}`
    );
    content = content.replace("zoneGroups['ALL'] = filteredOrders", "zoneGroups['ALL'] = sortedFilteredOrders");
    content = content.replace("filteredOrders.forEach(order => {", "sortedFilteredOrders.forEach(order => {");
  }

  // 4. Update Filter button (remove "סינונים" text, make it square)
  content = content.replace(
    /onClick=\{\(\) => setShowFilters\(!showFilters\)\}\s*className=\{`flex items-center gap-2 px-4 py-2 font-bold rounded-2xl transition-all shadow-sm border active:scale-95 \$\{/,
    `onClick={() => { setShowFilters(!showFilters); setShowSortOption(false); }}\n              title="סינונים"\n              className={\`flex items-center justify-center w-10 h-10 rounded-2xl transition-all shadow-sm border active:scale-95 \${`
  );
  content = content.replace(
    /<Filter className="w-4 h-4" \/>\s*סינונים/,
    '<Filter className="w-4 h-4" />'
  );

  // 5. Add Sort button before Filter button
  if (!content.includes('ArrowUpDown className=')) {
    const sortBtnHTML = `
            {/* SORT BUTTON */}
            <div className="relative">
              <button 
                onClick={() => { setShowSortOption(!showSortOption); setShowFilters(false); }}
                className={\`flex items-center justify-center w-10 h-10 rounded-2xl transition-all shadow-sm border active:scale-95 \${
                  showSortOption 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }\`}
                title="מיון"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              {showSortOption && (
                <>
                  <div className="fixed inset-0 z-[50]" onClick={() => setShowSortOption(false)} />
                  <div className="absolute top-full right-0 mt-3 z-[60] bg-white border border-gray-100 shadow-2xl rounded-2xl w-48 p-2 flex flex-col animate-in slide-in-from-top-2 fade-in">
                    <button 
                      onClick={() => { setSortOrder('DATE'); setShowSortOption(false); }}
                      className={\`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right \${sortOrder === 'DATE' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}\`}
                    >
                      מיון לפי תאריך
                    </button>
                    <button 
                      onClick={() => { setSortOrder('NEWEST'); setShowSortOption(false); }}
                      className={\`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right \${sortOrder === 'NEWEST' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}\`}
                    >
                      מהחדש לישן
                    </button>
                  </div>
                </>
              )}
            </div>
    `;
    content = content.replace(
      '<div className="flex flex-wrap items-center gap-2 print:hidden relative">',
      '<div className="flex flex-wrap items-center gap-2 print:hidden relative">\n' + sortBtnHTML
    );
  }

  // 6. Update Print button (remove "הדפס" text, make it square)
  content = content.replace(
    /className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 active:scale-95 text-white rounded-2xl font-bold transition-all shadow-sm"/,
    'className="flex items-center justify-center w-10 h-10 bg-gray-800 hover:bg-gray-900 active:scale-95 text-white rounded-2xl font-bold transition-all shadow-sm" title="הדפסה"'
  );
  content = content.replace(
    /<Printer className="w-4 h-4" \/> הדפס/,
    '<Printer className="w-4 h-4" />'
  );

  fs.writeFileSync(filePath, content);
  console.log('Patched ' + filePath);
}

patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app-v2\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
