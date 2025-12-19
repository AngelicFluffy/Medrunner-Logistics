// My Orders Page JavaScript
// API endpoint
const API = 'https://angla-unsanctionable-visually.ngrok-free.dev';

let currentUser = null;
let userOrders = [];
let currentOrder = null;

// Initialize with global auth system
window.addEventListener('medrunnerAuthReady', (event) => {
  currentUser = event.detail.user;
  // console.log('My Orders: User authenticated', currentUser);
  loadUserOrders();
});

// Check if user is authenticated
function isAuthenticated() {
  return window.MEDRUNNER_AUTH && window.MEDRUNNER_AUTH.isAuth();
}

// Get current user
function getCurrentUser() {
  return window.MEDRUNNER_AUTH ? window.MEDRUNNER_AUTH.getUser() : null;
}

// Load user orders from API
async function loadUserOrders() {
  const loadingContainer = document.getElementById('loading-container');
  const ordersContainer = document.getElementById('orders-container');
  const noOrdersMessage = document.getElementById('no-orders-message');

  if (!currentUser || !currentUser.discordId) {
    console.error('No user or Discord ID found');
    loadingContainer.classList.add('hidden');
    noOrdersMessage.classList.remove('hidden');
    return;
  }

  try {
    loadingContainer.classList.remove('hidden');
    ordersContainer.classList.add('hidden');
    noOrdersMessage.classList.add('hidden');

    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getUserOrders',
        discordUserId: currentUser.discordId
      })
    });

    const data = await response.json();

    if (data && data.success && data.data) {
      userOrders = data.data;
      // console.log(`Loaded ${userOrders.length} orders for user`);

      if (userOrders.length === 0) {
        loadingContainer.classList.add('hidden');
        noOrdersMessage.classList.remove('hidden');
      } else {
        renderOrders();
        loadingContainer.classList.add('hidden');
        ordersContainer.classList.remove('hidden');
      }
    } else {
      throw new Error(data.message || 'Failed to load orders');
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    showToast('Failed to load orders: ' + error.message, 'error');
    loadingContainer.classList.add('hidden');
    noOrdersMessage.classList.remove('hidden');
  }
}

// Render orders list
function renderOrders() {
  const ordersContainer = document.getElementById('orders-container');
  ordersContainer.innerHTML = '';

  // Separate active and completed orders
  const activeOrders = userOrders.filter(order => {
    const status = (order.status || '').toLowerCase();
    return status !== 'completed' && status !== 'cancelled';
  });

  const completedOrders = userOrders.filter(order => {
    const status = (order.status || '').toLowerCase();
    return status === 'completed' || status === 'cancelled';
  });

  // Active Orders Section
  if (activeOrders.length > 0) {
    const activeSection = document.createElement('div');
    activeSection.className = 'mb-8';
    activeSection.innerHTML = `
      <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
        <svg class="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        Active Orders
      </h2>
      <div class="grid grid-cols-1 gap-6" id="active-orders-grid"></div>
    `;
    ordersContainer.appendChild(activeSection);

    const activeGrid = document.getElementById('active-orders-grid');
    activeOrders.forEach(order => {
      const orderCard = createOrderCard(order, false);
      activeGrid.appendChild(orderCard);
    });
  }

  // Completed Orders Section
  if (completedOrders.length > 0) {
    const completedSection = document.createElement('div');
    completedSection.className = 'mb-8';
    completedSection.innerHTML = `
      <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
        <svg class="w-6 h-6 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
        </svg>
        Past Orders
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="completed-orders-grid"></div>
    `;
    ordersContainer.appendChild(completedSection);

    const completedGrid = document.getElementById('completed-orders-grid');
    completedOrders.forEach(order => {
      const orderCard = createOrderCard(order, true);
      completedGrid.appendChild(orderCard);
    });
  }
}

// Format availability timestamps to human-readable format
function formatAvailability(availabilityString) {
  if (!availabilityString) return 'Not specified';

  try {
    // Split by comma to get individual time ranges
    const ranges = availabilityString.split(',').map(r => r.trim());

    const formattedRanges = ranges.map(range => {
      // Split by dash to get from and to timestamps
      const [fromUnix, toUnix] = range.split('-').map(t => parseInt(t.trim()));

      if (!fromUnix || !toUnix) return null;

      const fromDate = new Date(fromUnix * 1000);
      const toDate = new Date(toUnix * 1000);

      // Format date
      const dateStr = fromDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      // Format times
      const fromTime = fromDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const toTime = toDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Check if it's an "all day" slot (00:00 to 23:59)
      const isAllDay = fromDate.getHours() === 0 && fromDate.getMinutes() === 0 &&
                       toDate.getHours() === 23 && toDate.getMinutes() === 59;

      if (isAllDay) {
        return `${dateStr} - All Day`;
      } else {
        return `${dateStr}, ${fromTime} - ${toTime}`;
      }
    }).filter(r => r !== null);

    if (formattedRanges.length === 0) {
      return 'Not specified';
    }

    return formattedRanges.join('<br>');
  } catch (error) {
    console.error('Error formatting availability:', error);
    return availabilityString; // Return original if parsing fails
  }
}

// Normalize status text for display (user-friendly names)
function normalizeStatusText(status) {
  const statusLower = (status || '').toLowerCase();

  if (statusLower === 'pending collection') {
    return 'Ready to Collect';
  }

  // Return original status for all other cases
  return status || 'Unknown';
}

// Get status icon SVG
function getStatusIcon(status) {
  const statusLower = (status || '').toLowerCase();

  if (statusLower === 'received') {
    return `<img src="Order Status/Order Recieved.svg" class="status-icon" alt="Received">`;
  } else if (statusLower === 'claimed' || statusLower === 'processing') {
    return `<img src="Order Status/Processing.svg" class="status-icon" alt="Processing">`;
  } else if (statusLower === 'ready to collect' || statusLower === 'ready' || statusLower === 'pending collection' || statusLower.includes('collect')) {
    return `<img src="Order Status/Ready to collect.svg" class="status-icon" alt="Ready to Collect">`;
  } else if (statusLower === 'completed') {
    return `<img src="Order Status/Completed.svg" class="status-icon" alt="Completed">`;
  } else if (statusLower === 'cancelled') {
    return `<img src="Order Status/Cancelled.svg" class="status-icon" alt="Cancelled">`;
  }

  return '';
}

// Create order card element
function createOrderCard(order, isCompleted = false) {
  const card = document.createElement('div');
  const cardSize = isCompleted ? 'p-4' : 'p-6';
  const textSize = isCompleted ? 'text-lg' : 'text-xl';
  const completedClass = isCompleted ? 'completed-order-card' : '';

  // Check if order is ready to collect for special glow effect
  const statusLower = (order.status || '').toLowerCase();
  const isReadyToCollect = statusLower === 'pending collection' || statusLower === 'ready to collect' || statusLower === 'ready';
  const glowClass = isReadyToCollect ? 'ready-to-collect-glow' : '';

  card.className = `professional-card rounded-2xl ${cardSize} cursor-pointer relative overflow-hidden ${completedClass} ${glowClass}`;
  card.setAttribute('data-order-id', order.orderId);
  card.onclick = () => openOrderDetails(order);

  const statusClass = getStatusClass(order.status);
  const statusText = normalizeStatusText(order.status);
  const statusIcon = getStatusIcon(order.status);

  // Format date
  const orderDate = order.date || order.timestamp || 'Unknown';

  // Parse items
  let itemsHtml = '';
  try {
    let items = [];

    // Try to parse as JSON first
    if (order.items) {
      try {
        items = JSON.parse(order.items);
      } catch (jsonError) {
        // If JSON parsing fails, treat as plain text string
        // Split by newlines or commas and create simple item list
        const itemLines = order.items.split(/[\n,]/).filter(line => line.trim());
        items = itemLines.map(line => ({ name: line.trim(), quantity: 1 }));
      }
    }

    if (Array.isArray(items) && items.length > 0) {
      itemsHtml = items.slice(0, 3).map(item =>
        `<li class="text-gray-400">• ${item.quantity || 1}x ${item.name || item.fullName || 'Unknown Item'}</li>`
      ).join('');
      if (items.length > 3) {
        itemsHtml += `<li class="text-gray-500 italic">• ... and ${items.length - 3} more items</li>`;
      }
    } else {
      itemsHtml = '<li class="text-gray-500 italic">No items listed</li>';
    }
  } catch (e) {
    console.error('Error parsing items:', e, order.items);
    // Fallback: just display the raw items string
    if (order.items) {
      itemsHtml = `<li class="text-gray-400">${order.items}</li>`;
    } else {
      itemsHtml = '<li class="text-gray-500 italic">No items listed</li>';
    }
  }

  card.innerHTML = `
    <!-- Status Icon Background -->
    ${statusIcon}

    <!-- Card Content -->
    <div class="relative z-10 h-full flex flex-col">
      <!-- Header Section -->
      <div class="mb-3">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <h3 class="${textSize} font-bold text-white tracking-tight">${order.orderId}</h3>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="flex items-center gap-2">
          <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <p class="text-gray-400 text-xs">${orderDate}</p>
        </div>
      </div>

      <!-- Content Section -->
      ${!isCompleted ? `
        <div class="flex-1 mb-3">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">${order.itemCount || 0} Items</p>
          </div>
          <ul class="text-sm space-y-1 pl-6">
            ${itemsHtml}
          </ul>
        </div>
      ` : `
        <div class="flex-1 mb-3">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <p class="text-sm text-gray-400">${order.itemCount || 0} items ordered</p>
          </div>
        </div>
      `}

      ${order.logistician ? `
        <div class="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-xs text-gray-400">Handled by</span>
          <span class="text-sm text-white font-medium">${order.logistician}</span>
        </div>
      ` : ''}

      <!-- Footer Section -->
      <div class="mt-auto pt-3 border-t border-gray-700/50 flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-xs">Click for details</span>
        </div>
        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>
  `;

  return card;
}

// Get status class for badge
function getStatusClass(status) {
  const statusLower = (status || '').toLowerCase();
  if (statusLower === 'received') return 'status-received';
  if (statusLower === 'claimed') return 'status-claimed';
  if (statusLower === 'processing') return 'status-processing';
  if (statusLower === 'completed') return 'status-completed';
  if (statusLower === 'cancelled') return 'status-cancelled';
  if (statusLower === 'ready to collect' || statusLower === 'ready' || statusLower === 'pending collection' || statusLower.includes('collect')) return 'status-ready';
  return 'status-received';
}

// Open order details panel
async function openOrderDetails(order) {
  currentOrder = order;
  const panel = document.getElementById('order-details-panel');
  const emptyState = document.getElementById('order-details-empty');
  const title = document.getElementById('order-details-title');
  const subtitle = document.getElementById('order-details-subtitle');
  const infoContainer = document.getElementById('order-details-info');

  title.textContent = order.orderId;
  subtitle.textContent = `Placed on ${order.date || order.timestamp || 'Unknown'}`;

  // Parse items
  let itemsHtml = '';
  try {
    let items = [];

    // Try to parse as JSON first
    if (order.items) {
      try {
        items = JSON.parse(order.items);
      } catch (jsonError) {
        // If JSON parsing fails, treat as plain text string
        // Split by newlines or commas and create simple item list
        const itemLines = order.items.split(/[\n,]/).filter(line => line.trim());
        items = itemLines.map(line => ({ name: line.trim(), quantity: 1 }));
      }
    }

    if (Array.isArray(items) && items.length > 0) {
      itemsHtml = items.map(item =>
        `<div class="flex justify-between items-center py-2 border-b border-gray-700/50">
          <span class="text-gray-300">${item.name || item.fullName || 'Unknown Item'}</span>
          <span class="text-white font-semibold">${item.quantity || 1}x</span>
        </div>`
      ).join('');
    } else {
      itemsHtml = '<p class="text-gray-500 italic">No items listed</p>';
    }
  } catch (e) {
    console.error('Error parsing items in modal:', e, order.items);
    // Fallback: just display the raw items string
    if (order.items) {
      itemsHtml = `<div class="text-gray-300 whitespace-pre-wrap">${order.items}</div>`;
    } else {
      itemsHtml = '<p class="text-gray-500 italic">No items listed</p>';
    }
  }

  const statusClass = getStatusClass(order.status);
  const statusText = normalizeStatusText(order.status);

  infoContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <p class="text-sm text-gray-400 mb-1">Status</p>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <p class="text-sm text-gray-400 mb-1">Order Date</p>
        <p class="text-white font-semibold">${order.date || order.timestamp || 'Unknown'}</p>
      </div>
      ${order.logistician ? `
        <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <p class="text-sm text-gray-400 mb-1">Handled By</p>
          <p class="text-white font-semibold">${order.logistician}</p>
        </div>
      ` : ''}
      <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <p class="text-sm text-gray-400 mb-1">Total Items</p>
        <p class="text-white font-semibold">${order.itemCount || 0}</p>
      </div>
    </div>

    <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-6">
      <h4 class="text-lg font-bold text-white mb-3">Items Requested</h4>
      <div class="space-y-1">
        ${itemsHtml}
      </div>
    </div>

    ${order.notes ? `
      <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-6">
        <h4 class="text-lg font-bold text-white mb-3">Notes</h4>
        <p class="text-gray-300">${order.notes}</p>
      </div>
    ` : ''}

    ${order.availability ? `
      <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <h4 class="text-lg font-bold text-white mb-3 flex items-center">
          <svg class="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
          </svg>
          Collection Availability
        </h4>
        <div class="text-gray-300 space-y-2">
          ${formatAvailability(order.availability).split('<br>').map(slot =>
            `<div class="flex items-center py-2 px-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <svg class="w-4 h-4 mr-2 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-sm">${slot}</span>
            </div>`
          ).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Load thread messages
  await loadThreadMessages(order.orderId);

  // Disable messaging for completed/cancelled orders
  const statusLower = (order.status || '').toLowerCase();
  const isOrderClosed = statusLower === 'completed' || statusLower === 'cancelled';

  const messageInput = document.getElementById('thread-message-input');
  const sendButton = document.querySelector('#order-details-panel button[onclick="sendThreadMessage()"]');
  const messageForm = sendButton?.parentElement?.parentElement;

  if (isOrderClosed) {
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = `This order is ${order.status}. Messaging is disabled.`;
      messageInput.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (sendButton) {
      sendButton.disabled = true;
      sendButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (messageForm) {
      const label = messageForm.querySelector('label');
      if (label) {
        label.innerHTML = `<span class="flex items-center gap-2">
          <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          Order ${order.status} - Messaging Disabled
        </span>`;
      }
    }
  } else {
    // Re-enable for active orders
    if (messageInput) {
      messageInput.disabled = false;
      messageInput.placeholder = 'Type your message here...';
      messageInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (messageForm) {
      const label = messageForm.querySelector('label');
      if (label) {
        label.textContent = 'Send a message to logistics staff:';
      }
    }
  }

  // Show panel and hide empty state
  emptyState.classList.add('hidden');
  panel.classList.remove('hidden');

  // Highlight the selected order card
  document.querySelectorAll('.professional-card').forEach(card => {
    card.classList.remove('active');
  });
  const selectedCard = document.querySelector(`[data-order-id="${order.orderId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('active');
  }
}

// Close order details panel
function closeOrderDetailsPanel() {
  const panel = document.getElementById('order-details-panel');
  const emptyState = document.getElementById('order-details-empty');
  panel.classList.add('hidden');
  emptyState.classList.remove('hidden');
  currentOrder = null;
}

// Load thread messages
async function loadThreadMessages(orderId) {
  const messageContainer = document.getElementById('thread-messages');

  try {
    messageContainer.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <p>Loading messages...</p>
      </div>
    `;

    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getThreadMessages',
        orderId: orderId
      })
    });

    const data = await response.json();

    if (data && data.success && data.data) {
      const messages = data.data;

      if (messages.length === 0) {
        messageContainer.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <p>No messages yet</p>
            <p class="text-sm text-gray-500 mt-2">Start a conversation with logistics staff</p>
          </div>
        `;
      } else {
        messageContainer.innerHTML = messages.map(msg => {
          const timestamp = new Date(msg.timestamp);
          const formattedTime = timestamp.toLocaleString();
          const isBot = msg.isBot || false;
          const isCurrentUser = currentUser && msg.authorId === currentUser.discordId;

          let borderColor = 'border-gray-600';
          let authorColor = 'text-gray-400';

          if (isBot) {
            borderColor = 'border-purple-500';
            authorColor = 'text-purple-400';
          } else if (isCurrentUser) {
            borderColor = 'border-blue-500';
            authorColor = 'text-blue-400';
          } else {
            borderColor = 'border-green-500';
            authorColor = 'text-green-400';
          }

          let content = msg.content || '';

          // Handle embeds
          if (msg.embeds && msg.embeds.length > 0) {
            msg.embeds.forEach(embed => {
              if (embed.description) {
                content += (content ? '\n\n' : '') + embed.description;
              }
            });
          }

          return `
            <div class="border-l-2 ${borderColor} pl-3 py-2">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs ${authorColor} font-semibold">${msg.author}${isBot ? ' (Bot)' : ''}${isCurrentUser ? ' (You)' : ''}</p>
                <p class="text-xs text-gray-500">${formattedTime}</p>
              </div>
              <p class="text-white text-sm whitespace-pre-wrap">${content || '<em>No content</em>'}</p>
            </div>
          `;
        }).join('');

        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    }
  } catch (error) {
    console.error('Error loading thread messages:', error);
    messageContainer.innerHTML = `
      <div class="text-center text-red-400 py-8">
        <svg class="w-12 h-12 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <p>Failed to load messages</p>
        <p class="text-sm text-gray-500 mt-2">${error.message}</p>
      </div>
    `;
  }
}

// Send message to thread
async function sendThreadMessage() {
  if (!currentOrder) {
    showToast('No order selected', 'error');
    return;
  }

  // Check if order is completed or cancelled
  const statusLower = (currentOrder.status || '').toLowerCase();
  if (statusLower === 'completed' || statusLower === 'cancelled') {
    showToast(`Cannot send messages - order is ${currentOrder.status}`, 'error');
    return;
  }

  const messageInput = document.getElementById('thread-message-input');
  const message = messageInput.value.trim();

  if (!message) {
    showToast('Please enter a message', 'error');
    return;
  }

  try {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        orderId: currentOrder.orderId,
        message: message,
        isStaff: false // This is from the client/user, not staff
      })
    });

    const data = await response.json();

    if (data && data.success) {
      showToast('Message sent successfully', 'success');
      messageInput.value = '';

      // Reload messages
      await loadThreadMessages(currentOrder.orderId);
    } else {
      throw new Error(data.message || 'Failed to send message');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    showToast('Failed to send message: ' + error.message, 'error');
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  toastMessage.textContent = message;

  // Change color based on type
  if (type === 'error') {
    toast.style.backgroundColor = '#ef4444';
    toast.style.borderColor = '#dc2626';
  } else {
    toast.style.backgroundColor = '#2c5278';
    toast.style.borderColor = '#1e3a5f';
  }

  toast.style.transform = 'translateX(0)';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
  }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is authenticated
  if (isAuthenticated()) {
    currentUser = getCurrentUser();
    if (currentUser) {
      // console.log('✓ Authenticated as:', currentUser.discordUsername);
      await loadUserOrders();
    } else {
      console.error('❌ No user data found');
      redirectToLogin();
    }
  } else {
    // Not authenticated, redirect to main page
    console.error('❌ User not authenticated');
    redirectToLogin();
  }
});

// Redirect to login
function redirectToLogin() {
  alert('Please log in with Discord to view your orders.');
  window.location.href = 'index.html';
}

// Close modal on escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeOrderDetailsModal();
  }
});
