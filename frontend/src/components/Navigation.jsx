import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navigation = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];
  const routeLinks = [
    { name: 'Master FAQ', to: '/faq/master' },
    { name: 'Client FAQ', to: '/faq/client' },
    { name: 'Troubleshooting', to: '/faq/troubleshooting' },
  ];

  const handleNavClick = (event, href) => {
    if (!href || href === '#') return;
    event.preventDefault();
    setIsMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'nav-glass' : 'bg-transparent'
      }`}
    >
      <nav className="container-apple py-6">
        <div className="flex items-center justify-between">
          <motion.a
            href="#"
            className="text-2xl font-semibold tracking-tight"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-gradient">SLOTTA</span>
          </motion.a>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
                onClick={(event) => handleNavClick(event, link.href)}
              >
                {link.name}
              </a>
            ))}
            {routeLinks.map((link) => (
              <button
                key={link.name}
                type="button"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
                onClick={() => navigate(link.to)}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              className="px-6 py-3 rounded-full font-medium text-base text-white glass-button"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button
              className="px-6 py-3 rounded-full font-medium text-base text-white glass-button-primary"
              onClick={() => navigate('/register')}
            >
              Start Free Trial
            </button>
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden mt-6 space-y-4"
            >
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-sm font-medium text-white/60 hover:text-white transition-colors py-2"
                  onClick={(event) => handleNavClick(event, link.href)}
                >
                  {link.name}
                </a>
              ))}
              {routeLinks.map((link) => (
                <button
                  key={link.name}
                  type="button"
                  className="block text-left text-sm font-medium text-white/60 hover:text-white transition-colors py-2"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate(link.to);
                  }}
                >
                  {link.name}
                </button>
              ))}
              <div className="space-y-3 pt-4">
                <button
                  className="w-full px-6 py-3 rounded-full font-medium text-base text-white glass-button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Sign In
                </button>
                <button
                  className="w-full px-6 py-3 rounded-full font-medium text-base text-white glass-button-primary"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/register');
                  }}
                >
                  Start Free Trial
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Navigation;
