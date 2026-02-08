import { motion } from 'framer-motion';
import { DollarSign, Clock, Users } from 'lucide-react';

const ProblemSection = () => {
  const problems = [
    {
      icon: DollarSign,
      title: 'Lost Income',
      description: 'No-shows mean empty slots you could have filled. That is money walking out the door.',
    },
    {
      icon: Clock,
      title: 'Wasted Time',
      description: 'Every cancellation is a scramble. Rearrange, reschedule, repeat.',
    },
    {
      icon: Users,
      title: 'Client Relationships',
      description: 'Trust erodes when clients ghost. But demanding full payment upfront feels harsh.',
    },
  ];

  return (
    <section id="problem" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-6 mb-20"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
            Your time is money
            <br />
            Let&apos;s stop losing it
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card feature-card rounded-3xl p-8 md:p-10"
              >
                <div className="icon-glow w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-4 tracking-tight">
                  {problem.title}
                </h3>
                <p className="text-base text-white/50 leading-relaxed">
                  {problem.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
