class GSS_Marketplace {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Initialize Supabase
        const supabaseUrl = 'https://sbrbspsocmicyoszjagk.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmJzcHNvY21pY3lvc3pqYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDg4NzYsImV4cCI6MjA2OTY4NDg3Nn0.J-n60orF3HtMSEIbPLzNOBiTs-I-s0JJivkhkCdm_p0';
        this.supabase = supabase.createClient(supabaseUrl, supabaseKey);

        this.setupEventListeners();
        await this.checkAuthState();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('loginBtn').addEventListener('click', () => this.showModal('loginModal'));
        document.getElementById('registerBtn').addEventListener('click', () => this.showModal('registerModal'));
        document.getElementById('adminBtn').addEventListener('click', () => this.showModal('adminModal'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => this.handleForgotPassword(e));

        // Modal switching
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('loginModal');
            this.showModal('registerModal');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('registerModal');
            this.showModal('loginModal');
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('addEmailForm').addEventListener('submit', (e) => this.handleAddEmail(e));

        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // Admin tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }

    async checkAuthState() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            await this.handleAuthSuccess(session.user);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            await this.handleAuthSuccess(data.user);
            this.hideModal('loginModal');
            this.showNotification('Login successful!', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const phone = document.getElementById('registerPhone').value;
        const location = document.getElementById('registerLocation').value;

        try {
            // Check if email is whitelisted
            const { data: whitelist, error: whitelistError } = await this.supabase
                .from('email_whitelist')
                .select('email')
                .eq('email', email)
                .single();

            if (whitelistError || !whitelist) {
                throw new Error('Email not authorized. Please contact an administrator.');
            }

            // Register user
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        user_name: name,
                        phone,
                        location
                    }
                }
            });

            if (error) throw error;

            this.hideModal('registerModal');
            this.showNotification('Registration successful! Please check your email for confirmation.', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleAuthSuccess(user) {
        this.currentUser = user;
        
        // Get user profile
        const { data: profile } = await this.supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (profile) {
            this.updateUIForLoggedInUser(profile);
        } else {
            // Create profile if it doesn't exist
            await this.createUserProfile(user);
        }
    }

    async createUserProfile(user) {
        const { error } = await this.supabase
            .from('user_profiles')
            .insert({
                user_id: user.id,
                user_name: user.user_metadata.user_name || user.email.split('@')[0],
                email: user.email,
                phone: user.user_metadata.phone || '',
                location: user.user_metadata.location || ''
            });

        if (!error) {
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            this.updateUIForLoggedInUser(profile);
        }
    }

    updateUIForLoggedInUser(profile) {
        // Hide login/register buttons
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        
        // Show user menu
        const userMenu = document.getElementById('userMenu');
        userMenu.classList.remove('hidden');
        document.getElementById('userName').textContent = profile.user_name;
        
        // Show admin button if user is admin
        if (profile.role === 'admin') {
            document.getElementById('adminBtn').style.display = 'block';
        }
    }

    async logout() {
        await this.supabase.auth.signOut();
        this.currentUser = null;
        
        // Reset UI
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('registerBtn').style.display = 'block';
        document.getElementById('userMenu').classList.add('hidden');
        document.getElementById('adminBtn').style.display = 'none';
        
        this.showNotification('Logged out successfully', 'info');
    }

    async handleAddEmail(e) {
        e.preventDefault();
        const email = document.getElementById('whitelistEmail').value;
        const notes = document.getElementById('whitelistNotes').value;

        try {
            const { error } = await this.supabase
                .from('email_whitelist')
                .insert({
                    email,
                    notes
                });

            if (error) throw error;

            document.getElementById('addEmailForm').reset();
            this.loadWhitelist();
            this.showNotification('Email added to whitelist', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async loadWhitelist() {
        const { data, error } = await this.supabase
            .from('email_whitelist')
            .select('*')
            .order('added_at', { ascending: false });

        if (!error && data) {
            const container = document.getElementById('whitelistContainer');
            container.innerHTML = data.map(item => `
                <div class="whitelist-item">
                    <strong>${item.email}</strong>
                    ${item.notes ? `<span> - ${item.notes}</span>` : ''}
                    <small>Added: ${new Date(item.added_at).toLocaleDateString()}</small>
                </div>
            `).join('');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');

        // Load data for active tab
        if (tabName === 'whitelist') {
            this.loadWhitelist();
        } else if (tabName === 'users') {
            this.loadUsers();
        }
    }

    async loadUsers() {
        const { data, error } = await this.supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const container = document.getElementById('usersContainer');
            container.innerHTML = data.map(user => `
                <div class="user-item">
                    <strong>${user.user_name}</strong> (${user.email})
                    <span>Role: ${user.role}</span>
                    <small>Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                </div>
            `).join('');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        
        if (!email) {
            this.showNotification('Please enter your email address first', 'error');
            return;
        }

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            this.showNotification('Password reset email sent! Check your inbox.', 'success');
            this.hideModal('loginModal');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new GSS_Marketplace();
});
