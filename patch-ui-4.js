const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update state definition
  content = content.replace(
    "const [sortOrder, setSortOrder] = useState<'DATE' | 'NEWEST'>('DATE')",
    "const [sortOrder, setSortOrder] = useState<'DEFAULT' | 'DATE' | 'NEWEST'>('DEFAULT')"
  );

  // 2. Update sort button UI
  const oldSortUI = `                    <button 
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
                    </button>`;

  const newSortUI = `                    <button 
                      onClick={() => { setSortOrder('DEFAULT'); setShowSortOption(false); }}
                      className={\`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right \${sortOrder === 'DEFAULT' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}\`}
                    >
                      רגיל (לפי אזורים)
                    </button>
                    <button 
                      onClick={() => { setSortOrder('DATE'); setShowSortOption(false); }}
                      className={\`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right \${sortOrder === 'DATE' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}\`}
                    >
                      לפי תאריך (ברצף)
                    </button>
                    <button 
                      onClick={() => { setSortOrder('NEWEST'); setShowSortOption(false); }}
                      className={\`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-right \${sortOrder === 'NEWEST' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}\`}
                    >
                      מהחדש לישן (ברצף)
                    </button>`;

  content = content.replace(oldSortUI, newSortUI);

  // 3. Update sort logic
  content = content.replace(
    "if (sortOrder === 'DATE') {",
    "if (sortOrder === 'DATE' || sortOrder === 'DEFAULT') {"
  );

  // 4. Update zone grouping condition
  content = content.replace(
    "if (isGenericView) {",
    "if (isGenericView || sortOrder !== 'DEFAULT') {"
  );

  fs.writeFileSync(filePath, content);
  console.log('Patched ' + filePath);
}

patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app-v2\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
