import { motion } from 'framer-motion';
import { Briefcase, Scissors, Heart, GraduationCap, Palette } from 'lucide-react';

const WhoItsFor = () => {
  const categories = [
    {
      icon: Briefcase,
      title: 'Business & Creative',
      description: 'Consultants, coaches, lawyers, designers',
    },
    {
      icon: Scissors,
      title: 'Beauty',
      description: 'Salons, barbers, nail artists, makeup professionals',
    },
    {
      icon: Heart,
      title: 'Wellness',
      description: 'Therapists, massage, yoga instructors, personal trainers',
    },
    {
      icon: GraduationCap,
      title: 'Tutors',
      description: 'Music teachers, academic tutors, language instructors',
    },
    {
      icon: Palette,
      title: 'Freelancers',
      description: 'Photographers, content creators, event planners',
    },
  ];

  return (
    <section id="who-its-for" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-6 mb-20"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
            Who It Is For
          </h2>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
            Perfect for anyone who books appointments and values their time
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card feature-card rounded-3xl p-8"
              >
                <div className="icon-glow w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">
                  {category.title}
                </h3>
                <p className="text-base text-white/50 leading-relaxed">
                  {category.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhoItsFor;
