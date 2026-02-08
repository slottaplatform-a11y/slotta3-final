import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const sections = [
    {
      title: 'Masters',
      items: [
        {
          question: 'How does the Slotta hold work?',
          answer:
            "Slotta places a temporary authorization on the client's card. No money is taken unless they no-show.",
        },
        {
          question: 'When do I receive compensation?',
          answer:
            'If the client no-shows or cancels late, Stripe automatically transfers your compensation amount.',
        },
        {
          question: 'Do clients see the hold?',
          answer:
            'Yes, clients see a standard "pending authorization" on their card.',
        },
      ],
    },
    {
      title: 'Clients',
      items: [
        {
          question: 'Will I be charged upfront?',
          answer:
            'No. Slotta only places a temporary hold. You are charged only if you no-show.',
        },
        {
          question: 'When is the hold released?',
          answer:
            'Immediately after your appointment or whenever you cancel within policy.',
        },
        {
          question: 'Why do you authorize my card?',
          answer:
            "To ensure fairness and protect the master’s time. No payment is taken unless policy is broken.",
        },
      ],
    },
  ];

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-12"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-base md:text-lg text-white/50">
            Clear answers for masters and clients
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sections.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: groupIndex * 0.1 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="text-sm text-white/40 uppercase tracking-wider">
                {group.title}
              </div>
              <div className="space-y-4">
                {group.items.map((item, itemIndex) => {
                  const index = groupIndex * 10 + itemIndex;
                  const isOpen = openIndex === index;
                  return (
                    <motion.div
                      key={item.question}
                      className={`glass-card rounded-3xl p-6 ${isOpen ? 'neon-glow' : ''}`}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.3 }}
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-4 text-left"
                        onClick={() => toggle(index)}
                        aria-expanded={isOpen}
                      >
                        <span className="text-lg font-semibold text-white">
                          {item.question}
                        </span>
                        <motion.span
                          className={`text-2xl ${
                            isOpen ? 'text-gradient neon-text' : 'text-white/80'
                          }`}
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {isOpen ? '−' : '+'}
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 text-white/50 leading-relaxed"
                          >
                            {item.answer}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="mt-6 h-px bg-gradient-to-r from-[#FF2E93] to-[#9D00FF] opacity-30" />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
