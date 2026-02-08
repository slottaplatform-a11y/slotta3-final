import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

const PricingSection = () => {
  const navigate = useNavigate();
  const features = [
    'Unlimited bookings',
    'AI-powered hold calculations',
    'Automated no-show compensation',
    'Flexible rescheduling policies',
    'Real-time notifications',
    'Detailed analytics dashboard',
    'Priority customer support',
    'Stripe integration included',
  ];

  return (
    <section id="pricing" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
              Simple Pricing
            </h2>
            <p className="text-base md:text-lg text-white/50">
              One plan. No surprises. Cancel anytime.
            </p>
          </div>

          <div className="pricing-glow">
            <div className="glass-card rounded-3xl p-12 md:p-16">
              <div className="space-y-12">
                <div className="text-center space-y-4">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl md:text-7xl font-bold text-gradient">€12</span>
                    <span className="text-2xl text-white/40">/ month</span>
                  </div>
                  <p className="text-lg font-medium text-white/80">First month free</p>
                  <p className="text-white/50">Protect unlimited bookings</p>
                </div>

                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-base text-white/80">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-8">
                  <button
                    className="w-full px-8 py-4 rounded-full font-medium text-base text-white glass-button-primary"
                    onClick={() => navigate('/register')}
                  >
                    Start Your Free Month
                  </button>
                  <p className="text-center text-sm text-white/40 mt-4">
                    No credit card required to start
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
