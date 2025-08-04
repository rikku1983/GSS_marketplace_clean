class GSS_Marketplace {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
        
        // Photo upload state
        this.uploadedPhotos = [];
        this.editUploadedPhotos = [];
        this.thumbnailIndex = 0;
        this.editThumbnailIndex = 0;
        this.isUploading = false;
        
        this.initPhotoUpload();
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

        // Mobile menu toggle
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => this.toggleMobileMenu());
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenu');
            const dropdown = document.getElementById('userMenuDropdown');
            if (!userMenu.contains(e.target) && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('createPostForm')?.addEventListener('submit', (e) => this.handleCreatePost(e));
        document.getElementById('editPostForm')?.addEventListener('submit', (e) => this.handleEditPost(e));
        document.getElementById('addEmailForm')?.addEventListener('submit', (e) => this.handleAddEmail(e));
        document.getElementById('profileForm')?.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => this.handlePasswordChange(e));
        
        // Profile modal buttons
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => this.showChangePasswordModal());
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => this.handleForgotPassword(e));
        
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

        // Filter listeners
        document.getElementById('searchFilter')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('conditionFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('minPrice')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('maxPrice')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('clearFilters')?.addEventListener('click', () => this.clearFilters());

        // Storage management buttons
        document.getElementById('refreshStorageBtn')?.addEventListener('click', () => this.refreshStorageStats());
        document.getElementById('cleanupOrphansBtn')?.addEventListener('click', () => this.cleanupOrphanedPhotos());
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
        
        // Store user profile for role checking
        this.currentUser.role = profile.role;
        
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
        } else if (tabName === 'storage') {
            this.refreshStorageStats();
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
        
        // Clear photos when closing modals
        if (modalId === 'createPostModal') {
            this.clearUploadedPhotos('create');
        } else if (modalId === 'editPostModal') {
            this.clearUploadedPhotos('edit');
        }
    }

    toggleMobileMenu() {
        const dropdown = document.getElementById('userMenuDropdown');
        dropdown.classList.toggle('show');
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
        console.log('Profile update triggered'); // Debug
        
        const currentPassword = document.getElementById('currentPassword').value;
        console.log('Current user:', this.currentUser); // Debug
        
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
                size: document.getElementById('postSize').value || null, // Now accepts text
                condition: document.getElementById('postCondition').value,
                price: parseFloat(document.getElementById('postPrice').value),
                description: document.getElementById('postDescription').value || null,
                contact_method: document.getElementById('postContact').value,
                user_id: this.currentUser.id,
                photos_count: this.uploadedPhotos.length,
                thumbnail_url: this.uploadedPhotos.length > 0 ? 
                    this.supabase.storage.from('post-images').getPublicUrl(this.uploadedPhotos[this.thumbnailIndex]?.path).data.publicUrl : 
                    null
            };

            console.log('Creating post with thumbnail index:', this.thumbnailIndex); // Debug
            console.log('Selected photo path:', this.uploadedPhotos[this.thumbnailIndex]?.path); // Debug

            // Insert post
            const { data: post, error } = await this.supabase
                .from('marketplace_posts')
                .insert(postData)
                .select()
                .single();

            if (error) throw error;

            // Insert photos if any
            if (this.uploadedPhotos.length > 0) {
                const photoInserts = this.uploadedPhotos.map((photo, index) => ({
                    post_id: post.post_id,
                    filename: photo.path.split('/').pop(),
                    original_name: photo.name || `photo_${index + 1}`,
                    file_size: photo.size || null,
                    mime_type: this.getMimeType(photo.name || photo.path),
                    storage_path: photo.path,
                    display_order: index + 1
                }));

                const { error: photoError } = await this.supabase
                    .from('post_images')
                    .insert(photoInserts);

                if (photoError) {
                    console.error('Photo insert error:', photoError);
                }
            }

            this.showNotification('Post created successfully!', 'success');
            this.hideModal('createPostModal');
            document.getElementById('createPostForm').reset();
            this.clearUploadedPhotos('create');
            await this.loadPosts();
            
        } catch (error) {
            console.error('Error creating post:', error);
            this.showNotification(error.message, 'error');
        }
    }

    getMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'webp':
                return 'image/webp';
            case 'gif':
                return 'image/gif';
            default:
                return 'image/jpeg';
        }
    }

    async loadPosts() {
        try {
            const { data: posts, error } = await this.supabase
                .from('marketplace_posts')
                .select(`
                    *,
                    user_profiles(user_name),
                    post_images(storage_path, display_order)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const processedPosts = posts.map(post => {
                const postImages = post.post_images || [];
                
                // Generate URLs from storage paths and sort by display order
                const imagesWithUrls = postImages
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(img => ({
                        ...img,
                        image_url: img.storage_path ? 
                            this.supabase.storage.from('post-images').getPublicUrl(img.storage_path).data.publicUrl : 
                            null
                    }));
                
                // Use thumbnail_url from the post record, not the first image
                return {
                    ...post,
                    thumbnail_url: post.thumbnail_url || null, // Use the actual thumbnail_url field
                    post_images: imagesWithUrls
                };
            });

            this.allPosts = processedPosts;
            this.displayPosts(processedPosts);
            
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showNotification('Error loading posts', 'error');
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
                            <button class="btn-edit" onclick="event.stopPropagation(); app.editPost(${post.post_id})" title="Edit Post">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="event.stopPropagation(); app.deletePost(${post.post_id})" title="Delete Post">
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
                        <div class="post-badges">
                            <span class="post-condition">${post.condition}</span>
                            ${post.status !== 'available' ? `<span class="post-status ${post.status}">${post.status}</span>` : ''}
                        </div>
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
                    user_profiles(user_name, email, phone, location),
                    post_images(storage_path, display_order)
                `)
                .eq('post_id', postId)
                .single();

            if (error) throw error;

            // Generate URLs from storage paths and sort by display order
            const photos = (post.post_images || [])
                .sort((a, b) => a.display_order - b.display_order)
                .map(img => ({
                    ...img,
                    image_url: img.storage_path ? 
                        this.supabase.storage.from('post-images').getPublicUrl(img.storage_path).data.publicUrl : 
                        null
                }));

            const photoGallery = photos.length > 0 ? `
                <div class="post-photos">
                    <div class="photo-gallery">
                        ${photos.map((photo, index) => `
                            <img src="${photo.image_url}" alt="Photo ${index + 1}" 
                                 onclick="app.showPhotoModal('${photo.image_url}')"
                                 style="cursor: pointer;">
                        `).join('')}
                    </div>
                </div>
            ` : '<div class="no-photos">No photos available</div>';

            document.getElementById('postDetailsContent').innerHTML = `
                <div class="post-details">
                    <h2>${post.title}</h2>
                    <div class="post-meta">
                        <span class="post-price">$${post.price}</span>
                        <span class="post-condition">${post.condition}</span>
                        <span class="post-status ${post.status}">${post.status}</span>
                    </div>
                    
                    ${photoGallery}
                    
                    <div class="post-info">
                        <p><strong>Category:</strong> ${post.category.replace('-', ' ')}</p>
                        ${post.brand ? `<p><strong>Brand:</strong> ${post.brand}</p>` : ''}
                        ${post.size ? `<p><strong>Size:</strong> ${post.size}</p>` : ''}
                        ${post.description ? `<p><strong>Description:</strong> ${post.description}</p>` : ''}
                        <p><strong>Contact:</strong> ${post.contact_method}</p>
                        <p><strong>Posted:</strong> ${new Date(post.created_at).toLocaleDateString()}</p>
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
        // Start with storage tab to show the new functionality
        this.switchTab('storage');
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?\n\nThis action cannot be undone.')) {
            return;
        }

        try {
            // First, get all photos for this post
            const { data: photos, error: photoError } = await this.supabase
                .from('post_images')
                .select('storage_path')
                .eq('post_id', postId);

            if (photoError) {
                console.error('Error getting photos for deletion:', photoError);
            }

            // Delete photos from database first (before deleting the post)
            if (photos && photos.length > 0) {
                const { error: deletePhotosError } = await this.supabase
                    .from('post_images')
                    .delete()
                    .eq('post_id', postId);

                if (deletePhotosError) {
                    console.error('Error deleting photos from database:', deletePhotosError);
                    throw deletePhotosError;
                }

                // Delete photos from storage
                const filePaths = photos.map(photo => photo.storage_path);
                const { error: storageError } = await this.supabase.storage
                    .from('post-images')
                    .remove(filePaths);

                if (storageError) {
                    console.error('Error deleting photos from storage:', storageError);
                    // Don't fail the whole operation if storage cleanup fails
                }
            }

            // Now delete the post (after photos are deleted)
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

            // Load existing photos
            const { data: photos, error: photoError } = await this.supabase
                .from('post_images')
                .select('*')  // Select all fields to preserve data
                .eq('post_id', postId)
                .order('display_order');

            if (photoError) {
                console.error('Error loading photos:', photoError);
            }

            // Convert existing photos to the format expected by the upload system
            this.editUploadedPhotos = (photos || []).map(photo => ({
                url: this.supabase.storage.from('post-images').getPublicUrl(photo.storage_path).data.publicUrl,
                path: photo.storage_path,
                name: photo.storage_path.split('/').pop(),
                id: photo.image_id,  // Store the database ID
                originalData: photo  // Store original data for comparison
            }));
            
            // Find thumbnail index based on thumbnail_url
            if (post.thumbnail_url && this.editUploadedPhotos.length > 0) {
                const thumbnailPath = post.thumbnail_url.split('post-images/')[1];
                const thumbnailIndex = this.editUploadedPhotos.findIndex(photo => 
                    photo.path.includes(thumbnailPath)
                );
                this.editThumbnailIndex = thumbnailIndex >= 0 ? thumbnailIndex : 0;
            } else {
                this.editThumbnailIndex = 0;
            }

            // Populate form fields
            document.getElementById('editPostTitle').value = post.title;
            document.getElementById('editPostCategory').value = post.category;
            document.getElementById('editPostBrand').value = post.brand || '';
            document.getElementById('editPostSize').value = post.size || '';
            document.getElementById('editPostCondition').value = post.condition;
            document.getElementById('editPostPrice').value = post.price;
            document.getElementById('editPostDescription').value = post.description || '';
            document.getElementById('editPostContact').value = post.contact_method;
            document.getElementById('editPostStatus').value = post.status;
            document.getElementById('editPostForm').dataset.postId = postId;

            // Update photo preview
            this.updatePhotoPreview('edit');
            
            this.hideModal('postDetailsModal');
            this.showModal('editPostModal');
            
        } catch (error) {
            console.error('Error loading post for editing:', error);
            this.showNotification('Error loading post data', 'error');
        }
    }

    async handleEditPost(e) {
        e.preventDefault();
        const postId = document.getElementById('editPostForm').dataset.postId;
        
        try {
            const updateData = {
                title: document.getElementById('editPostTitle').value,
                category: document.getElementById('editPostCategory').value,
                brand: document.getElementById('editPostBrand').value || null,
                size: document.getElementById('editPostSize').value || null, // Now accepts text
                condition: document.getElementById('editPostCondition').value,
                price: parseFloat(document.getElementById('editPostPrice').value),
                description: document.getElementById('editPostDescription').value || null,
                contact_method: document.getElementById('editPostContact').value,
                status: document.getElementById('editPostStatus').value,
                photos_count: this.editUploadedPhotos.length,
                thumbnail_url: this.editUploadedPhotos.length > 0 ? 
                    this.supabase.storage.from('post-images').getPublicUrl(this.editUploadedPhotos[this.editThumbnailIndex]?.path).data.publicUrl : 
                    null
            };

            // console.log('Editing post with thumbnail index:', this.editThumbnailIndex);
            // console.log('Selected photo path:', this.editUploadedPhotos[this.editThumbnailIndex]?.path);

            // Update post
            const { error: updateError } = await this.supabase
                .from('marketplace_posts')
                .update(updateData)
                .eq('post_id', postId);

            if (updateError) throw updateError;

            // Don't delete existing photos - just update the display_order to reflect new order
            if (this.editUploadedPhotos.length > 0) {
                for (let i = 0; i < this.editUploadedPhotos.length; i++) {
                    const photo = this.editUploadedPhotos[i];
                    
                    // If photo has an ID, it's an existing photo - update its display_order
                    if (photo.id) {
                        const { error: updatePhotoError } = await this.supabase
                            .from('post_images')
                            .update({ display_order: i + 1 })
                            .eq('image_id', photo.id);
                            
                        if (updatePhotoError) {
                            console.error('Error updating photo order:', updatePhotoError);
                        }
                    } else {
                        // New photo - insert it
                        const { error: insertPhotoError } = await this.supabase
                            .from('post_images')
                            .insert({
                                post_id: parseInt(postId),
                                filename: photo.path.split('/').pop(),
                                original_name: photo.name || `photo_${i + 1}`,
                                file_size: photo.size || null,
                                mime_type: this.getMimeType(photo.name || photo.path),
                                storage_path: photo.path,
                                display_order: i + 1
                            });
                            
                        if (insertPhotoError) {
                            console.error('Error inserting new photo:', insertPhotoError);
                        }
                    }
                }
            }

            this.showNotification('Post updated successfully!', 'success');
            this.hideModal('editPostModal');
            this.clearUploadedPhotos('edit');
            await this.loadPosts();
            
        } catch (error) {
            console.error('Error updating post:', error);
            this.showNotification(error.message, 'error');
        }
    }

    applyFilters() {
        if (!this.allPosts) return;
        
        const search = document.getElementById('searchFilter')?.value.toLowerCase() || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const condition = document.getElementById('conditionFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
        const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
        
        const filteredPosts = this.allPosts.filter(post => {
            const matchesSearch = !search || 
                post.title.toLowerCase().includes(search) ||
                (post.brand && post.brand.toLowerCase().includes(search));
            
            const matchesCategory = !category || post.category === category;
            const matchesCondition = !condition || post.condition === condition;
            const matchesStatus = !status || post.status === status;
            const matchesPrice = post.price >= minPrice && post.price <= maxPrice;
            
            return matchesSearch && matchesCategory && matchesCondition && matchesStatus && matchesPrice;
        });
        
        this.displayPosts(filteredPosts);
        this.updateFilterCount(filteredPosts.length, this.allPosts.length);
    }

    clearFilters() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('conditionFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        
        this.applyFilters();
    }

    updateFilterCount(filtered, total) {
        const existingCount = document.querySelector('.filter-count');
        if (existingCount) existingCount.remove();
        
        if (filtered !== total) {
            const countElement = document.createElement('div');
            countElement.className = 'filter-count';
            countElement.textContent = `Showing ${filtered} of ${total} posts`;
            document.querySelector('.filters-container').appendChild(countElement);
        }
    }

    initPhotoUpload() {
        // Create Post Photo Upload
        const addMoreBtn = document.getElementById('addMorePhotosBtn');
        if (addMoreBtn) {
            addMoreBtn.addEventListener('click', () => this.openGalleryUpload());
        }

        // Edit Post Photo Upload
        const editAddMoreBtn = document.getElementById('editAddMorePhotosBtn');
        if (editAddMoreBtn) {
            editAddMoreBtn.addEventListener('click', () => this.openEditGalleryUpload());
        }

        // File input change handlers
        const cameraInput = document.getElementById('photoInputCamera');
        const galleryInput = document.getElementById('photoInputGallery');
        const editCameraInput = document.getElementById('editPhotoInputCamera');
        const editGalleryInput = document.getElementById('editPhotoInputGallery');

        if (cameraInput) cameraInput.addEventListener('change', (e) => this.handleFileSelect(e, 'create'));
        if (galleryInput) galleryInput.addEventListener('change', (e) => this.handleFileSelect(e, 'create'));
        if (editCameraInput) editCameraInput.addEventListener('change', (e) => this.handleFileSelect(e, 'edit'));
        if (editGalleryInput) editGalleryInput.addEventListener('change', (e) => this.handleFileSelect(e, 'edit'));
    }

    // Open camera upload for create post
    openCameraUpload() {
        if (this.uploadedPhotos.length >= 5) {
            this.showNotification('Maximum 5 photos allowed', 'error');
            return;
        }
        document.getElementById('photoInputCamera').click();
    }

    // Open gallery upload for create post
    openGalleryUpload() {
        if (this.uploadedPhotos.length >= 5) {
            this.showNotification('Maximum 5 photos allowed', 'error');
            return;
        }
        document.getElementById('photoInputGallery').click();
    }

    // Open camera upload for edit post
    openEditCameraUpload() {
        if (this.editUploadedPhotos.length >= 5) {
            this.showNotification('Maximum 5 photos allowed', 'error');
            return;
        }
        document.getElementById('editPhotoInputCamera').click();
    }

    // Open gallery upload for edit post
    openEditGalleryUpload() {
        if (this.editUploadedPhotos.length >= 5) {
            this.showNotification('Maximum 5 photos allowed', 'error');
            return;
        }
        document.getElementById('editPhotoInputGallery').click();
    }

    // Handle file selection
    async handleFileSelect(event, mode) {
        const files = Array.from(event.target.files);
        const currentPhotos = mode === 'create' ? this.uploadedPhotos : this.editUploadedPhotos;
        
        // Check total photo limit
        if (currentPhotos.length + files.length > 5) {
            this.showNotification(`Can only upload ${5 - currentPhotos.length} more photos`, 'error');
            return;
        }

        // Validate and process files
        const validFiles = [];
        for (const file of files) {
            if (this.validateFile(file)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length > 0) {
            await this.uploadFiles(validFiles, mode);
        }

        // Clear input
        event.target.value = '';
    }

    // Validate file
    validateFile(file) {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Only JPG, PNG, and WebP files are allowed', 'error');
            return false;
        }

        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            this.showNotification('File size must be less than 5MB', 'error');
            return false;
        }

        return true;
    }

    // Upload files to Supabase
    async uploadFiles(files, mode) {
        if (this.isUploading) return;
        
        this.isUploading = true;
        this.setFormDisabled(mode, true);
        this.showUploadProgress(mode, true);

        try {
            const uploadPromises = files.map((file, index) => 
                this.uploadSingleFile(file, mode, index, files.length)
            );

            const results = await Promise.all(uploadPromises);
            
            // Add successful uploads to photo arrays
            const currentPhotos = mode === 'create' ? this.uploadedPhotos : this.editUploadedPhotos;
            results.forEach(result => {
                if (result.success) {
                    currentPhotos.push(result.photo);
                }
            });

            // Set first photo as thumbnail if none selected
            if (mode === 'create' && this.uploadedPhotos.length === results.filter(r => r.success).length) {
                this.thumbnailIndex = 0;
            } else if (mode === 'edit' && this.editUploadedPhotos.length === results.filter(r => r.success).length) {
                this.editThumbnailIndex = 0;
            }

            this.updatePhotoPreview(mode);
            this.showNotification(`${results.filter(r => r.success).length} photos uploaded successfully`, 'success');

        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        } finally {
            this.isUploading = false;
            this.setFormDisabled(mode, false);
            this.showUploadProgress(mode, false);
        }
    }

    // Upload single file
    async uploadSingleFile(file, mode, index, totalFiles) {
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `posts/${fileName}`;

            // Update progress
            const progressPercent = Math.round(((index + 1) / totalFiles) * 100);
            this.updateUploadProgress(mode, progressPercent, `Uploading ${index + 1}/${totalFiles}...`);

            // Upload to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from('post-images')
                .upload(filePath, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('post-images')
                .getPublicUrl(filePath);

            return {
                success: true,
                photo: {
                    url: publicUrl,
                    path: filePath,
                    name: file.name,
                    size: file.size
                }
            };

        } catch (error) {
            console.error('Single file upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update photo preview
    updatePhotoPreview(mode) {
        const photos = mode === 'create' ? this.uploadedPhotos : this.editUploadedPhotos;
        const thumbnailIndex = mode === 'create' ? this.thumbnailIndex : this.editThumbnailIndex;
        const containerId = mode === 'create' ? 'photoPreviewContainer' : 'editPhotoPreviewContainer';
        const gridId = mode === 'create' ? 'photoPreviewGrid' : 'editPhotoPreviewGrid';
        const uploadAreaId = mode === 'create' ? 'photoUploadArea' : 'editPhotoUploadArea';

        const container = document.getElementById(containerId);
        const grid = document.getElementById(gridId);
        const uploadArea = document.getElementById(uploadAreaId);

        if (photos.length === 0) {
            container.style.display = 'none';
            uploadArea.style.display = 'block';
            return;
        }

        // Show preview container, hide upload area
        container.style.display = 'block';
        uploadArea.style.display = 'none';

        // Generate preview HTML
        grid.innerHTML = photos.map((photo, index) => `
            <div class="photo-preview-item ${index === thumbnailIndex ? 'thumbnail' : ''}" 
                 onclick="event.stopPropagation(); app.setThumbnail(${index}, '${mode}')">
                <img src="${photo.url}" alt="Preview ${index + 1}">
                <button class="photo-remove-btn" onclick="event.stopPropagation(); app.removePhoto(${index}, '${mode}')" type="button">
                    ×
                </button>
            </div>
        `).join('');
    }

    // Set thumbnail
    setThumbnail(index, mode) {
        if (mode === 'create') {
            this.thumbnailIndex = index;
        } else {
            this.editThumbnailIndex = index;
        }
        this.updatePhotoPreview(mode);
    }

    // Remove photo
    async removePhoto(index, mode) {
        const photos = mode === 'create' ? this.uploadedPhotos : this.editUploadedPhotos;
        const photo = photos[index];

        try {
            // Delete from Supabase Storage
            const { error } = await this.supabase.storage
                .from('post-images')
                .remove([photo.path]);

            if (error) throw error;

            // Remove from array
            photos.splice(index, 1);

            // Adjust thumbnail index
            if (mode === 'create') {
                if (this.thumbnailIndex >= index && this.thumbnailIndex > 0) {
                    this.thumbnailIndex--;
                }
            } else {
                if (this.editThumbnailIndex >= index && this.editThumbnailIndex > 0) {
                    this.editThumbnailIndex--;
                }
            }

            this.updatePhotoPreview(mode);
            this.showNotification('Photo removed', 'success');

        } catch (error) {
            console.error('Remove photo error:', error);
            this.showNotification('Failed to remove photo', 'error');
        }
    }

    // Show/hide upload progress
    showUploadProgress(mode, show) {
        const progressId = mode === 'create' ? 'uploadProgress' : 'editUploadProgress';
        const progress = document.getElementById(progressId);
        if (progress) {
            progress.classList.toggle('hidden', !show);
        }
    }

    // Update upload progress
    updateUploadProgress(mode, percent, text) {
        const fillId = mode === 'create' ? 'progressFill' : 'editProgressFill';
        const textId = mode === 'create' ? 'progressText' : 'editProgressText';
        
        const fill = document.getElementById(fillId);
        const textEl = document.getElementById(textId);
        
        if (fill) fill.style.width = `${percent}%`;
        if (textEl) textEl.textContent = text;
    }

    // Set form disabled state
    setFormDisabled(mode, disabled) {
        const formId = mode === 'create' ? 'createPostForm' : 'editPostForm';
        const form = document.getElementById(formId);
        if (form) {
            form.classList.toggle('form-disabled', disabled);
        }
    }

    // Clear uploaded photos (call when modal closes)
    clearUploadedPhotos(mode) {
        if (mode === 'create') {
            this.uploadedPhotos = [];
            this.thumbnailIndex = 0;
        } else {
            this.editUploadedPhotos = [];
            this.editThumbnailIndex = 0;
        }
        this.updatePhotoPreview(mode);
    }

    // Add photo modal for full-size viewing
    showPhotoModal(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="photo-modal-content">
                <span class="photo-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <img src="${imageUrl}" alt="Full size photo">
            </div>
        `;
        document.body.appendChild(modal);
    }

    async refreshStorageStats() {
        try {
            // Show loading state
            document.getElementById('totalPhotosCount').textContent = 'Loading...';
            document.getElementById('dbPhotosCount').textContent = 'Loading...';
            document.getElementById('orphanPhotosCount').textContent = 'Loading...';
            document.getElementById('storageUsed').textContent = 'Loading...';
            
            // Get all files from storage
            const { data: storageFiles, error: storageError } = await this.supabase.storage
                .from('post-images')
                .list('posts', {
                    limit: 1000,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (storageError) throw storageError;

            // Get all photos from database
            const { data: dbPhotos, error: dbError } = await this.supabase
                .from('post_images')
                .select('storage_path');

            if (dbError) throw dbError;

            // Create sets for comparison
            const storageFilePaths = new Set(storageFiles.map(file => `posts/${file.name}`));
            const dbFilePaths = new Set(dbPhotos.map(photo => photo.storage_path));

            // Find orphaned files
            const orphanedFiles = storageFiles.filter(file => 
                !dbFilePaths.has(`posts/${file.name}`)
            );

            // Calculate total storage used
            const totalSize = storageFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
            const orphanSize = orphanedFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);

            // Update UI
            document.getElementById('totalPhotosCount').textContent = storageFiles.length;
            document.getElementById('dbPhotosCount').textContent = dbPhotos.length;
            document.getElementById('orphanPhotosCount').textContent = orphanedFiles.length;
            document.getElementById('storageUsed').textContent = this.formatFileSize(totalSize);

            // Enable/disable cleanup button
            const cleanupBtn = document.getElementById('cleanupOrphansBtn');
            cleanupBtn.disabled = orphanedFiles.length === 0;
            
            if (orphanedFiles.length > 0) {
                cleanupBtn.textContent = `Delete ${orphanedFiles.length} Orphaned Photos (${this.formatFileSize(orphanSize)})`;
            } else {
                cleanupBtn.textContent = 'No Orphaned Photos';
            }

            // Store orphaned files for cleanup
            this.orphanedFiles = orphanedFiles;

            // Show orphaned files list if any
            if (orphanedFiles.length > 0) {
                this.displayOrphanedFiles(orphanedFiles);
            } else {
                document.getElementById('orphansList').classList.add('hidden');
            }

        } catch (error) {
            console.error('Error refreshing storage stats:', error);
            this.showNotification('Error loading storage statistics', 'error');
            
            // Reset UI on error
            document.getElementById('totalPhotosCount').textContent = 'Error';
            document.getElementById('dbPhotosCount').textContent = 'Error';
            document.getElementById('orphanPhotosCount').textContent = 'Error';
            document.getElementById('storageUsed').textContent = 'Error';
        }
    }

    displayOrphanedFiles(orphanedFiles) {
        const container = document.getElementById('orphansContainer');
        const orphansList = document.getElementById('orphansList');
        
        container.innerHTML = orphanedFiles.slice(0, 10).map(file => `
            <div class="orphan-item">
                <span>posts/${file.name}</span>
                <span>${this.formatFileSize(file.metadata?.size || 0)}</span>
            </div>
        `).join('');
        
        if (orphanedFiles.length > 10) {
            container.innerHTML += `<div class="orphan-item"><em>... and ${orphanedFiles.length - 10} more files</em></div>`;
        }
        
        orphansList.classList.remove('hidden');
    }

    async cleanupOrphanedPhotos() {
        if (!this.orphanedFiles || this.orphanedFiles.length === 0) {
            this.showNotification('No orphaned photos to delete', 'info');
            return;
        }

        const orphanCount = this.orphanedFiles.length;
        const totalSize = this.orphanedFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
        
        if (!confirm(`Delete ${orphanCount} orphaned photos?\n\nThis will free up ${this.formatFileSize(totalSize)} of storage space.\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            // Show progress
            const cleanupBtn = document.getElementById('cleanupOrphansBtn');
            const originalText = cleanupBtn.textContent;
            cleanupBtn.disabled = true;
            cleanupBtn.textContent = 'Deleting...';

            // Delete files in batches
            const batchSize = 10;
            let deletedCount = 0;
            
            for (let i = 0; i < this.orphanedFiles.length; i += batchSize) {
                const batch = this.orphanedFiles.slice(i, i + batchSize);
                const filePaths = batch.map(file => `posts/${file.name}`);
                
                const { error } = await this.supabase.storage
                    .from('post-images')
                    .remove(filePaths);

                if (error) {
                    console.error('Batch delete error:', error);
                } else {
                    deletedCount += batch.length;
                }
                
                // Update progress
                cleanupBtn.textContent = `Deleting... ${deletedCount}/${orphanCount}`;
            }

            this.showNotification(`Successfully deleted ${deletedCount} orphaned photos`, 'success');
            
            // Refresh stats
            await this.refreshStorageStats();
            
        } catch (error) {
            console.error('Error cleaning up orphaned photos:', error);
            this.showNotification('Error deleting orphaned photos', 'error');
        } finally {
            // Reset button
            const cleanupBtn = document.getElementById('cleanupOrphansBtn');
            cleanupBtn.disabled = false;
            cleanupBtn.textContent = 'Delete Orphaned Photos';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GSS_Marketplace();
});
