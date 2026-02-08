import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section id="cta" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-12"
        >
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
              Ready to stop
              <br />
              <span className="text-gradient">losing money?</span>
            </h2>
            <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
              Join thousands of professionals protecting their time and income with Slotta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              className="px-8 py-4 rounded-full font-medium text-base text-white glass-button-primary w-full sm:w-auto"
              onClick={() => navigate('/register')}
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 inline-block" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <div className="trust-dot" />
              <span>First month free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="trust-dot" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="trust-dot" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
