import { motion } from 'framer-motion';
import { Calendar, Cpu, CreditCard, CheckCircle2 } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      icon: Calendar,
      title: 'Client books',
      description: 'Your client selects a time and enters their payment info.',
    },
    {
      number: '02',
      icon: Cpu,
      title: 'Slotta calculated',
      description: 'Our AI determines the optimal hold amount based on your service and history.',
    },
    {
      number: '03',
      icon: CreditCard,
      title: 'Card authorized',
      description: 'A hold is placed on their card - no money charged yet.',
    },
    {
      number: '04',
      icon: CheckCircle2,
      title: 'Compensation or release',
      description: 'They show? Hold released. No-show? You get paid your fair share.',
    },
  ];

  return (
    <section id="how-it-works" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-6 mb-20"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">How It Works</h2>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
            Four simple steps to protect your time and income
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-primary/40 to-transparent transform -translate-x-1/2" />
                  )}

                  <div className="space-y-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-5xl font-bold text-white/10 number-glow">{step.number}</span>
                      <div className="icon-glow w-12 h-12 rounded-2xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold tracking-tight text-white">{step.title}</h3>
                      <p className="text-sm md:text-base text-white/50 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
