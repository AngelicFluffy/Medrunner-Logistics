const CONFIG = {
  SHEET_ID: '1tk10DF0umYA8hA8QoWmLCWuRMY1cmdp7teoauq3PRPg',
  INVENTORY_SHEET: 'Inventory',
  LOOKUP_SHEET: 'Lookup',
  ORDERS_SHEET: 'Orders'
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getInventory';

    switch (action) {
      case 'getInventory':
        return getInventoryData();
      case 'submitRequest':
        return submitEquipmentRequest(e);
      case 'checkAcademyAccess':
        return checkAcademyAccess(e);
      case 'getKitInfo':
        return getKitInfo(e);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return createResponse(false, 'Server error: ' + error.message);
  }
}

function getInventoryData() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.INVENTORY_SHEET);

    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }

    const data = sheet.getRange('A:I').getValues();

    const inventory = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (!row[2]) continue;

      const listing = row[0]; // Column A - Listing (True/False)
      const restriction = row[1]; // Column B - Restriction (None/Academy)
      const name = row[2]; // Column C - Name
      const category = row[3]; // Column D - Item Category
      const stock = row[4]; // Column E - Stock (X/NUM)
      const imageLink = row[5]; // Column F - Store Image Link
      const marketPrice = row[7]; // Column H - Market Price
      const requiredMissions = row[8]; // Column I - Required Missions

      // Only include items that are set to be listed
      if (listing === true || listing === 'TRUE' || listing === 'true') {
        inventory[name] = {
          name: name,
          category: category || 'Individual',
          stock: stock,
          restriction: restriction || 'None',
          available: true,
          image: (imageLink && imageLink.trim() !== '') ? imageLink : 'Placeholder.png',
          marketPrice: marketPrice,
          requiredMissions: requiredMissions,
          isAcademyRestricted: (restriction === 'Academy')
        };
      }
    }

    return createResponse(true, 'Inventory loaded successfully', { inventory });

  } catch (error) {
    console.error('Error getting inventory:', error);
    return createResponse(false, 'Failed to load inventory: ' + error.message);
  }
}

function submitEquipmentRequest(e) {
  try {
    if (!e || !e.parameter) {
      return createResponse(false, 'No request data provided - this function needs to be called via web app');
    }

    const orderId = 'MRS-' + Math.floor(Math.random() * 900000000 + 100000000);

    const requestData = {
      orderId: orderId,
      timestamp: e.parameter.timestamp,
      date: e.parameter.date,
      requester: e.parameter.discordUsername,
      items: JSON.parse(e.parameter.items || '[]'),
      availability: e.parameter.availability || '',
      notes: e.parameter.notes || ''
    };

    if (!requestData.requester || !requestData.items.length) {
      throw new Error('Missing required fields');
    }

    let orderType = 'Medrunner';
    const hasAcademyItems = requestData.items.some(item =>
      item.name.includes('Academy') || item.name.includes('Lesson 0')
    );
    if (hasAcademyItems) {
      orderType = 'Academy';
    }

    const inventorySheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.INVENTORY_SHEET);
    const inventoryData = inventorySheet.getDataRange().getValues();

    const inventoryMap = {};
    for (let i = 1; i < inventoryData.length; i++) {
      const name = inventoryData[i][2];
      const marketPrice = inventoryData[i][7] || 0;
      if (name) {
        inventoryMap[name] = parseFloat(marketPrice) || 0;
      }
    }

    let totalCost = 0;
    for (const item of requestData.items) {
      const itemCost = inventoryMap[item.name] || 0;
      totalCost += itemCost * parseInt(item.quantity);
    }

    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.ORDERS_SHEET);

    if (!sheet) {
      throw new Error('Orders sheet not found');
    }

    const rowData = [
      requestData.orderId,
      requestData.timestamp,
      requestData.date,
      requestData.requester,
      requestData.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
      requestData.items.reduce((total, item) => total + parseInt(item.quantity), 0),
      '',
      orderType,
      totalCost,
      '',
      'Received',
      requestData.availability || '',
      requestData.notes || ''
    ];

    const newRowIndex = sheet.getLastRow() + 1;
    sheet.appendRow(rowData);

    const stipendFormula = `=IF(ISNUMBER(SEARCH("Rookie Kit", E${newRowIndex})), Lookup!$G$19, 0)`;
    sheet.getRange(newRowIndex, 7).setFormula(stipendFormula); // Column G

    updateOrderTracking(requestData.orderId, '', 'Received', true);
    
    return createResponse(true, 'Equipment request submitted successfully', {
      orderId: requestData.orderId,
      status: 'Received'
    });
    
  } catch (error) {
    console.error('Error submitting request:', error);
    return createResponse(false, 'Failed to submit request: ' + error.message);
  }
}

function checkAcademyAccess(e) {
  try {
    return createResponse(true, 'Academy access check disabled', { hasAccess: true });

  } catch (error) {
    console.error('Error checking Academy access:', error);
    return createResponse(false, 'Failed to check access: ' + error.message);
  }
}

function checkUserAcademyAccess(username) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.USERS_SHEET);
    
    if (!sheet) {
      console.log('Users sheet not found, allowing access');
      return true;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const usernameCol = headers.indexOf('Discord Username');
    const academyCol = headers.indexOf('Academy Access');
    
    if (usernameCol === -1) {
      console.log('Username column not found, allowing access');
      return true;
    }
    
    for (const row of rows) {
      if (row[usernameCol] === username) {
        return academyCol !== -1 ? (row[academyCol] === 'TRUE' || row[academyCol] === true) : true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  const output = ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);

  // Add CORS headers to allow requests from file:// protocol
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  return output;
}

function setupSheets() {
  console.log('Setup not needed - using existing Master Spreadsheet structure');
  console.log('Make sure your spreadsheet has these tabs:');
  console.log('- Inventory (for equipment listings)');
  console.log('- Lookup (for kit calculations)');
  console.log('- Orders (for storing equipment requests)');
  return 'Using existing Master Spreadsheet - no setup required';
}

function testInventoryLoad() {
  try {
    console.log('Testing inventory load...');
    const result = getInventoryData();

    const jsonResponse = JSON.parse(result.getContent());

    if (jsonResponse.success) {
      console.log('✅ Inventory loaded successfully!');
      console.log('Number of items found:', Object.keys(jsonResponse.data.inventory).length);
      console.log('Items:', Object.keys(jsonResponse.data.inventory));
      return 'Test passed - inventory loaded successfully';
    } else {
      console.error('❌ Failed to load inventory:', jsonResponse.message);
      return 'Test failed: ' + jsonResponse.message;
    }
  } catch (error) {
    console.error('❌ Test error:', error);
    return 'Test error: ' + error.message;
  }
}

// ============================================================================
// ORDER TRACKING
// ============================================================================

function initializeOrderTracking() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let trackingSheet = ss.getSheetByName('Order Tracking');
  if (!trackingSheet) {
    trackingSheet = ss.insertSheet('Order Tracking');

    const headers = [
      'Order ID',           // A - From Orders tab
      'Logistician',        // B - Column J on Orders tab
      'Status',            // C - Column K on Orders tab
      'Placed Timestamp',   // D - When order was added
      'Claimed Timestamp',  // E - When someone claims
      'Processing Timestamp', // F - When status goes to Ready to Collect
      'Completion Timestamp'  // G - When completed or cancelled
    ];

    trackingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    trackingSheet.getRange(1, 1, 1, headers.length)
      .setBackground('#2c5278')
      .setFontColor('white')
      .setFontWeight('bold')
      .setBorder(true, true, true, true, true, true);

    trackingSheet.setColumnWidth(1, 150); // Order ID
    trackingSheet.setColumnWidth(2, 150); // Logistician
    trackingSheet.setColumnWidth(3, 120); // Status
    trackingSheet.setColumnWidths(4, 4, 160); // Timestamp columns

    const timestampRange = trackingSheet.getRange(2, 4, 1000, 4);
    timestampRange.setNumberFormat('mm/dd/yyyy hh:mm:ss');

    console.log('Order Tracking sheet initialized with Medrunner specifications');
  }

  return trackingSheet;
}

function updateOrderTracking(orderId, logistician = '', status = '', isNewOrder = false) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let trackingSheet = ss.getSheetByName('Order Tracking');

  if (!trackingSheet) {
    trackingSheet = initializeOrderTracking();
  }

  const data = trackingSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === orderId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    rowIndex = data.length + 1;
    trackingSheet.getRange(rowIndex, 1).setValue(orderId);

    if (isNewOrder) {
      const placedCell = trackingSheet.getRange(rowIndex, 4);
      placedCell.setValue(new Date());
      placedCell.setNumberFormat('mm/dd/yyyy hh:mm:ss');
    }
  }

  const now = new Date();

  if (logistician) {
    const currentLogistician = trackingSheet.getRange(rowIndex, 2).getValue();
    trackingSheet.getRange(rowIndex, 2).setValue(logistician);

    if (logistician && logistician.trim() !== '' && !currentLogistician) {
      const claimedCell = trackingSheet.getRange(rowIndex, 5);
      claimedCell.setValue(now);
      claimedCell.setNumberFormat('mm/dd/yyyy hh:mm:ss');
    }
  }

  if (status) {
    const currentStatus = trackingSheet.getRange(rowIndex, 3).getValue();
    trackingSheet.getRange(rowIndex, 3).setValue(status);

    switch (status) {
      case 'Processing':
        break;

      case 'Pending Collection':
        if (!trackingSheet.getRange(rowIndex, 6).getValue()) {
          const processingCell = trackingSheet.getRange(rowIndex, 6);
          processingCell.setValue(now);
          processingCell.setNumberFormat('mm/dd/yyyy hh:mm:ss');
        }
        break;

      case 'Completed':
      case 'Cancelled':
        if (!trackingSheet.getRange(rowIndex, 7).getValue()) {
          const completionCell = trackingSheet.getRange(rowIndex, 7);
          completionCell.setValue(now);
          completionCell.setNumberFormat('mm/dd/yyyy hh:mm:ss');
        }
        break;
    }
  }

  console.log(`Order tracking updated: ${orderId} - ${logistician} - ${status}`);
}

function populateExistingOrderTracking() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const orders = ordersSheet.getDataRange().getValues();
  initializeOrderTracking();
  for (let i = 1; i < orders.length; i++) {
    const orderId = orders[i][0];
    const timestamp = orders[i][1];
    const logistician = orders[i][9];
    const status = orders[i][10];

    if (orderId) {
      updateOrderTracking(orderId, logistician, status, true);
      const trackingSheet = ss.getSheetByName('Order Tracking');
      const trackingData = trackingSheet.getDataRange().getValues();
      for (let j = 1; j < trackingData.length; j++) {
        if (trackingData[j][0] === orderId) {
          trackingSheet.getRange(j + 1, 4).setValue(timestamp); // Set placed timestamp
          break;
        }
      }
    }
  }

  console.log(`Populated tracking for ${orders.length - 1} existing orders`);
}

function fixOrdersSheetHeaders() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const correctHeaders = [
    'Order ID',        // A
    'Timestamp',       // B
    'Date',           // C
    'Requester',      // D
    'Items Ordered',  // E
    'Number of Items', // F
    'Stipend Uses',   // G
    'Order Type',     // H
    'Cost',           // I
    'Logistician',    // J
    'Status',         // K
    'Availability',   // L
    'Notes'           // M
  ];

  ordersSheet.getRange(1, 1, 1, correctHeaders.length).setValues([correctHeaders]);
  ordersSheet.getRange(1, 1, 1, correctHeaders.length)
    .setBackground('#2c5278')
    .setFontColor('white')
    .setFontWeight('bold');
  console.log('✅ Orders sheet headers fixed for Discord bot compatibility');
  console.log('Headers set:', correctHeaders);
}

function debugOrderTracking() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const trackingSheet = ss.getSheetByName('Order Tracking');

  if (!trackingSheet) {
    console.log('❌ Order Tracking sheet not found');
    return;
  }

  const testOrderId = 'TEST-' + Math.floor(Math.random() * 1000000);
  console.log('🧪 Testing with order ID:', testOrderId);
  updateOrderTracking(testOrderId, '', 'Received', true);
  const data = trackingSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === testOrderId) {
      console.log('✅ Found test order in tracking sheet:');
      console.log('Order ID:', data[i][0]);
      console.log('Completed by:', data[i][1]);
      console.log('Status:', data[i][2]);
      console.log('Placed Timestamp:', data[i][3]);
      console.log('Offered Timestamp:', data[i][4]);
      console.log('Claimed Timestamp:', data[i][5]);
      console.log('Processing Timestamp:', data[i][6]);
      console.log('Completion Timestamp:', data[i][7]);
      return;
    }
  }

  console.log('❌ Test order not found in tracking sheet');
}

function fixTimestampFormats() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const trackingSheet = ss.getSheetByName('Order Tracking');

  if (!trackingSheet) {
    console.log('❌ Order Tracking sheet not found');
    return;
  }

  const lastRow = trackingSheet.getLastRow();

  if (lastRow <= 1) {
    console.log('⚠️ No data rows to fix');
    return;
  }

  // Apply the correct format to all timestamp columns (D, E, F, G)
  const timestampRange = trackingSheet.getRange(2, 4, lastRow - 1, 4);
  timestampRange.setNumberFormat('mm/dd/yyyy hh:mm:ss');

  console.log(`✅ Fixed timestamp formats for ${lastRow - 1} rows`);
  console.log('All timestamp columns now use format: mm/dd/yyyy hh:mm:ss');
}

function getKitInfo(e) {
  try {
    const kitName = e.parameter.kitName;
    if (!kitName) {
      return createResponse(false, 'Kit name is required');
    }

    console.log('🔍 Looking for kit information:', kitName);

    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const lookupSheet = spreadsheet.getSheetByName(CONFIG.LOOKUP_SHEET);

    if (!lookupSheet) {
      console.error('❌ Lookup sheet not found');
      return createResponse(false, 'Lookup sheet not found');
    }

    const range = lookupSheet.getRange('E2:F');
    const data = range.getValues();

    console.log('📊 Total rows of data:', data.length);
    console.log('🔍 Looking for kit name:', `"${kitName}"`);

    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(`Row ${i + 2}: E="${data[i][0]}" | F="${data[i][1]}"`);
    }

    let kitStartRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0]) {
        const cellValue = data[i][0].toString().toLowerCase().trim();
        const searchValue = kitName.toLowerCase().trim();
        console.log(`🔍 Comparing: "${cellValue}" === "${searchValue}" ?`, cellValue === searchValue);

        if (cellValue === searchValue) {
          kitStartRow = i;
          break;
        }
      }
    }

    if (kitStartRow === -1) {
      console.log('❌ Kit not found:', kitName);
      console.log('Available kits found in column E:');
      for (let i = 0; i < Math.min(20, data.length); i++) {
        if (data[i][0] && data[i][0].toString().trim() !== '') {
          console.log(`  - "${data[i][0]}"`);
        }
      }
      return createResponse(false, 'Kit information not found');
    }

    console.log('✅ Found kit at row:', kitStartRow + 2);

    const kitData = {
      name: data[kitStartRow][0] || kitName,
      sections: []
    };

    let currentRow = kitStartRow + 1;

    if (currentRow < data.length && data[currentRow][0] &&
        data[currentRow][0].toString().toLowerCase().includes('items')) {
      currentRow++;
    }

    let currentSection = null;

    while (currentRow < data.length) {
      const itemName = data[currentRow][0];
      const itemQuantity = data[currentRow][1];

      if (itemName && itemName.toString().trim() === '-') {
        console.log('✅ Found end marker at row:', currentRow + 2);
        break;
      }

      if (!itemName || itemName.toString().trim() === '') {
        currentRow++;
        continue;
      }

      const itemNameStr = itemName.toString().trim();
      const quantityStr = itemQuantity ? itemQuantity.toString().trim() : '';

      if (itemNameStr && (!quantityStr || quantityStr === '')) {
        if (currentSection) {
          kitData.sections.push(currentSection);
        }
        currentSection = {
          name: itemNameStr,
          items: []
        };
        console.log('📂 Found section:', itemNameStr);
      } else if (itemNameStr && quantityStr && currentSection) {
        currentSection.items.push({
          name: itemNameStr,
          quantity: quantityStr
        });
        console.log('📦 Added item to', currentSection.name + ':', itemNameStr, 'Qty:', quantityStr);
      } else if (itemNameStr && quantityStr && !currentSection) {
        if (!kitData.sections.find(s => s.name === 'Items')) {
          kitData.sections.push({ name: 'Items', items: [] });
        }
        kitData.sections.find(s => s.name === 'Items').items.push({
          name: itemNameStr,
          quantity: quantityStr
        });
        console.log('📦 Added item to default section:', itemNameStr, 'Qty:', quantityStr);
      }

      currentRow++;

      // Anti Loop
      if (currentRow > data.length + 100) {
        console.warn('⚠️ Safety break - too many rows processed');
        break;
      }
    }

    if (currentSection) {
      kitData.sections.push(currentSection);
    }

    console.log('✅ Kit data parsed successfully:', JSON.stringify(kitData, null, 2));

    return createResponse(true, 'Kit information retrieved successfully', kitData);

  } catch (error) {
    console.error('❌ Error getting kit info:', error);
    return createResponse(false, 'Error retrieving kit information: ' + error.message);
  }
}
