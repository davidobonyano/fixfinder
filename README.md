
# 🔧 FixFinder – Local Services Directory Web App

FixFinder is a responsive and modern web application built with React and Tailwind CSS that helps users easily find verified local service providers—such as electricians, plumbers, tailors, and more—based on category and location.

## 🌟 Features

- 🏠 **Home Page** with:
  - Hero section
  - "How It Works" overview
  - User testimonials
  - "Why Choose Us" highlights
  - Dynamic service cards
  - Geo-filtered search

- 📂 **Services Directory** (`/services`)
  - Displays all service categories with icons and brief descriptions

- 📁 **Category Page** (`/services/:category`)
  - Shows professionals for each selected service category

- 👤 **Professional Profiles**
  - Profile cards with name, location, rating, and quick contact options
  - Integrated user review modal

- ➕ **Add a Service** (`/add-service`)
  - Simple form for anyone to list their service (for now, no backend)

- 🚀 **Future: Join as a Pro (Planned)**
  - Placeholder for verified professional registration (saved for backend implementation)

## 🧱 Tech Stack

- **Frontend**: React, Vite
- **Styling**: Tailwind CSS, Font Awesome, React Icons
- **Routing**: React Router
- **State Management**: React Context (for basic auth simulation)
- **Data**: Local JSON (`services.json`, `professionals.json`)

## 📁 Project Structure

\`\`\`
src/
├── public/               # Images and static files
│   └── pros/             # Professional profile pictures
├── components/           # Reusable UI components
├── context/              # AuthContext and related hooks
├── data/                 # Static JSON for services & professionals
├── layout/               # RootLayout, Header, Footer
├── pages/                # Home, Services, Category, AddService, Contact, etc.
├── utils/                # API utilities, validation functions
└── App.jsx               # Main routing and layout wrapper
\`\`\`

## 🛠 Setup Instructions

1. **Clone the repo**
   \`\`\`bash
   git clone https:/davidobonyano/github.com//fixfinder.git
   cd fixfinder
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **View locally**
   Open your browser to fixfinder-cyan.vercel.app

## 🧩 To-Do / Planned Enhancements

- ✅ Build responsive and animated UI for all core pages
- 🕒 Backend integration (Express, MongoDB/MySQL) – *Coming Soon*
- 🛡 Verified Pro onboarding + login system
- 🗃 Admin dashboard (Saved for backend phase)
- 📍 Google Maps integration
- 📱 PWA optimization

## 📸 Screenshots

### 🏠 Homepage
![Homepage Screenshot](./src/assets/screenshots/homepage.jpeg)

### 📂 Services Page
![Services Screenshot](./src/assets/screenshots/servicespage.jpeg)

### 👤 Professional Modal
![Professional Modal Screenshot](./src/assets/screenshots/modal.jpeg)

## 🤝 Contributing

FixFinder is currently a solo-built project in active development. Contributions, ideas, and feedback are welcome!

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

Built with ❤️ by  David yano
    
