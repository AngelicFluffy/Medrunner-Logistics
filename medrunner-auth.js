/**
 * Medrunner Portal Authentication System
 * This script handles global authentication across all pages using Discord OAuth
 */

window.MEDRUNNER_AUTH = {
  API_URL: 'https://angla-unsanctionable-visually.ngrok-free.dev',
  currentUser: null,
  isAuthenticated: false,
  authWindow: null,
  refreshInterval: null,

  /**
   * Initialize authentication on page load
   */
  async init() {
    // Check if user is already authenticated (from localStorage)
    const storedUser = localStorage.getItem('medrunnerUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.isAuthenticated = true;
        this.applyAuthState();

        // Refresh user data on page load to get latest roles
        this.refreshUserData();
        return;
      } catch (error) {
        console.error('❌ Failed to restore authentication:', error);
        localStorage.removeItem('medrunnerUser');
      }
    }

    // Listen for OAuth callback messages
    window.addEventListener('message', (event) => {
      // Security: In production, verify event.origin
      if (event.data && event.data.success && event.data.user) {
        this.currentUser = event.data.user;
        this.isAuthenticated = true;

        // Store in localStorage
        localStorage.setItem('medrunnerUser', JSON.stringify(event.data.user));

        // Apply authentication state
        this.applyAuthState();

        // Close auth window if it's still open
        if (this.authWindow && !this.authWindow.closed) {
          this.authWindow.close();
        }
      }
    });
  },



  /**
   * Refresh user data from server (called on page load)
   */
  async refreshUserData() {
    if (!this.currentUser || !this.currentUser.discordId) {
      return;
    }

    try {
      const response = await fetch(`${this.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discordId: this.currentUser.discordId
        })
      });

      if (!response.ok) {
        // Don't throw error, just log warning - cached data is still valid
        console.warn('⚠️ Could not refresh user data from server, using cached data');
        return;
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Check if roles have changed
        const oldRoles = JSON.stringify(this.currentUser.roles || []);
        const newRoles = JSON.stringify(data.user.roles || []);

        if (oldRoles !== newRoles) {
          // console.log('✓ User roles updated from server');
          // Update user data while preserving other fields
          this.currentUser = {
            ...this.currentUser,
            roles: data.user.roles,
            isStaff: data.user.isStaff,
            isLogisticsStaff: data.user.isLogisticsStaff,
            isAcademyStaff: data.user.isAcademyStaff
          };

          // Update localStorage
          localStorage.setItem('medrunnerUser', JSON.stringify(this.currentUser));

          // Re-apply auth state to update UI
          this.applyAuthState();

          // Dispatch event for other scripts
          window.dispatchEvent(new CustomEvent('medrunnerAuthUpdated', {
            detail: { user: this.currentUser }
          }));
        }
      }
    } catch (error) {
      // Non-critical error - just log as warning
      console.warn('⚠️ Could not refresh user data:', error.message);
    }
  },

  /**
   * Show login button
   */
  showLoginButton() {
    // Check if login button already exists
    if (document.getElementById('medrunner-login-btn')) {
      return;
    }

    // Create login button
    const loginBtn = document.createElement('button');
    loginBtn.id = 'medrunner-login-btn';
    loginBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 71 55" fill="none" style="margin-right: 8px;">
        <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
      </svg>
      Login with Discord
    `;
    loginBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      padding: 12px 24px;
      background: #5865F2;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
    `;

    loginBtn.onmouseover = () => {
      loginBtn.style.background = '#4752C4';
      loginBtn.style.transform = 'translateY(-2px)';
      loginBtn.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
    };

    loginBtn.onmouseout = () => {
      loginBtn.style.background = '#5865F2';
      loginBtn.style.transform = 'translateY(0)';
      loginBtn.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    };

    loginBtn.onclick = () => this.loginWithDiscord();

    document.body.appendChild(loginBtn);
  },

  /**
   * Open Discord OAuth login window
   */
  loginWithDiscord() {
    const width = 500;
    const height = 700;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const authUrl = `${this.API_URL}/auth/discord`;

    this.authWindow = window.open(
      authUrl,
      'Discord Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Check if popup was blocked
    if (!this.authWindow || this.authWindow.closed || typeof this.authWindow.closed === 'undefined') {
      console.error('❌ Popup blocked! Please allow popups for this site.');
      alert('Popup blocked! Please allow popups for this site and try again.');
    }
  },

  /**
   * Logout user
   */
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('medrunnerUser');

    // Remove login button if it exists
    const loginBtn = document.getElementById('medrunner-login-btn');
    if (loginBtn) {
      loginBtn.remove();
    }

    // Reload page
    window.location.reload();
  },

  /**
   * Apply authentication state to the current page
   */
  applyAuthState() {
    if (!this.isAuthenticated || !this.currentUser) {
      return;
    }

    // Remove login button
    const loginBtn = document.getElementById('medrunner-login-btn');
    if (loginBtn) {
      loginBtn.remove();
    }

    // Show user info
    this.showUserInfo();

    // Auto-fill Discord username on index page
    this.autoFillDiscordUsername();

    // Show/hide staff control navigation based on role
    this.toggleStaffNavigation();

    // Dispatch custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('medrunnerAuthReady', {
      detail: { user: this.currentUser }
    }));
  },

  /**
   * Show user info in navigation bar
   */
  showUserInfo() {
    // Check if user info already exists
    if (document.getElementById('medrunner-user-info')) {
      return;
    }

    // Find the navigation bar user info container
    const navUserContainer = document.getElementById('nav-user-info');
    if (!navUserContainer) {
      console.warn('⚠️ Navigation user info container not found');
      return;
    }

    // Create user info HTML
    navUserContainer.innerHTML = `
      <div class="flex items-center space-x-3">
        ${this.currentUser.discordAvatar ?
          `<img src="https://cdn.discordapp.com/avatars/${this.currentUser.discordId}/${this.currentUser.discordAvatar}.png"
               class="w-8 h-8 rounded-full"
               alt="${this.currentUser.discordUsername}">` :
          `<div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            ${this.currentUser.discordUsername.charAt(0).toUpperCase()}
          </div>`
        }
        <div class="flex flex-col">
          <span class="font-semibold text-white text-sm">${this.currentUser.discordUsername}</span>
          ${this.currentUser.rsiHandle ?
            `<span class="text-xs text-gray-400">${this.currentUser.rsiHandle}</span>` :
            ''
          }
        </div>
        <button id="logout-btn" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors duration-200">
          Logout
        </button>
      </div>
    `;

    navUserContainer.style.display = 'flex';

    // Add logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => this.logout();
    }
  },
  
  /**
   * Auto-fill Discord username field if it exists
   */
  autoFillDiscordUsername() {
    const discordUsernameField = document.getElementById('discord-username');

    if (discordUsernameField && this.currentUser.discordUsername) {
      discordUsernameField.value = this.currentUser.discordUsername;

      // Make it readonly to prevent changes
      discordUsernameField.setAttribute('readonly', 'readonly');
      discordUsernameField.style.backgroundColor = '#1a2332';
      discordUsernameField.style.cursor = 'not-allowed';
    }
  },

  /**
   * Show/hide staff control navigation based on user role
   */
  toggleStaffNavigation() {
    const staffNavLink = document.querySelector('a[href="staff-control.html"]');
    const myOrdersLink = document.querySelector('a[href="my-orders.html"]');
    const staffDivider = document.getElementById('staff-control-divider');

    // Show My Orders link for all authenticated users
    if (myOrdersLink) {
      myOrdersLink.style.display = 'block';
    }

    // Show staff control link only for logistics staff
    if (staffNavLink) {
      // Check if user is logistics staff
      const isLogisticsStaff = this.isLogisticsStaff();

      if (isLogisticsStaff) {
        staffNavLink.style.display = 'block';
        if (staffDivider) staffDivider.style.display = 'block';
      } else {
        staffNavLink.style.display = 'none';
        if (staffDivider) staffDivider.style.display = 'none';
      }
    }
  },
  
  /**
   * Check if current user is logistics staff
   */
  isLogisticsStaff() {
    if (!this.currentUser) return false;

    // Check if user has isLogisticsStaff flag (from backend)
    if (this.currentUser.isLogisticsStaff) return true;

    // Check if user has logistics role
    if (this.currentUser.roles && Array.isArray(this.currentUser.roles)) {
      const logisticsRoles = ['logistics', 'logistics staff'];
      return this.currentUser.roles.some(role =>
        logisticsRoles.includes(role.toLowerCase())
      );
    }

    return false;
  },
  
  /**
   * Get current user data
   */
  getUser() {
    return this.currentUser;
  },
  
  /**
   * Check if user is authenticated
   */
  isAuth() {
    return this.isAuthenticated;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.MEDRUNNER_AUTH.init());
} else {
  window.MEDRUNNER_AUTH.init();
}
