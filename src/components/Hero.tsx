import { motion, useReducedMotion } from "framer-motion";
import { getYoutubeEmbedUrl, useHeroBackgroundVideo } from "@/contexts/HeroBackgroundVideoContext";

const Hero = () => {
  const reduceMotion = useReducedMotion();
  const shouldRenderVideo = true;
  const { iframeRef, onIframeLoad } = useHeroBackgroundVideo();

  return (
    <section
      id="hero"
      dir="rtl"
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden px-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-[6.75rem] sm:pt-[7.5rem] md:pt-[8.25rem] lg:pt-[9rem]"
    >
      {/* Background YouTube video */}
      <div className="absolute inset-0 z-10">
        {shouldRenderVideo ? (
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              ref={iframeRef}
              title="TRUST CFW Background Video"
              src={getYoutubeEmbedUrl()}
              loading="eager"
              className="absolute left-1/2 top-1/2 h-[100svh] w-[177.78svh] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 pointer-events-none md:inset-0 md:h-full md:w-full md:translate-x-0 md:translate-y-0 md:scale-[1.28]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={onIframeLoad}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.28),transparent_45%),radial-gradient(circle_at_bottom,hsl(var(--secondary)/0.2),transparent_45%)]" />
        )}
        {/* Dark overlays */}
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute inset-0 bg-gradient-cyber" />
      </div>

      {/* Foreground — أعلى قليلاً داخل الهيرو */}
      <motion.div className="relative z-20 container max-h-full min-h-0 w-full -translate-y-3 px-3 text-center sm:-translate-y-5 sm:px-4 md:-translate-y-7 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative isolate mx-auto mb-3 flex h-36 w-44 items-center justify-center sm:mb-4 sm:h-52 sm:w-64"
        >
          <motion.img
            src="/trustLogo.png"
            alt="TRUST CFW Logo"
            className="relative z-10 h-32 w-32 select-none object-contain sm:h-48 sm:w-48"
            loading="eager"
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: 1,
                    filter: "drop-shadow(0 0 8px hsl(var(--primary)/0.35))",
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    scale: { duration: 0.18, ease: "easeOut" },
                    filter: { duration: 0.2, ease: "easeOut" },
                  }
            }
            whileHover={
              reduceMotion
                ? undefined
                : {
                    scale: 1.24,
                    filter: "drop-shadow(0 0 16px hsl(var(--primary)/0.55))",
                    transition: { duration: 0.14, ease: "easeOut" },
                  }
            }
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-2 inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1.5 sm:mb-4 sm:px-4"
        >
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="font-latin-display text-xs tracking-[0.3em] text-success">SERVER ONLINE</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="group font-display text-[clamp(1.85rem,8vw,2.85rem)] font-black leading-none tracking-tight sm:text-5xl md:text-7xl lg:text-8xl"
        >
          <motion.span
            className="block text-foreground neon-text font-latin-display"
            whileHover={
              reduceMotion
                ? undefined
                : {
                    textShadow: [
                      "0 0 10px hsl(var(--primary)/0.55), 0 0 24px hsl(var(--primary)/0.35)",
                      "0 0 20px hsl(var(--primary)/0.95), 0 0 42px hsl(var(--primary)/0.7)",
                      "0 0 10px hsl(var(--primary)/0.55), 0 0 24px hsl(var(--primary)/0.35)",
                    ],
                  }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            TRUST
          </motion.span>
          <motion.span
            className="block text-gradient-neon mt-2 animate-flicker font-latin-display"
            whileHover={
              reduceMotion
                ? undefined
                : {
                    textShadow: [
                      "0 0 12px hsl(var(--primary)/0.45), 0 0 28px hsl(var(--primary)/0.3)",
                      "0 0 22px hsl(var(--primary)/0.9), 0 0 48px hsl(var(--primary)/0.65)",
                      "0 0 12px hsl(var(--primary)/0.45), 0 0 28px hsl(var(--primary)/0.3)",
                    ],
                  }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            CFW
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mx-auto mt-2 max-w-2xl px-1 font-body text-sm leading-snug text-muted-foreground sm:mt-4 sm:text-lg sm:leading-relaxed md:text-xl"
        >
          أهلا وسهلا بكم في TRUST CFW، حيث تبدأ رحلتكم وتصنعون قصصكم بكل حرية ضمن أجواء واقعية مليئة بالتفاعل والمتعة.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 1.05 }}
          className="mx-auto mt-4 max-w-[min(100%,52rem)] px-2 pb-2 pt-1 text-center sm:mt-6 md:mt-8"
        >
          <p className="flex flex-nowrap items-center justify-center gap-x-1.5 overflow-x-auto whitespace-nowrap px-0.5 py-0.5 font-body text-[11px] leading-snug text-foreground/85 [scrollbar-width:none] sm:gap-x-2 sm:text-xs [&::-webkit-scrollbar]:hidden">
            <span className="font-latin-display font-semibold text-foreground">© 2026 TRUST CFW</span>
            <span className="select-none text-muted-foreground/55" aria-hidden>
              ·
            </span>
            <span className="text-foreground/90">جميع الحقوق محفوظة</span>
            <span className="select-none text-muted-foreground/55" aria-hidden>
              ·
            </span>
            <span className="tracking-wide text-foreground/88">صُنع بعناية لمجتمع TRUST CFW</span>
            <span className="select-none text-muted-foreground/55" aria-hidden>
              ·
            </span>
            <span className="text-foreground/90">
              المبرمج:{" "}
              <a
                href="https://hamza-kitana.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-latin-display font-semibold text-primary underline-offset-2 transition-colors hover:text-primary/90 hover:underline"
              >
                Hamza Kitana
              </a>
            </span>
          </p>
        </motion.div>

      </motion.div>
    </section>
  );
};

export default Hero;
