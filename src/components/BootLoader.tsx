import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

type BootLoaderProps = {
  onComplete: () => void;
};

const BootLoader = ({ onComplete }: BootLoaderProps) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const finishTimer = window.setTimeout(() => {
      onComplete();
    }, reduceMotion ? 500 : 1800);

    return () => {
      window.clearTimeout(finishTimer);
    };
  }, [onComplete, reduceMotion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-cyber" />
      <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-primary/30 blur-[110px]" />
      <div className="absolute -bottom-24 -right-24 h-[380px] w-[380px] rounded-full bg-secondary/30 blur-[110px]" />
      <div className="absolute inset-0 cyber-grid opacity-30" />

      <div className="relative z-10 text-center px-6 pointer-events-none">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto h-36 w-36 flex items-center justify-center"
        >
          <img
            src="/trustLogo.png"
            alt="TRUST CFW Logo"
            className="h-32 w-32 object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.95)]"
            loading="eager"
          />
        </motion.div>

        <motion.h1
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 font-latin-display text-4xl md:text-5xl font-bold tracking-[0.18em] text-foreground"
        >
          TRUST CFW
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-3 text-sm md:text-base text-muted-foreground"
        >
          تحميل العالم... يرجى الانتظار
        </motion.p>

        {!reduceMotion ? (
          <motion.div className="mt-8 w-[260px] md:w-[320px] h-1.5 rounded-full bg-foreground/10 overflow-hidden mx-auto">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="h-full w-1/2 bg-gradient-neon"
            />
          </motion.div>
        ) : (
          <div className="mt-8 w-[260px] md:w-[320px] h-1.5 rounded-full bg-foreground/10 overflow-hidden mx-auto">
            <div className="h-full w-1/2 bg-gradient-neon" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BootLoader;
