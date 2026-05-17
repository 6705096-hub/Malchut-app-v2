const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update sorting logic
  const oldSortLogic = `const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortOrder === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });`;
  
  const newSortLogic = `const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortOrder === 'DATE') {
      const dateA = new Date(a.deliveryWeek).getTime();
      const dateB = new Date(b.deliveryWeek).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateB - dateA;
      }
      return 0;
    }
    if (sortOrder === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });`;

  content = content.replace(oldSortLogic, newSortLogic);

  // 2. Update Filter bubble UI
  const oldFilterBubble = `<span className={\`text-[11px] px-2 py-0.5 rounded-full font-black ml-1 \${showFilters ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'}\`}>
                  {((cityFilter !== 'ALL' ? 1 : 0) + (timingFilter !== 'ALL' ? 1 : 0) + (paymentFilter !== 'ALL' ? 1 : 0) + (deliveryFilter !== 'ALL' ? 1 : 0) + (zoneFilter !== 'ALL' ? 1 : 0))}
                </span>`;
  
  const newFilterBubble = `<span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />`;

  content = content.replace(oldFilterBubble, newFilterBubble);

  // 3. Remove chevron from filter button
  const chevronStr = `<ChevronDown className={\`w-4 h-4 transition-transform \${showFilters ? 'rotate-180' : ''}\`} />`;
  if (content.includes(chevronStr)) {
      content = content.replace(chevronStr, '');
  }

  fs.writeFileSync(filePath, content);
  console.log('Patched ' + filePath);
}

patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app-v2\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
