/**
 * Medrunner Portal Authentication System
 * This script handles global authentication across all pages
 */

const MEDRUNNER_AUTH = {
  API_URL: 'https://angla-unsanctionable-visually.ngrok-free.dev',
  API_TOKEN: 'MRA.3/b0441941964245ac8fc95f4f6459b9177e6a2c5f03eb4f128b2d1d88ab080f05',
  currentUser: null,
  isAuthenticated: false,
  
  /**
   * Initialize authentication on page load
   */
  async init() {
    console.log('🔐 Initializing Medrunner Authentication...');
    
    // Auto-authenticate with the API token
    await this.authenticate();
    
    // Apply authentication state to the page
    this.applyAuthState();
  },
  
  /**
   * Authenticate with the Medrunner Portal API
   */
  async authenticate() {
    try {
      console.log('🔄 Authenticating with Medrunner Portal...');
      console.log('📡 API URL:', this.API_URL);
      console.log('🔑 Token:', this.API_TOKEN.substring(0, 20) + '...');

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verifyPortalToken',
          token: this.API_TOKEN
        })
      });

      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success && data.user) {
        this.currentUser = data.user;
        this.isAuthenticated = true;

        // Store in localStorage for persistence
        localStorage.setItem('medrunnerPortalToken', this.API_TOKEN);
        localStorage.setItem('medrunnerUser', JSON.stringify(data.user));

        console.log('✅ Authentication successful:', data.user);
        return true;
      } else {
        console.error('❌ Authentication failed:', data.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      console.error('❌ Error details:', error.message);
      return false;
    }
  },
  
  /**
   * Apply authentication state to the current page
   */
  applyAuthState() {
    if (!this.isAuthenticated || !this.currentUser) {
      console.log('⚠️ Not authenticated, skipping auth state application');
      return;
    }
    
    console.log('🎨 Applying authentication state to page...');
    
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
   * Auto-fill Discord username field if it exists
   */
  autoFillDiscordUsername() {
    const discordUsernameField = document.getElementById('discord-username');
    
    if (discordUsernameField && this.currentUser.discordUsername) {
      discordUsernameField.value = this.currentUser.discordUsername;
      console.log('✅ Auto-filled Discord username:', this.currentUser.discordUsername);
      
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
    
    if (staffNavLink) {
      // Check if user is logistics staff
      const isLogisticsStaff = this.isLogisticsStaff();
      
      if (isLogisticsStaff) {
        staffNavLink.style.display = 'flex';
        console.log('✅ Staff navigation visible (user is logistics staff)');
      } else {
        staffNavLink.style.display = 'none';
        console.log('⚠️ Staff navigation hidden (user is not logistics staff)');
      }
    }
  },
  
  /**
   * Check if current user is logistics staff
   */
  isLogisticsStaff() {
    if (!this.currentUser) return false;
    
    // Check if user has staff status
    if (this.currentUser.isStaff) return true;
    
    // Check if user has logistics role
    if (this.currentUser.roles && Array.isArray(this.currentUser.roles)) {
      const logisticsRoles = ['logistics', 'logistics staff', 'admin', 'administrator'];
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
  document.addEventListener('DOMContentLoaded', () => MEDRUNNER_AUTH.init());
} else {
  MEDRUNNER_AUTH.init();
}

