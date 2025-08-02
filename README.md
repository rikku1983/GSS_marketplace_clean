# 🏁 GSS Marketplace

A **club-based marketplace platform** for Garden State Speed Skating Club members to buy, sell, and trade equipment. Built with modern web technologies focusing on security, user experience, and community management.

## 🎯 Features

### 🔐 **Secure Access Control**
- **Whitelist-based registration** - Only pre-approved emails can join
- **Admin-controlled access** - Admins manage community membership
- **Role-based permissions** - Members vs Admins with different capabilities
- **Email confirmation** required for account activation

### 🛒 **Marketplace Functionality**
- **Equipment listings** with multiple photos
- **Category filtering** (Skates, Protective Gear, Clothing, etc.)
- **Condition tracking** (New, Like-new, Good, Fair, Poor)
- **Status management** (Available → Pending → Sold)
- **Direct contact** between buyers and sellers
- **Public browsing** - anyone can view listings

### 👥 **User Management**
- **User profiles** with contact information
- **Admin dashboard** for user and whitelist management
- **Post management** - create, edit, delete listings
- **Image upload** system with multiple photos per post

## 🏛️ Tech Stack

- **Frontend**: Vanilla JavaScript SPA (Single Page Application)
- **Backend**: Express.js REST API
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth with email confirmation
- **File Storage**: Supabase Storage for images
- **Deployment**: Vercel (serverless)
- **Development**: SQLite + JWT for local testing

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Supabase account
- Vercel account (for deployment)

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/gss-marketplace.git
cd gss-marketplace
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. **Set up Supabase database**
- Create a new Supabase project
- Run the SQL from `db_design.sql` in your Supabase SQL editor
- Configure Row Level Security policies

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
gss-marketplace/
├── frontend/           # Vanilla JS SPA
│   ├── index.html     # Main HTML file
│   ├── js/            # JavaScript modules
│   ├── css/           # Stylesheets
│   └── assets/        # Static assets
├── backend/           # Express.js API
│   ├── server.js      # Main server file
│   ├── routes/        # API routes
│   ├── middleware/    # Custom middleware
│   └── utils/         # Utility functions
├── db_design.sql      # Database schema
├── design.md          # Complete system design
└── README.md          # This file
```

## 🗄️ Database Schema

### Core Tables
- **`email_whitelist`** - Controls registration access
- **`user_profiles`** - Extended user information
- **`marketplace_posts`** - Equipment listings
- **`post_images`** - Multiple photos per post
- **`messages`** - Buyer-seller communication
- **`user_favorites`** - Saved posts
- **`trade_history`** - Completed transactions
- **`user_ratings`** - User feedback system

See `db_design.sql` for complete schema and `design.md` for detailed documentation.

## 🔐 Security Features

- **Row Level Security (RLS)** policies in Supabase
- **Email whitelist** enforcement
- **JWT token** validation
- **Input sanitization** and validation
- **Rate limiting** on API endpoints
- **CORS protection**

## 🎨 User Interface

- **Modal-based UI** - Clean, no page reloads
- **Responsive design** - Mobile-friendly
- **Real-time updates** - Supabase subscriptions
- **Image galleries** - Multiple photos per listing
- **Advanced filtering** - Category, condition, price range

## 👨‍💼 Admin Features

- **User management** - View, delete users
- **Whitelist control** - Add/remove allowed emails
- **Content moderation** - Edit/delete any posts
- **System overview** - User activity and statistics

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏁 About Garden State Speed Skating

This marketplace was built specifically for the Garden State Speed Skating Club community to facilitate equipment trading among members. The platform emphasizes security, community trust, and ease of use.

## 📞 Support

For questions or support, please contact the club administrators or open an issue in this repository.

---

**Built with ❤️ for the speed skating community**