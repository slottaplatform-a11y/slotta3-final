import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const ExampleBooking = () => {
  const [animatedHold, setAnimatedHold] = useState(0);
  const [animatedCompensation, setAnimatedCompensation] = useState(0);

  const targetHold = 45;
  const targetCompensation = 30;

  useEffect(() => {
    const holdInterval = setInterval(() => {
      setAnimatedHold((prev) => {
        if (prev < targetHold) return prev + 1;
        clearInterval(holdInterval);
        return targetHold;
      });
    }, 30);

    const compensationInterval = setInterval(() => {
      setAnimatedCompensation((prev) => {
        if (prev < targetCompensation) return prev + 1;
        clearInterval(compensationInterval);
        return targetCompensation;
      });
    }, 40);

    return () => {
      clearInterval(holdInterval);
      clearInterval(compensationInterval);
    };
  }, []);

  return (
    <section id="example" className="py-32 md:py-40">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">See It In Action</h2>
            <p className="text-base md:text-lg text-white/50">A real booking scenario</p>
          </div>

          <div className="glass-card rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm text-white/40 uppercase tracking-wider">Service</p>
                  <p className="text-2xl font-semibold text-white">1-Hour Consultation</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-white/40 uppercase tracking-wider">Full Price</p>
                  <p className="text-4xl font-bold text-gradient">€150</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-white/40 uppercase tracking-wider">Slotta Hold</p>
                  <div className="flex items-baseline gap-2">
                    <motion.p className="text-4xl font-bold text-white number-glow" key={animatedHold}>
                      €{animatedHold}
                    </motion.p>
                    <span className="text-sm text-white/40">(30% of price)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 md:pl-8 md:border-l md:border-white/10">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="trust-dot mt-2" />
                    <div>
                      <p className="font-semibold text-white">They show up?</p>
                      <p className="text-white/50">Hold released. They pay €150 as normal.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="trust-dot mt-2" />
                    <div>
                      <p className="font-semibold text-white">They cancel with 48h+ notice?</p>
                      <p className="text-white/50">Hold released. No charge.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="trust-dot mt-2" />
                    <div>
                      <p className="font-semibold text-white">They no-show or cancel last minute?</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-white/50">You receive</p>
                        <motion.span className="text-xl font-bold text-gradient" key={animatedCompensation}>
                          €{animatedCompensation}
                        </motion.span>
                        <span className="text-sm text-white/40">(20% compensation)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ExampleBooking;
