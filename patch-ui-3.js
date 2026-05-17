const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add the getDeliveryTimestamp function and replace sorting logic
  const oldSortLogic = `const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
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

  const newSortLogic = `const getDeliveryTimestamp = (order: CompleteOrder) => {
    let baseDate = new Date();
    if (order.deliveryWeek === 'THIS_WEEK') {
      baseDate.setDate(baseDate.getDate() - baseDate.getDay());
    } else if (order.deliveryWeek === 'NEXT_WEEK') {
      baseDate.setDate(baseDate.getDate() - baseDate.getDay() + 7);
    } else {
      const parsed = new Date(order.deliveryWeek);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
    baseDate.setHours(0,0,0,0);
    
    const dayMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Shabbat': 6
    };
    
    let daysToAdd = dayMap[order.deliveryDay] || 0;
    const finalDate = new Date(baseDate);
    finalDate.setDate(baseDate.getDate() + daysToAdd);
    return finalDate.getTime();
  };

  const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortOrder === 'DATE') {
      const tA = getDeliveryTimestamp(a);
      const tB = getDeliveryTimestamp(b);
      if (tA !== tB) return tB - tA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOrder === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });`;

  content = content.replace(oldSortLogic, newSortLogic);

  fs.writeFileSync(filePath, content);
  console.log('Patched ' + filePath);
}

patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
patchFile('c:\\\\Users\\\\אברמי\\\\Downloads\\\\Malchut-app-v2\\\\src\\\\app\\\\dashboard\\\\orders\\\\OrdersListViewClient.tsx');
