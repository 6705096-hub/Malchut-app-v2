const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Revert state
  content = content.replace(
    "const [sortOrder, setSortOrder] = useState<'DEFAULT' | 'DATE' | 'NEWEST'>('DEFAULT')",
    "const [sortOrder, setSortOrder] = useState<'DATE' | 'NEWEST'>('DATE')"
  );

  // 2. Revert buttons UI
  const oldSortUI = `                    <button 
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

  const newSortUI = `                    <button 
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

  if (content.includes('רגיל (לפי אזורים)')) {
      content = content.replace(oldSortUI, newSortUI);
  }

  // 3. Update zone grouping condition
  const startIdx = content.indexOf('const zoneGroups: Record<string, CompleteOrder[]> = {}');
  const endIdx = content.indexOf('const sortedZones = Object.keys(zoneGroups)');
  
  if (startIdx !== -1 && endIdx !== -1) {
      const oldZoneLogic = content.substring(startIdx, endIdx);
      const newZoneLogic = `const zoneGroups: Record<string, CompleteOrder[]> = {}
  zoneGroups['ALL'] = sortedFilteredOrders
  `;
      content = content.replace(oldZoneLogic, newZoneLogic);
  }

  // 4. Also remove the leftover "if (sortOrder === 'DATE' || sortOrder === 'DEFAULT') {"
  content = content.replace(
    "if (sortOrder === 'DATE' || sortOrder === 'DEFAULT') {",
    "if (sortOrder === 'DATE') {"
  );

  fs.writeFileSync(filePath, content);
  console.log('Patched ' + filePath);
}

patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app-v2\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
