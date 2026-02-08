import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Shield, Sparkles } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();
  const benefits = [
    { icon: Shield, text: 'Secure bookings' },
    { icon: CheckCircle2, text: 'Prepaid slot holds' },
    { icon: Sparkles, text: 'AI-powered fairness' },
  ];

  return (
    <section className="relative pt-40 pb-32 md:pt-48 md:pb-40 overflow-hidden">
      <div className="container-apple relative z-10">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 rounded-full badge-glass text-sm text-white/70 uppercase tracking-wider"
          >
            Smart Booking Protection System
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-semibold hero-headline">
              Your SLOTTA
              <br />
              <span className="text-gradient">They Show</span>
            </h1>
            <p className="text-base md:text-lg text-white/50 leading-relaxed max-w-3xl mx-auto">
              A smart hold system that keeps your schedule full and your income safe.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="benefit-badge flex items-center gap-3 rounded-full px-5 py-3"
                >
                  <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  <span className="text-sm text-white/80 font-medium">{benefit.text}</span>
                </div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <button
              className="px-8 py-4 rounded-full font-medium text-base text-white glass-button-primary w-full sm:w-auto"
              onClick={() => navigate('/sophiabrown')}
            >
              Try Live Demo
            </button>
            <button
              className="px-8 py-4 rounded-full font-medium text-base text-white glass-button w-full sm:w-auto"
              onClick={() => navigate('/register')}
            >
              Start Free Trial
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-sm text-white/40"
          >
            First month free • No credit card required • Cancel anytime
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
