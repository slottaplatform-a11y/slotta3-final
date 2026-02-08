import { motion } from 'framer-motion';

const InsightSection = () => {
  return (
    <section id="insight" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto text-center"
        >
          <p className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
            You don&apos;t need full upfront payment
            <br />
            <span className="text-gradient">You need fairness</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default InsightSection;
