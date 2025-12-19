window.MEDRUNNER_CONFIG = {
  SHEET_ID: '1tk10DF0umYA8hA8QoWmLCWuRMY1cmdp7teoauq3PRPg',

  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbze-lv7LWEnooZ0vUrWG5anCKGYBgQsMHlhYDyLc5Sq8muH6-CE-fyUA_OIm63C-g8dFg/exec',

  // Sheet names
  SHEETS: {
    INVENTORY: 'Inventory', // Tab 1 - Equipment listings
    LOOKUP: 'Lookup', // Tab 2 - Kit calculations
    ORDERS: 'Orders' // Tab 3 - Equipment requests
  },
  
  // Organization details
  ORGANIZATION: {
    NAME: 'Medrunner Logistics',
    DESCRIPTION: 'All hail the box. Keeper of things, pakager of all, let your boundless equality extend eternally',
    CONTACT: 'my ass'
  },
  
  EQUIPMENT: {
    TRAINING_KITS: [
      {
        name: 'Rookie Kit',
        description: 'Complete training package for new medical personnel',
        items: [
          'Balor HCH Helmet White x3',
          'ADP Core Red x3', 
          'ADP Arms White x3',
          'ADP Legs White x3',
          'MacFlex Backpack White x3',
          'Beacon Undersuit x3',
          'P4-AR Rifle x3'
        ],
        restricted: false
      },
      {
        name: 'Academy Supply / Lesson 0',
        description: 'Academy-restricted advanced training package',
        items: [
          'Beacon Undersuit White',
          'MacFlex Backpack White',
          'P4-AR with 20x magazines',
          'S-38 Pistol with 10x clips',
          'Medgun with 2x refill',
          'Multitool with tractor beam',
          '4x Hemozal medpens',
          'Pink Quickflare',
          '5x ReadyMeal (Beef Chunks)',
          '5x Vestal Water'
        ],
        restricted: true,
        requiresAcademyAccess: true
      }
    ],
    
    INDIVIDUAL_ITEMS: [
      { name: 'ADP Legs White', category: 'Armor Components', restricted: false },
      { name: 'Balor HCH Helmet White', category: 'Armor Components', restricted: false },
      { name: 'ADP Arms White', category: 'Armor Components', restricted: false },
      { name: 'ADP Core Red', category: 'Armor Components', restricted: false },
      { name: 'MacFlex Backpack White', category: 'Equipment', restricted: false },
      
      { name: 'P4-AR', category: 'Weapons', restricted: false },
      { name: 'S-38 Handgun', category: 'Weapons', restricted: false },
      { name: 'BR-2 Shotgun', category: 'Weapons', restricted: false },
      { name: 'P8-SC SMG', category: 'Weapons', restricted: false },
      { name: 'Karna Rifle', category: 'Weapons', restricted: false },
      { name: 'FS-9 LMG', category: 'Weapons', restricted: false }
    ]
  },
  
  REQUEST_STATUSES: [
    'Received',
    'Processing', 
    'Ready for Pickup',
    'Completed',
    'Cancelled'
  ],
  
  DELIVERY_METHODS: [
    'Collection at Medrunner HQ',
    'Field Delivery (Emergency Only)'
  ]
};

window.MedrunnerConfig = {
  
  isConfigured: function() {
    return window.MEDRUNNER_CONFIG.SHEET_ID !== 'YOUR_EXISTING_SHEET_ID_HERE' &&
           window.MEDRUNNER_CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE';
  },
  getEquipmentItem: function(itemName) {
    for (const kit of window.MEDRUNNER_CONFIG.EQUIPMENT.TRAINING_KITS) {
      if (kit.name === itemName) {
        return { ...kit, type: 'training_kit' };
      }
    }
    
    for (const item of window.MEDRUNNER_CONFIG.EQUIPMENT.INDIVIDUAL_ITEMS) {
      if (item.name === itemName) {
        return { ...item, type: 'individual_item' };
      }
    }
    
    return null;
  },
  
  requiresAcademyAccess: function(itemName) {
    const item = this.getEquipmentItem(itemName);
    return item && (item.restricted || item.requiresAcademyAccess);
  },
  
  getAllEquipment: function() {
    return {
      trainingKits: window.MEDRUNNER_CONFIG.EQUIPMENT.TRAINING_KITS,
      individualItems: window.MEDRUNNER_CONFIG.EQUIPMENT.INDIVIDUAL_ITEMS
    };
  },
  
  validate: function() {
    const config = window.MEDRUNNER_CONFIG;
    const errors = [];

    if (!config.SHEET_ID || config.SHEET_ID === 'YOUR_EXISTING_SHEET_ID_HERE') {
      errors.push('Google Sheet ID not configured');
    }

    if (!config.APPS_SCRIPT_URL || config.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      errors.push('Google Apps Script URL not configured');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};

// on load
document.addEventListener('DOMContentLoaded', function() {
  const validation = window.MedrunnerConfig.validate();
  
  if (!validation.isValid) {
    console.warn('Medrunner Configuration Issues:', validation.errors);
    
    // configuration warning
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #dc2626;
      color: white;
      padding: 10px;
      text-align: center;
      z-index: 9999;
      font-weight: bold;
    `;
    warningDiv.innerHTML = `
      ⚠️ Configuration Required: Please update medrunner-config.js with your Google Sheet and Apps Script details
    `;
    document.body.appendChild(warningDiv);
  }
});
