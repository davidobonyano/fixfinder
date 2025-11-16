# FindYourFixer

A platform connecting users with verified local service professionals.

## Features

- User and professional authentication
- Job posting and management
- Real-time chat messaging
- Professional verification (email and face verification)
- Location-based service discovery
- Admin dashboard for user management
- Reporting and ban system
- Dark mode support

## Tech Stack

**Frontend:**
- React
- Vite
- Tailwind CSS
- React Router
- Socket.io Client

**Backend:**
- Node.js
- Express
- MongoDB
- Socket.io
- JWT Authentication

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd fixfinder
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

### Backend Setup

1. Navigate to the backend directory
```bash
cd "fix-finder backend"
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables in `.env`

4. Start the server
```bash
npm start
```

## Project Structure

```
fixfinder/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── context/        # React context providers
│   ├── utils/          # Utility functions
│   └── layout/         # Layout components

fix-finder backend/
├── controllers/        # Route controllers
├── models/            # Database models
├── routes/            # API routes
├── middleware/        # Express middleware
└── utils/             # Utility functions
```

## License

MIT
