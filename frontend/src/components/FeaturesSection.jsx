import { motion } from 'framer-motion';
import { Lock, Brain, Scale, RefreshCw } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: Lock,
      title: 'Hold, Do Not Charge',
      description: 'Slotta places a hold on your client card - no money taken until they show. Fair for both sides.',
    },
    {
      icon: Brain,
      title: 'Smart, Not Fixed',
      description: 'AI calculates the perfect hold based on your service price and past no-show patterns.',
    },
    {
      icon: Scale,
      title: 'Fair Split',
      description: 'If they cancel last minute, you get compensated. If they reschedule properly, they pay nothing extra.',
    },
    {
      icon: RefreshCw,
      title: 'Stress-Free Rescheduling',
      description: 'Clients can move appointments hassle-free when they follow your policy.',
    },
  ];

  return (
    <section id="features" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-6 mb-20"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
            Enter <span className="text-gradient">Slotta</span>
          </h2>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="glass-card feature-card rounded-3xl p-8 md:p-10 text-center"
                >
                  <div className="icon-glow w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-white mb-4 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-base text-white/50 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
