import { motion } from 'framer-motion';
import { Mail, Twitter, Linkedin, Instagram } from 'lucide-react';

const Footer = () => {
  const footerLinks = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'FAQ', href: '#faq' },
    ],
    Company: [
      { label: 'About', href: '#insight' },
      { label: 'Blog', href: '#example' },
      { label: 'Careers', href: '#who-its-for' },
      { label: 'Contact', href: '#cta' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '#footer' },
      { label: 'Terms of Service', href: '#footer' },
      { label: 'Cookie Policy', href: '#footer' },
    ],
    Support: [
      { label: 'Help Center', href: '#cta' },
      { label: 'Documentation', href: '#features' },
      { label: 'API', href: '#pricing' },
      { label: 'Status', href: '#payouts' },
    ],
    'FAQ Routes': [
      { label: 'Master FAQ', href: '/faq/master' },
      { label: 'Client FAQ', href: '/faq/client' },
      { label: 'Troubleshooting', href: '/faq/troubleshooting' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Mail, href: '#', label: 'Email' },
  ];

  const handleFooterClick = (event, href) => {
    if (!href || href === '#') return;
    if (href.startsWith('/faq/')) {
      return;
    }
    event.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer id="footer" className="border-t border-white/10">
      <div className="container-apple py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 text-center lg:text-left">
          <div className="lg:col-span-2 space-y-6 flex flex-col items-center lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-semibold">
                <span className="text-gradient">SLOTTA</span>
              </h3>
              <p className="text-sm text-white/50 mt-4 max-w-xs">
                Smart booking protection that keeps your schedule full and your income safe.
              </p>
            </motion.div>

            <div className="flex gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="w-10 h-10 rounded-full glass-button flex items-center justify-center"
                  >
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h4
                className={`font-semibold text-sm ${
                  category === 'FAQ Routes' ? 'text-gradient neon-text' : 'text-white'
                }`}
              >
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className={`text-sm text-white/50 hover:text-white transition-colors duration-200 ${
                        category === 'FAQ Routes' ? 'hover:text-white neon-text' : ''
                      }`}
                      onClick={(event) => handleFooterClick(event, link.href)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Slotta. All rights reserved.
          </p>
          <p className="text-sm text-white/50">
            Made with care for service professionals worldwide
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
