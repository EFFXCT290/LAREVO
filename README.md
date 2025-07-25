# LA-REVO Tracker

A modern, full-featured private torrent tracker with a Next.js frontend and Fastify/Prisma backend.

---

## Features

### Backend (`/api`)
- **User Management:**
  - Registration, login, email verification, password reset
  - Profile management, roles (USER, MOD, ADMIN, OWNER)
  - Avatar upload, notifications, bookmarks, RSS token
- **Torrent Management:**
  - Upload, approval workflow, NFO support, category assignment
  - File storage (local/S3/DB), torrent stats, hit-and-run tracking
  - Bonus points, announce rate limiting, peer bans
- **Requests:**
  - Create, fill, comment, close, and manage requests for torrents
- **Categories:**
  - Hierarchical categories for torrents and requests
- **Announcements:**
  - Admin-created announcements, pinning, visibility control
- **Wiki:**
  - User-editable wiki pages with locking, parent/child structure
- **Comments:**
  - Threaded comments on torrents and requests, voting system
- **Admin Features:**
  - User management (ban/unban/promote/demote), peer ban management
  - SMTP config, tracker config, category management, overview stats, logs
- **Anti-Cheat & Security:**
  - Ghost leeching, cheating client detection, IP abuse, announce interval enforcement
  - Invalid stats, peer ban checks, configurable thresholds
- **Invites:**
  - Invite system for user registration
- **Notifications:**
  - User and admin notifications, related to bans and other events
- **Uploaded Files:**
  - Support for avatars, posters, and other file types

#### Main Backend Models (Prisma)
- User, Category, Torrent, Announce, Invite, Config, Request, HitAndRun, AnnounceRateLimit, PeerBan, Notification, Announcement, WikiPage, Bookmark, EmailVerificationToken, PasswordResetToken, UploadedFile, Comment, CommentVote

---

### Frontend (`/client`)
- **Authentication:**
  - Login, registration, password reset, email verification, unverified notice
- **Dashboard:**
  - Main user dashboard with torrent list, pinned announcements, stats
- **Browsing:**
  - Browse torrents by category, view details, download
- **Categories:**
  - View all categories, browse by category
- **Requests:**
  - View, create, fill, and comment on requests
- **Bookmarks:**
  - Manage torrent bookmarks, add notes
- **Announcements:**
  - View all and individual announcements
- **Wiki:**
  - Browse and read wiki pages, view by slug
- **Profile:**
  - View and edit user profile, avatar upload, stats
- **Notifications:**
  - View and manage notifications
- **RSS:**
  - Manage RSS token and settings
- **Upload:**
  - Upload new torrents
- **Admin Dashboard:**
  - Overview, user management, torrent approval, category management, announcements, requests, wiki, peer bans, invites, notifications, config, logs
- **UI/UX:**
  - Modern, responsive design with sidebar navigation, floating label inputs, toggle switches, and more

---

## Getting Started

See `/api/README.md` and `/client/README.md` for setup instructions.

---

## License

MIT 