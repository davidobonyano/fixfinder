// src/components/Footer.jsx
import { NavLink } from "react-router-dom";
import { Facebook, Twitter, Instagram } from "lucide-react"; // optional: install with `npm i lucide-react`

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
      <div className="container mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 text-sm">
        
        <div>
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">FixFinder</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Your trusted local directory for finding skilled service providers — verified, rated, and reliable.
          </p>
        </div>

        
        <div className="flex flex-col sm:items-end">
          <nav className="flex flex-col gap-2 text-gray-600 dark:text-gray-300">
            <NavLink to="/" className="hover:text-indigo-500">Home</NavLink>
            <NavLink to="/help/faq" className="hover:text-indigo-500">FAQ</NavLink>
            <NavLink to="/help/contact" className="hover:text-indigo-500">Contact</NavLink>
          </nav>

        
          <div className="flex gap-4 mt-4 text-gray-500 dark:text-gray-400">
            <a href="#"><Facebook className="h-5 w-5 hover:text-indigo-500" /></a>
            <a href="#"><Twitter className="h-5 w-5 hover:text-indigo-500" /></a>
            <a href="#"><Instagram className="h-5 w-5 hover:text-indigo-500" /></a>
          </div>
        </div>
      </div>

    
      <div className="text-center text-xs py-4 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        &copy; {new Date().getFullYear()} FixFinder.
      </div>
    </footer>
  );
}
