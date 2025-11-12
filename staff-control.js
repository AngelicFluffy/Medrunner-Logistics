let currentOrderView = 'active';
let allOrders = [];
let currentOrder = null;
let filteredArchivedOrders = [];
let currentPage = 1;
let ordersPerPage = 10;

const BOT_API_URL = 'http://localhost:3000';

const STATUS_COLORS = {
  'Received': 'status-received',
  'Processing': 'status-processing',
  'Pending Collection': 'status-pending',
  'Completed': 'status-completed',
  'Cancelled': 'status-cancelled'
};

const STATUS_ICONS = {
  'Received': '',
  'Processing': '',
  'Pending Collection': '',
  'Completed': '',
  'Cancelled': ''
};

let isLoading = false;

// Format availability timestamps for display
function formatAvailabilityForDisplay(availabilityStr) {
  if (!availabilityStr || availabilityStr.trim() === '') {
    return '<p class="text-gray-400 text-sm">Not specified</p>';
  }

  try {
    const ranges = availabilityStr.split(',').map(range => range.trim());
    const formatted = ranges.map(range => {
      const [fromUnix, toUnix] = range.split('-').map(ts => parseInt(ts.trim()));

      if (!fromUnix || !toUnix) return null;

      const fromDate = new Date(fromUnix * 1000);
      const toDate = new Date(toUnix * 1000);

      const dateStr = fromDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        year: 'numeric'
      });

      const fromTime = fromDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const toTime = toDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      return `
        <div class="flex items-center space-x-2 text-white text-sm">
          <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
          </svg>
          <span><strong>${dateStr}:</strong> ${fromTime} - ${toTime}</span>
        </div>
      `;
    }).filter(Boolean);

    return formatted.length > 0 ? formatted.join('') : '<p class="text-gray-400 text-sm">Not specified</p>';
  } catch (error) {
    console.error('Error formatting availability:', error);
    return '<p class="text-red-400 text-sm">Invalid format</p>';
  }
}

async function fetchOrders() {
  if (isLoading) return;

  try {
    isLoading = true;
    const loadingEl = document.getElementById('orders-loading');
    const activeContainer = document.getElementById('active-orders-container');
    const completedContainer = document.getElementById('completed-orders-container');
    const noOrdersMsg = document.getElementById('no-orders-message');

    loadingEl.classList.remove('hidden');
    activeContainer.innerHTML = '';
    completedContainer.innerHTML = '';
    noOrdersMsg.classList.add('hidden');

    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getOrders' })
    });

    const data = await response.json();

    if (!data || !data.success) {
      throw new Error(data.message || 'Failed to fetch orders');
    }

    allOrders = data.data || [];
    renderOrders();
    loadingEl.classList.add('hidden');
  } catch (error) {
    console.error('Error fetching orders:', error);
    document.getElementById('orders-loading').classList.add('hidden');
    showToast('Failed to load orders. Make sure Discord bot is running.', 'error');
  } finally {
    isLoading = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'No date';

  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    return dateString;
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';

  try {
    // Handle different timestamp formats
    let date;

    // If it's just a time string (HH:MM:SS), we need to add today's date
    if (typeof timestamp === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(timestamp)) {
      // It's a time-only string, combine with today's date
      const today = new Date();
      const [hours, minutes, seconds] = timestamp.split(':');
      date = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                      parseInt(hours), parseInt(minutes), parseInt(seconds));
    } else if (typeof timestamp === 'string' && /^\d{2}\/\d{2}\/\d{4},\s\d{2}:\d{2}:\d{2}$/.test(timestamp)) {
      // It's already in MM/DD/YYYY, HH:MM:SS format
      return timestamp;
    } else {
      // Try to parse as a regular date
      date = new Date(timestamp);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return timestamp.toString();
    }

    // Format as MM/DD/YYYY, HH:MM:SS
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    console.error('Error formatting timestamp:', timestamp, e);
    return timestamp ? timestamp.toString() : 'N/A';
  }
}

function renderOrders() {
  const activeContainer = document.getElementById('active-orders-container');
  const completedContainer = document.getElementById('completed-orders-container');
  const noOrdersMsg = document.getElementById('no-orders-message');

  activeContainer.innerHTML = '';
  completedContainer.innerHTML = '';

  const openOrders = allOrders.filter(order =>
    order.status !== 'Completed' &&
    order.status !== 'Cancelled' &&
    (!order.logistician || order.logistician.trim() === '')
  );

  const activeOrders = allOrders.filter(order =>
    order.status !== 'Completed' &&
    order.status !== 'Cancelled' &&
    order.logistician &&
    order.logistician.trim() !== ''
  );

  const completedOrders = allOrders.filter(order =>
    order.status === 'Completed' || order.status === 'Cancelled'
  );

  const totalActive = openOrders.length + activeOrders.length;
  document.getElementById('active-count').textContent = totalActive;
  document.getElementById('completed-count').textContent = completedOrders.length;

  if (currentOrderView === 'active') {
    activeContainer.className = 'space-y-8';

    if (totalActive === 0) {
      noOrdersMsg.classList.remove('hidden');
    } else {
      // Open Orders Section
      if (openOrders.length > 0) {
        const openSection = document.createElement('div');
        openSection.innerHTML = `
          <div class="mb-4">
            <h3 class="text-2xl font-bold text-yellow-400 mb-2">OPEN ORDERS</h3>
            <p class="text-gray-400 text-sm mb-4">Orders awaiting assignment (${openOrders.length})</p>
            <div class="h-px bg-gradient-to-r from-yellow-500/50 via-yellow-500/20 to-transparent"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="open-orders-grid"></div>
        `;
        activeContainer.appendChild(openSection);

        const openGrid = openSection.querySelector('#open-orders-grid');
        openOrders.forEach(order => {
          openGrid.appendChild(createOrderCard(order, true));
        });
      }

      // Active Orders Section
      if (activeOrders.length > 0) {
        const activeSection = document.createElement('div');
        activeSection.innerHTML = `
          <div class="mb-4 mt-8">
            <h3 class="text-2xl font-bold text-blue-400 mb-2">ACTIVE ORDERS</h3>
            <p class="text-gray-400 text-sm mb-4">Orders currently being worked on (${activeOrders.length})</p>
            <div class="h-px bg-gradient-to-r from-blue-500/50 via-blue-500/20 to-transparent"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="active-orders-grid"></div>
        `;
        activeContainer.appendChild(activeSection);

        const activeGrid = activeSection.querySelector('#active-orders-grid');
        activeOrders.forEach(order => {
          activeGrid.appendChild(createOrderCard(order, false));
        });
      }
    }
  } else {
    // Archived orders view with search and pagination
    if (completedOrders.length === 0) {
      noOrdersMsg.classList.remove('hidden');
    } else {
      // Sort by date (newest first)
      const sortedOrders = [...completedOrders].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      filteredArchivedOrders = sortedOrders;
      renderArchivedOrders();
    }
  }
}

function filterArchivedOrders() {
  const searchOrderId = document.getElementById('search-order-id').value.toLowerCase();
  const searchRequester = document.getElementById('search-requester').value.toLowerCase();
  const searchlogistician = document.getElementById('search-logistician').value.toLowerCase();

  const completedOrders = allOrders.filter(order =>
    order.status === 'Completed' || order.status === 'Cancelled'
  );

  // Sort by date (newest first)
  const sortedOrders = [...completedOrders].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
  });

  filteredArchivedOrders = sortedOrders.filter(order => {
    const matchesOrderId = !searchOrderId || order.orderId.toLowerCase().includes(searchOrderId);
    const matchesRequester = !searchRequester || (order.requester && order.requester.toLowerCase().includes(searchRequester));
    const matcheslogistician = !searchlogistician || (order.logistician && order.logistician.toLowerCase().includes(searchlogistician));

    return matchesOrderId && matchesRequester && matcheslogistician;
  });

  currentPage = 1;
  renderArchivedOrders();
}

function changeOrdersPerPage() {
  ordersPerPage = parseInt(document.getElementById('orders-per-page').value);
  currentPage = 1;
  renderArchivedOrders();
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredArchivedOrders.length / ordersPerPage);

  if (direction === 'prev' && currentPage > 1) {
    currentPage--;
  } else if (direction === 'next' && currentPage < totalPages) {
    currentPage++;
  }

  renderArchivedOrders();
}

function goToPage(page) {
  currentPage = page;
  renderArchivedOrders();
}

function renderArchivedOrders() {
  const completedContainer = document.getElementById('completed-orders-container');
  completedContainer.innerHTML = '';
  completedContainer.className = 'space-y-4';

  // Search controls
  const searchSection = document.createElement('div');
  searchSection.className = 'professional-card p-6 mb-6';
  searchSection.innerHTML = `
    <h3 class="text-xl font-bold text-white mb-4">Search Archived Orders</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-gray-400 text-sm mb-2">Order ID</label>
        <input type="text" id="search-order-id" placeholder="Search by Order ID..."
               class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
               oninput="filterArchivedOrders()">
      </div>
      <div>
        <label class="block text-gray-400 text-sm mb-2">Requester</label>
        <input type="text" id="search-requester" placeholder="Search by Requester..."
               class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
               oninput="filterArchivedOrders()">
      </div>
      <div>
        <label class="block text-gray-400 text-sm mb-2">logistician</label>
        <input type="text" id="search-logistician" placeholder="Search by logistician..."
               class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
               oninput="filterArchivedOrders()">
      </div>
    </div>
  `;
  completedContainer.appendChild(searchSection);

  // Table header
  const tableHeader = document.createElement('div');
  tableHeader.className = 'professional-card p-4 bg-gray-800/50';
  tableHeader.innerHTML = `
    <div class="grid grid-cols-12 gap-4 text-gray-400 text-sm font-semibold">
      <div class="col-span-2">Order ID</div>
      <div class="col-span-2">Received</div>
      <div class="col-span-2">Requester</div>
      <div class="col-span-3">Items Ordered</div>
      <div class="col-span-2">Logistician</div>
      <div class="col-span-1">Status</div>
    </div>
  `;
  completedContainer.appendChild(tableHeader);

  // Paginated orders
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = filteredArchivedOrders.slice(startIndex, endIndex);

  if (paginatedOrders.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'professional-card p-8 text-center';
    noResults.innerHTML = '<p class="text-gray-400">No orders found matching your search criteria</p>';
    completedContainer.appendChild(noResults);
  } else {
    paginatedOrders.forEach(order => {
      completedContainer.appendChild(createArchivedOrderRow(order));
    });
  }

  // Pagination controls
  const totalPages = Math.ceil(filteredArchivedOrders.length / ordersPerPage);
  if (totalPages > 1 || filteredArchivedOrders.length > 10) {
    const paginationSection = document.createElement('div');
    paginationSection.className = 'professional-card p-4 flex items-center justify-between';

    let pageButtons = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons += `
        <button onclick="goToPage(${i})"
                class="px-4 py-2 rounded-lg ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} transition-all">
          ${i}
        </button>
      `;
    }

    paginationSection.innerHTML = `
      <div class="flex items-center space-x-2">
        <label class="text-gray-400 text-sm">Orders per page:</label>
        <select id="orders-per-page" onchange="changeOrdersPerPage()"
                class="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none">
          <option value="10" ${ordersPerPage === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${ordersPerPage === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${ordersPerPage === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${ordersPerPage === 100 ? 'selected' : ''}>100</option>
        </select>
        <span class="text-gray-400 text-sm ml-4">
          Showing ${startIndex + 1}-${Math.min(endIndex, filteredArchivedOrders.length)} of ${filteredArchivedOrders.length}
        </span>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="changePage('prev')"
                ${currentPage === 1 ? 'disabled' : ''}
                class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          Previous
        </button>
        ${pageButtons}
        <button onclick="changePage('next')"
                ${currentPage === totalPages ? 'disabled' : ''}
                class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          Next
        </button>
      </div>
    `;
    completedContainer.appendChild(paginationSection);
  }
}

function createArchivedOrderRow(order) {
  const row = document.createElement('div');
  row.className = 'professional-card p-4 hover:bg-gray-800/50 cursor-pointer transition-all';
  row.onclick = () => openOrderDetail(order);

  const formattedDate = formatDate(order.date);
  const statusClass = STATUS_COLORS[order.status] || 'status-received';

  row.innerHTML = `
    <div class="grid grid-cols-12 gap-4 items-center">
      <div class="col-span-2">
        <p class="text-white font-semibold text-sm">${order.orderId}</p>
      </div>
      <div class="col-span-2">
        <p class="text-gray-400 text-sm">${formattedDate}</p>
      </div>
      <div class="col-span-2">
        <p class="text-white text-sm truncate">${order.requester || 'Unknown'}</p>
      </div>
      <div class="col-span-3">
        <p class="text-gray-400 text-sm truncate">${order.items || 'No items'}</p>
      </div>
      <div class="col-span-2">
        <p class="text-white text-sm truncate">${order.logistician || 'Unassigned'}</p>
      </div>
      <div class="col-span-1">
        <span class="status-badge ${statusClass} text-xs py-1 px-2">
          ${order.status}
        </span>
      </div>
    </div>
  `;

  return row;
}

function createOrderCard(order, isOpen) {
  const card = document.createElement('div');
  const statusClass = STATUS_COLORS[order.status] || 'status-received';
  const formattedDate = formatDate(order.date);

  card.className = 'professional-card p-6 order-card relative cursor-pointer';

    const claimButton = isOpen ? `
      <button class="claim-button absolute top-4 right-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-all shadow-lg">
        Claim Order
      </button>
    ` : '';

    const statusBadge = !isOpen ? `
      <span class="status-badge ${statusClass}">
        ${order.status}
      </span>
    ` : '';

    card.innerHTML = `
      ${claimButton}
      <div class="flex justify-between items-start mb-4 ${isOpen ? 'pr-32' : ''}">
        <div>
          <h3 class="text-xl font-bold text-white mb-1">${order.orderId}</h3>
          <p class="text-gray-400 text-sm">${formattedDate}</p>
        </div>
        ${statusBadge}
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p class="text-gray-400 text-xs mb-1">Requester</p>
          <p class="text-white font-semibold text-sm">${order.requester || 'Unknown'}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs mb-1">Assigned To</p>
          <p class="text-white font-semibold text-sm">${order.logistician || '<span class="text-yellow-400">Unassigned</span>'}</p>
        </div>
      </div>

      <div class="border-t border-gray-700 pt-4">
        <p class="text-gray-400 text-xs mb-2">Items</p>
        <p class="text-white text-sm line-clamp-2">${order.items || 'No items listed'}</p>
      </div>

      ${order.orderType ? `
        <div class="mt-3">
          <span class="inline-block px-3 py-1 ${order.orderType.toLowerCase() === 'academy' ? 'bg-green-600/50 text-white' : 'bg-red-500/50 text-white'} rounded-full text-xs font-semibold">
            ${order.orderType}
          </span>
        </div>
      ` : ''}
    `;

    // Add click logistician to open order detail
    card.addEventListener('click', () => openOrderDetail(order));

  // Add click logistician to claim button if it exists
  if (isOpen) {
    const claimBtn = card.querySelector('.claim-button');
    if (claimBtn) {
      claimBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        claimOrder(order.orderId);
      });
    }
  }

  return card;
}

function switchOrderView(view) {
  currentOrderView = view;
  const activeBtn = document.getElementById('btn-active-orders');
  const completedBtn = document.getElementById('btn-completed-orders');
  const activeContainer = document.getElementById('active-orders-container');
  const completedContainer = document.getElementById('completed-orders-container');

  if (view === 'active') {
    activeBtn.className = 'px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-blue-600 text-white';
    completedBtn.className = 'px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-gray-700 text-gray-300 hover:bg-gray-600';
    activeContainer.classList.remove('hidden');
    completedContainer.classList.add('hidden');
  } else {
    activeBtn.className = 'px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-gray-700 text-gray-300 hover:bg-gray-600';
    completedBtn.className = 'px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-blue-600 text-white';
    activeContainer.classList.add('hidden');
    completedContainer.classList.remove('hidden');
  }

  document.getElementById('no-orders-message').classList.add('hidden');
  renderOrders();
}

function refreshOrders() {
  showToast('Refreshing orders...', 'info');
  fetchOrders();
}

function closeOrderDetail() {
  const panel = document.getElementById('order-detail-panel');
  const listContainer = document.getElementById('orders-list-container');

  panel.classList.remove('active');
  listContainer.classList.remove('with-detail');
  currentOrder = null;
}

async function openOrderDetail(order) {
  currentOrder = order;
  const formattedDate = formatDate(order.date);
  const isArchived = order.status === 'Completed' || order.status === 'Cancelled';

  // Show the side panel
  const panel = document.getElementById('order-detail-panel');
  const listContainer = document.getElementById('orders-list-container');
  const contentDiv = document.getElementById('order-detail-content');

  panel.classList.add('active');
  listContainer.classList.add('with-detail');

  // Show loading state
  contentDiv.innerHTML = `
    <div class="text-center py-20">
      <div class="loading-spinner mx-auto mb-4"></div>
      <p class="text-gray-400">Loading order details...</p>
    </div>
  `;

  // Fetch real Discord thread messages
  let messageHistory = [];
  try {
    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getThreadMessages',
        orderId: order.orderId
      })
    });

    const data = await response.json();
    if (data && data.success) {
      messageHistory = data.data || [];
    }
  } catch (error) {
    console.error('Error fetching thread messages:', error);
  }

  let messageHistoryHTML = '';
  if (messageHistory.length > 0) {
    messageHistoryHTML = `
      <div class="professional-card p-6 mb-6">
        <p class="text-gray-400 text-sm mb-3 flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"></path>
          </svg>
          <span>Discord Thread Messages</span>
        </p>
        <div class="space-y-2 max-h-96 overflow-y-auto bg-gray-800/50 p-4 rounded-lg">
          ${messageHistory.map(msg => {
            // Format timestamp
            const msgDate = new Date(msg.timestamp);
            const formattedTime = msgDate.toLocaleString();

            // Determine message styling based on author
            const isBot = msg.isBot;
            const borderColor = isBot ? 'border-purple-500' : 'border-blue-500';
            const authorColor = isBot ? 'text-purple-400' : 'text-blue-400';

            // Handle embeds (bot messages)
            let content = msg.content;
            if (msg.embeds && msg.embeds.length > 0) {
              const embed = msg.embeds[0];
              if (embed.title || embed.description) {
                content = `<strong>${embed.title || ''}</strong><br>${embed.description || ''}`;
              }
            }

            return `
              <div class="border-l-2 ${borderColor} pl-3 py-2">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-xs ${authorColor} font-semibold">${msg.author}${isBot ? ' (Bot)' : ''}</p>
                  <p class="text-xs text-gray-500">${formattedTime}</p>
                </div>
                <p class="text-white text-sm">${content || '<em>No content</em>'}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const detailHTML = `
          <div class="mb-6">
            <p class="text-blue-400 text-2xl font-semibold mb-2">${order.orderId}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="professional-card p-4">
              <p class="text-gray-400 text-xs mb-1">Requester</p>
              <p class="text-white text-lg font-semibold">${order.requester || 'Unknown'}</p>
            </div>
            <div class="professional-card p-4">
              <p class="text-gray-400 text-xs mb-1">Date</p>
              <p class="text-white text-lg font-semibold">${formattedDate}</p>
            </div>
            <div class="professional-card p-4">
              <p class="text-gray-400 text-xs mb-1">Order Type</p>
              <p class="text-white text-lg font-semibold">${order.orderType || 'Standard'}</p>
            </div>
            <div class="professional-card p-4">
              <p class="text-gray-400 text-xs mb-1">Assigned To</p>
              <p class="text-white text-lg font-semibold">${order.logistician || '<span class="text-yellow-400">Unassigned</span>'}</p>
            </div>
          </div>

          <div class="professional-card p-6 mb-6">
            <p class="text-gray-400 text-sm mb-3">Current Status</p>
            <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
              <span class="status-badge ${STATUS_COLORS[order.status] || 'status-received'}">
                ${order.status}
              </span>
              ${!isArchived ? `
                <select id="order-detail-status-select" class="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="Received" ${order.status === 'Received' ? 'selected' : ''}>Received</option>
                  <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                  <option value="Pending Collection" ${order.status === 'Pending Collection' ? 'selected' : ''}>Pending Collection</option>
                  <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                  <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button onclick="updateOrderStatus()" class="px-6 py-3 professional-button text-white font-semibold rounded-lg whitespace-nowrap">
                  Update Status
                </button>
              ` : ''}
            </div>
          </div>

          ${order.tracking && (order.tracking.placedTimestamp || order.tracking.claimedTimestamp || order.tracking.processingTimestamp || order.tracking.completionTimestamp) ? `
            <div class="professional-card p-6 mb-6">
              <p class="text-gray-400 text-sm mb-4 flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span>Order Timeline</span>
              </p>
              <div class="space-y-4">
                ${order.tracking.placedTimestamp ? `
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                    <div class="flex-1">
                      <p class="text-white text-sm font-semibold">Order Received</p>
                      <p class="text-gray-400 text-xs">${formatTimestamp(order.tracking.placedTimestamp)}</p>
                    </div>
                  </div>
                  ${order.tracking.claimedTimestamp || order.tracking.processingTimestamp || order.tracking.completionTimestamp ? '<div class="ml-1 h-8 w-0.5 bg-gray-700"></div>' : ''}
                ` : ''}

                ${order.tracking.claimedTimestamp ? `
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-yellow-400"></div>
                    <div class="flex-1">
                      <p class="text-white text-sm font-semibold">Order Claimed by ${order.logistician || 'Staff'}</p>
                      <p class="text-gray-400 text-xs">${formatTimestamp(order.tracking.claimedTimestamp)}</p>
                    </div>
                  </div>
                  ${order.tracking.processingTimestamp || order.tracking.completionTimestamp ? '<div class="ml-1 h-8 w-0.5 bg-gray-700"></div>' : ''}
                ` : ''}

                ${order.tracking.processingTimestamp ? `
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-400"></div>
                    <div class="flex-1">
                      <p class="text-white text-sm font-semibold">Order Processed</p>
                      <p class="text-gray-400 text-xs">${formatTimestamp(order.tracking.processingTimestamp)}</p>
                    </div>
                  </div>
                  ${order.tracking.completionTimestamp ? '<div class="ml-1 h-8 w-0.5 bg-gray-700"></div>' : ''}
                ` : ''}

                ${order.tracking.completionTimestamp ? `
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full ${order.status === 'Completed' ? 'bg-green-400' : 'bg-red-400'}"></div>
                    <div class="flex-1">
                      <p class="text-white text-sm font-semibold">Order ${order.status}</p>
                      <p class="text-gray-400 text-xs">${formatTimestamp(order.tracking.completionTimestamp)}</p>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${!isArchived ? (order.logistician && order.logistician.trim() !== '' ? `
            <div class="professional-card p-6 mb-6 bg-yellow-900/20 border-yellow-600/30">
              <p class="text-yellow-400 text-sm mb-3 flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <span>Order Assignment</span>
              </p>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-white text-sm mb-1">Currently assigned to: <span class="font-semibold">${order.logistician}</span></p>
                  <p class="text-gray-400 text-xs">Release this order to make it available for others to claim</p>
                </div>
                <button onclick="releaseOrder('${order.orderId}')" class="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg whitespace-nowrap transition-all">
                  Release Order
                </button>
              </div>
            </div>
          ` : `
            <div class="professional-card p-6 mb-6 bg-green-900/20 border-green-600/30">
              <p class="text-green-400 text-sm mb-3 flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span>Available to Claim</span>
              </p>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-white text-sm mb-1">This order is currently unassigned</p>
                  <p class="text-gray-400 text-xs">Claim this order to start working on it</p>
                </div>
                <button onclick="claimOrderFromModal('${order.orderId}')" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg whitespace-nowrap transition-all">
                  Claim Order
                </button>
              </div>
            </div>
          `) : ''}

          <div class="professional-card p-6 mb-6">
            <p class="text-gray-400 text-sm mb-3">Items Ordered</p>
            <div class="text-white text-base bg-gray-800/50 p-4 rounded-lg whitespace-pre-wrap">
              ${order.items || 'No items listed'}
            </div>
            ${order.itemCount ? `<p class="text-gray-400 text-sm mt-2">Total Items: ${order.itemCount}</p>` : ''}
            ${order.cost ? `<p class="text-gray-400 text-sm mt-1">Total Cost: ${order.cost} aUEC</p>` : ''}
          </div>

          ${order.availability && order.availability.trim() ? `
            <div class="professional-card p-6 mb-6">
              <p class="text-gray-400 text-sm mb-3 flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
                <span>Collection Availability</span>
              </p>
              <div class="bg-gray-800/50 p-4 rounded-lg space-y-2">
                ${formatAvailabilityForDisplay(order.availability)}
              </div>
            </div>
          ` : ''}

          ${order.notes ? `
            <div class="professional-card p-6 mb-6">
              <p class="text-gray-400 text-sm mb-3">Notes</p>
              <p class="text-white text-base">${order.notes}</p>
            </div>
          ` : ''}

          ${messageHistoryHTML}

          ${!isArchived ? `
            <div class="professional-card p-6">
              <p class="text-gray-400 text-sm mb-3 flex items-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                </svg>
                <span>Send Message to Discord Thread</span>
              </p>
              <textarea id="order-message-input" rows="3" placeholder="Type your message here..." class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-3"></textarea>
              <button onclick="sendDiscordMessage()" class="w-full px-6 py-3 professional-button text-white font-semibold rounded-lg flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
                <span>Send Message</span>
              </button>
            </div>
          ` : ''}
  `;

  contentDiv.innerHTML = detailHTML;
}

async function updateOrderStatus() {
  if (!currentOrder) return;

  try {
    const newStatus = document.getElementById('order-detail-status-select').value;

    if (newStatus === currentOrder.status) {
      showToast('Status unchanged', 'info');
      return;
    }

    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateStatus',
        orderId: currentOrder.orderId,
        status: newStatus
      })
    });

    const data = await response.json();

    if (data && data.success) {
      showToast('Order status updated successfully', 'success');

      // Refresh orders to get updated tracking data
      await fetchOrders();

      // Find the updated order and reopen the detail panel
      const updatedOrder = allOrders.find(o => o.orderId === currentOrder.orderId);
      if (updatedOrder) {
        // Small delay to ensure tracking data is updated
        setTimeout(() => {
          openOrderDetail(updatedOrder);
        }, 500);
      } else {
        closeOrderDetail();
      }
    } else {
      throw new Error(data.message || 'Failed to update status');
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    showToast('Failed to update order status: ' + error.message, 'error');
  }
}

async function loadThreadMessages(orderId) {
  try {
    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getThreadMessages',
        orderId: orderId
      })
    });

    const data = await response.json();
    if (data && data.success) {
      const messageHistory = data.data || [];

      // Find the message history container and update it
      const messageContainer = document.querySelector('#order-detail-panel .space-y-2.max-h-96');
      if (messageContainer && messageHistory.length > 0) {
        messageContainer.innerHTML = messageHistory.map(msg => {
          // Format timestamp
          const msgDate = new Date(msg.timestamp);
          const formattedTime = msgDate.toLocaleString();

          // Determine message styling based on author
          const isBot = msg.isBot;
          const borderColor = isBot ? 'border-purple-500' : 'border-blue-500';
          const authorColor = isBot ? 'text-purple-400' : 'text-blue-400';

          // Handle embeds (bot messages)
          let content = msg.content;
          if (msg.embeds && msg.embeds.length > 0) {
            const embed = msg.embeds[0];
            if (embed.title || embed.description) {
              content = `<strong>${embed.title || ''}</strong><br>${embed.description || ''}`;
            }
          }

          return `
            <div class="border-l-2 ${borderColor} pl-3 py-2">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs ${authorColor} font-semibold">${msg.author}${isBot ? ' (Bot)' : ''}</p>
                <p class="text-xs text-gray-500">${formattedTime}</p>
              </div>
              <p class="text-white text-sm">${content || '<em>No content</em>'}</p>
            </div>
          `;
        }).join('');

        // Scroll to bottom of message container
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    }
  } catch (error) {
    console.error('Error loading thread messages:', error);
  }
}

async function sendDiscordMessage() {
  if (!currentOrder) return;

  const messageInput = document.getElementById('order-message-input');
  const message = messageInput.value.trim();

  if (!message) {
    showToast('Please enter a message', 'error');
    return;
  }

  try {
    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        orderId: currentOrder.orderId,
        message: message
      })
    });

    const data = await response.json();

    if (data && data.success) {
      showToast('Message sent to Discord', 'success');
      messageInput.value = '';

      // Refresh just the message history without closing the panel
      await loadThreadMessages(currentOrder.orderId);
    } else {
      throw new Error(data.message || 'Failed to send message');
    }
  } catch (error) {
    console.error('Error sending Discord message:', error);
    showToast('Failed to send message: ' + error.message, 'error');
  }
}

async function claimOrder(orderId) {
  await claimOrderInternal(orderId, false);
}

async function claimOrderFromModal(orderId) {
  await claimOrderInternal(orderId, true);
}

async function claimOrderInternal(orderId, fromModal) {
  const order = allOrders.find(o => o.orderId === orderId);
  if (!order) return;

  let savedUsername = localStorage.getItem('staffDiscordUsername');
  let username = savedUsername;

  // Always prompt if no saved username
  if (!username || username.trim() === '') {
    username = prompt('Enter your Discord username:\n\n(Note: This will be automatically filled in once the system is fully established)');

    if (!username || username.trim() === '') {
      showToast('Username required to claim order', 'error');
      return;
    }

    username = username.trim();
    localStorage.setItem('staffDiscordUsername', username);
  }

  try {
    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claimOrder',
        orderId: orderId,
        logistician: username
      })
    });

    const data = await response.json();

    if (data && data.success) {
      showToast(`Order ${orderId} claimed successfully!`, 'success');
      if (fromModal) {
        closeOrderDetail();
      }
      await fetchOrders();
    } else {
      throw new Error(data.message || 'Failed to claim order');
    }
  } catch (error) {
    console.error('Error claiming order:', error);
    showToast('Failed to claim order: ' + error.message, 'error');
  }
}

async function releaseOrder(orderId) {
  if (!confirm(`Are you sure you want to release order ${orderId}?\n\nThis will make it available for others to claim.`)) {
    return;
  }

  try {
    const response = await fetch(BOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'releaseOrder',
        orderId: orderId
      })
    });

    const data = await response.json();

    if (data && data.success) {
      showToast(`Order ${orderId} released successfully!`, 'success');
      closeOrderDetail();
      await fetchOrders();
    } else {
      throw new Error(data.message || 'Failed to release order');
    }
  } catch (error) {
    console.error('Error releasing order:', error);
    showToast('Failed to release order: ' + error.message, 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  toastMessage.textContent = message;

  if (type === 'success') {
    toast.className = 'fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl transform translate-y-0 transition-all duration-300 z-50 bg-green-600 text-white';
    toastIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>';
  } else if (type === 'error') {
    toast.className = 'fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl transform translate-y-0 transition-all duration-300 z-50 bg-red-600 text-white';
    toastIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>';
  } else {
    toast.className = 'fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl transform translate-y-0 transition-all duration-300 z-50 bg-blue-600 text-white';
    toastIcon.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>';
  }

  setTimeout(() => {
    toast.className = 'fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl transform translate-y-32 transition-all duration-300 z-50';
  }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  fetchOrders();

  setInterval(() => {
    const panel = document.getElementById('order-detail-panel');
    if (!panel || !panel.classList.contains('active')) {
      fetchOrders();
    }
  }, 60000);
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeOrderDetail();
  }
});

