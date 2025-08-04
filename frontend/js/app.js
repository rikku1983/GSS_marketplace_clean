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
        await this.loadPosts();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showModal('loginModal'));
        document.getElementById('registerBtn')?.addEventListener('click', () => this.showModal('registerModal'));
        document.getElementById('adminBtn')?.addEventListener('click', () => this.showAdminModal());
        document.getElementById('profileBtn')?.addEventListener('click', () => this.showProfileModal());
        document.getElementById('createPostBtn')?.addEventListener('click', () => this.showModal('createPostModal'));
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('createPostForm')?.addEventListener('submit', (e) => this.handleCreatePost(e));
        document.getElementById('editPostForm')?.addEventListener('submit', (e) => this.handleEditPost(e));
        document.getElementById('addEmailForm')?.addEventListener('submit', (e) => this.handleAddEmail(e));
        
        // Admin tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            }
        });

        // Post card clicks - delegate event listener
        document.addEventListener('click', (e) => {
            const postCard = e.target.closest('.post-card');
            if (postCard) {
                const postId = postCard.dataset.postId;
                this.showPostDetails(postId);
            }
        });

        // Modal switching
        document.getElementById('showRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('loginModal');
            this.showModal('registerModal');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('registerModal');
            this.showModal('loginModal');
        });

        // Close modals
        document.querySelectorAll('.close')?.forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
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
        
        // Refresh posts after login
        await this.loadPosts();
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
        
        // Refresh posts after logout
        await this.loadPosts();
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
        try {
            const { data, error } = await this.supabase
                .from('email_whitelist')
                .select('*')
                .order('added_at', { ascending: false });

            if (error) throw error;

            const container = document.getElementById('whitelistContainer');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p class="no-data">No whitelisted emails yet.</p>';
                return;
            }

            container.innerHTML = data.map(item => `
                <div class="whitelist-item">
                    <div class="whitelist-info">
                        <strong>${item.email}</strong>
                        ${item.notes ? `<span> - ${item.notes}</span>` : ''}
                        <small>Added: ${new Date(item.added_at).toLocaleDateString()}</small>
                    </div>
                    <button class="btn-delete" onclick="app.deleteWhitelistEmail('${item.email}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading whitelist:', error);
            const container = document.getElementById('whitelistContainer');
            container.innerHTML = '<p class="error">Error loading whitelist data</p>';
        }
    }

    async deleteWhitelistEmail(email) {
        if (!confirm(`Remove "${email}" from whitelist?\n\nThis will prevent them from registering new accounts.`)) {
            return;
        }

        try {
            const { error } = await this.supabase
                .from('email_whitelist')
                .delete()
                .eq('email', email);

            if (error) throw error;

            this.showNotification(`Email "${email}" removed from whitelist`, 'success');
            this.loadWhitelist(); // Refresh the list
        } catch (error) {
            console.error('Error deleting email:', error);
            this.showNotification('Error removing email from whitelist', 'error');
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
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    *,
                    marketplace_posts(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const container = document.getElementById('usersContainer');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p class="no-data">No users yet.</p>';
                return;
            }

            container.innerHTML = data.map(user => `
                <div class="user-item">
                    <div class="user-info">
                        <strong>${user.user_name}</strong> (${user.email})
                        <span class="user-role ${user.role}">${user.role}</span>
                        <small>Posts: ${user.marketplace_posts?.length || 0} | Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
            const container = document.getElementById('usersContainer');
            container.innerHTML = '<p class="error">Error loading user data</p>';
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

    async showProfileModal() {
        if (!this.currentUser) return;
        
        // Load current profile data
        const { data: profile } = await this.supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .single();

        if (profile) {
            document.getElementById('profileName').value = profile.user_name || '';
            document.getElementById('profileEmail').value = profile.email || '';
            document.getElementById('profilePhone').value = profile.phone || '';
            document.getElementById('profileLocation').value = profile.location || '';
        }
        
        this.showModal('profileModal');
    }

    showChangePasswordModal() {
        this.hideModal('profileModal');
        this.showModal('changePasswordModal');
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        
        if (!currentPassword) {
            this.showNotification('Please enter your current password to save changes', 'error');
            return;
        }

        try {
            // Verify current password
            const { error: authError } = await this.supabase.auth.signInWithPassword({
                email: this.currentUser.email,
                password: currentPassword
            });

            if (authError) {
                this.showNotification('Current password is incorrect', 'error');
                return;
            }

            // Update profile
            const { error } = await this.supabase
                .from('user_profiles')
                .update({
                    user_name: document.getElementById('profileName').value,
                    phone: document.getElementById('profilePhone').value,
                    location: document.getElementById('profileLocation').value
                })
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            this.showNotification('Profile updated successfully!', 'success');
            this.hideModal('profileModal');
            
            // Update UI with new name
            document.getElementById('userName').textContent = document.getElementById('profileName').value;
            
            // Clear password field
            document.getElementById('currentPassword').value = '';
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPasswordChange').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            // Verify old password
            const { error: authError } = await this.supabase.auth.signInWithPassword({
                email: this.currentUser.email,
                password: oldPassword
            });

            if (authError) {
                this.showNotification('Current password is incorrect', 'error');
                return;
            }

            // Update password
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            this.showNotification('Password changed successfully!', 'success');
            this.hideModal('changePasswordModal');
            
            // Clear form
            document.getElementById('changePasswordForm').reset();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleCreatePost(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please log in to create a post', 'error');
            return;
        }

        try {
            const postData = {
                title: document.getElementById('postTitle').value,
                category: document.getElementById('postCategory').value,
                brand: document.getElementById('postBrand').value || null,
                size: document.getElementById('postSize').value || null,
                condition: document.getElementById('postCondition').value,
                price: parseFloat(document.getElementById('postPrice').value),
                description: document.getElementById('postDescription').value || null,
                contact_method: document.getElementById('postContact').value,
                user_id: this.currentUser.id
            };

            const { data, error } = await this.supabase
                .from('marketplace_posts')
                .insert(postData)
                .select();

            if (error) throw error;

            this.showNotification('Post created successfully!', 'success');
            this.hideModal('createPostModal');
            document.getElementById('createPostForm').reset();
            
            // Refresh posts to show the new one
            await this.loadPosts();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async loadPosts() {
        try {
            const { data: posts, error } = await this.supabase
                .from('marketplace_posts')
                .select(`
                    *,
                    user_profiles(user_name)
                `)
                .eq('status', 'available')
                .order('created_at', { ascending: false })
                .limit(12);

            if (error) throw error;

            this.displayPosts(posts);
        } catch (error) {
            console.error('Error loading posts:', error);
            document.getElementById('postsLoading').textContent = 'Error loading posts';
        }
    }

    displayPosts(posts) {
        const grid = document.getElementById('postsGrid');
        const loading = document.getElementById('postsLoading');
        
        loading.style.display = 'none';
        
        if (!posts || posts.length === 0) {
            grid.innerHTML = '<p class="no-posts">No posts available yet. Be the first to create one!</p>';
            return;
        }

        grid.innerHTML = posts.map(post => {
            const isOwner = this.currentUser && post.user_id === this.currentUser.id;
            const isAdmin = this.currentUser && this.currentUser.role === 'admin';
            const canEdit = isOwner || isAdmin;

            return `
                <div class="post-card" data-post-id="${post.post_id}">
                    ${canEdit ? `
                        <div class="post-actions">
                            <button class="btn-edit" onclick="app.editPost(${post.post_id})" title="Edit Post">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="app.deletePost(${post.post_id})" title="Delete Post">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                    <div class="post-image">
                        ${post.thumbnail_url ? 
                            `<img src="${post.thumbnail_url}" alt="${post.title}">` : 
                            '<div class="no-image"><i class="fas fa-image"></i></div>'
                        }
                    </div>
                    <div class="post-content">
                        <h3 class="post-title">${post.title}</h3>
                        <p class="post-price">$${post.price}</p>
                        <span class="post-condition">${post.condition}</span>
                        <p class="post-seller">by ${post.user_profiles?.user_name || 'Unknown'}</p>
                        <p class="post-date">${new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    async showPostDetails(postId) {
        try {
            const { data: post, error } = await this.supabase
                .from('marketplace_posts')
                .select(`
                    *,
                    user_profiles(user_name, email, phone, location)
                `)
                .eq('post_id', postId)
                .single();

            if (error) throw error;

            const content = document.getElementById('postDetailsContent');
            content.innerHTML = `
                <div class="post-details">
                    <div class="post-header">
                        <h2>${post.title}</h2>
                        <span class="post-price" style="font-size: 24px; font-weight: bold; color: #2c5aa0;">$${post.price}</span>
                    </div>
                    
                    <div class="post-info">
                        <div class="info-row">
                            <strong>Category:</strong> ${post.category.replace('-', ' ')}
                        </div>
                        ${post.brand ? `<div class="info-row"><strong>Brand:</strong> ${post.brand}</div>` : ''}
                        ${post.size ? `<div class="info-row"><strong>Size:</strong> ${post.size}</div>` : ''}
                        <div class="info-row">
                            <strong>Condition:</strong> ${post.condition}
                        </div>
                        <div class="info-row">
                            <strong>Status:</strong> ${post.status}
                        </div>
                        <div class="info-row">
                            <strong>Posted:</strong> ${new Date(post.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    ${post.description ? `
                        <div class="post-description">
                            <h3>Description</h3>
                            <p>${post.description}</p>
                        </div>
                    ` : ''}

                    <div class="seller-info">
                        <h3>Seller Information</h3>
                        <div class="seller-details">
                            <p><strong>Name:</strong> ${post.user_profiles?.user_name || 'Unknown'}</p>
                            <p><strong>Contact:</strong> ${post.contact_method}</p>
                            ${post.user_profiles?.location ? `<p><strong>Location:</strong> ${post.user_profiles.location}</p>` : ''}
                        </div>
                    </div>

                    <div class="contact-actions" style="margin-top: 20px;">
                        <button class="btn primary" onclick="window.location.href='mailto:${post.user_profiles?.email || ''}?subject=Interest in ${post.title}'">
                            <i class="fas fa-envelope"></i> Email Seller
                        </button>
                        ${post.user_profiles?.phone ? `
                            <button class="btn" onclick="window.location.href='tel:${post.user_profiles.phone}'">
                                <i class="fas fa-phone"></i> Call Seller
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            this.showModal('postDetailsModal');
            
        } catch (error) {
            console.error('Error loading post details:', error);
            this.showNotification('Error loading post details', 'error');
        }
    }

    async showAdminModal() {
        this.showModal('adminModal');
        // Ensure whitelist tab is active and load data immediately
        this.switchTab('whitelist');
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?\n\nThis action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await this.supabase
                .from('marketplace_posts')
                .delete()
                .eq('post_id', postId);

            if (error) throw error;

            this.showNotification('Post deleted successfully', 'success');
            await this.loadPosts(); // Refresh the posts
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showNotification('Error deleting post', 'error');
        }
    }

    async editPost(postId) {
        try {
            // Load post data
            const { data: post, error } = await this.supabase
                .from('marketplace_posts')
                .select('*')
                .eq('post_id', postId)
                .single();

            if (error) throw error;

            // Populate edit form with existing data
            document.getElementById('editPostId').value = post.post_id;
            document.getElementById('editPostTitle').value = post.title;
            document.getElementById('editPostCategory').value = post.category;
            document.getElementById('editPostBrand').value = post.brand || '';
            document.getElementById('editPostSize').value = post.size || '';
            document.getElementById('editPostCondition').value = post.condition;
            document.getElementById('editPostPrice').value = post.price;
            document.getElementById('editPostDescription').value = post.description || '';
            document.getElementById('editPostContact').value = post.contact_method;
            document.getElementById('editPostStatus').value = post.status;

            this.showModal('editPostModal');
        } catch (error) {
            console.error('Error loading post for edit:', error);
            this.showNotification('Error loading post data', 'error');
        }
    }

    async handleEditPost(e) {
        e.preventDefault();
        
        try {
            const postId = document.getElementById('editPostId').value;
            const updateData = {
                title: document.getElementById('editPostTitle').value,
                category: document.getElementById('editPostCategory').value,
                brand: document.getElementById('editPostBrand').value || null,
                size: document.getElementById('editPostSize').value || null,
                condition: document.getElementById('editPostCondition').value,
                price: parseFloat(document.getElementById('editPostPrice').value),
                description: document.getElementById('editPostDescription').value || null,
                contact_method: document.getElementById('editPostContact').value,
                status: document.getElementById('editPostStatus').value,
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('marketplace_posts')
                .update(updateData)
                .eq('post_id', postId);

            if (error) throw error;

            this.showNotification('Post updated successfully!', 'success');
            this.hideModal('editPostModal');
            await this.loadPosts();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GSS_Marketplace();
});
