import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type NeronState = 'idle' | 'listening' | 'processing' | 'speaking';

const Neron: React.FC = () => {
  const [state, setState] = useState<NeronState>('idle');
  const [speakingText, setSpeakingText] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleTap = () => {
    if (state === 'idle') {
      setState('listening');
      
      // Auto-transition to processing after 3 seconds
      clearTimer();
      timerRef.current = setTimeout(() => {
        setState('processing');
        
        // Brief processing flash before speaking
        timerRef.current = setTimeout(() => {
          setState('speaking');
          
          // Auto-return to idle after 4 seconds of speaking
          timerRef.current = setTimeout(() => {
            setState('idle');
          }, 4000);
          
        }, 600);
      }, 3000);
    } else if (state === 'listening') {
      // Cancel back to idle
      clearTimer();
      setState('idle');
    }
    // If processing or speaking, do nothing on tap for this demo
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return (
    <div 
      className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden bg-background cursor-pointer selection:bg-transparent"
      onClick={handleTap}
    >
      {/* Background animated gradient */}
      <Background state={state} />

      {/* Main Orb */}
      <Orb state={state} />

      {/* Idle Text */}
      <AnimatePresence>
        {state === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute top-[60%] flex flex-col items-center pointer-events-none"
          >
            <p className="text-xl md:text-2xl font-light text-foreground/70 tracking-wide text-center">
              Je t'écoute, quand tu veux.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Widget */}
      <AnimatePresence>
        {state !== 'idle' && (
          <Widget state={state} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ==============================================
// SUBCOMPONENTS
// ==============================================

const Background: React.FC<{ state: NeronState }> = ({ state }) => {
  return (
    <motion.div 
      className="absolute inset-0 z-0 pointer-events-none"
      animate={{
        background: state === 'listening' 
          ? 'radial-gradient(circle at 50% 50%, hsl(260 60% 85%) 0%, hsl(270 30% 97%) 70%)'
          : state === 'speaking'
          ? 'radial-gradient(circle at 50% 50%, hsl(220 70% 90%) 0%, hsl(270 30% 97%) 70%)'
          : 'radial-gradient(circle at 50% 50%, hsl(30 80% 95%) 0%, hsl(270 30% 97%) 70%)'
      }}
      transition={{ duration: 2, ease: "easeInOut" }}
    />
  );
};

const Orb: React.FC<{ state: NeronState }> = ({ state }) => {
  return (
    <div className="relative z-10 flex items-center justify-center pointer-events-none w-64 h-64">
      <AnimatePresence mode="popLayout">
        {state === 'idle' && <IdleOrb key="idle" />}
        {state === 'listening' && <ListeningOrb key="listening" />}
        {state === 'processing' && <ProcessingOrb key="processing" />}
        {state === 'speaking' && <SpeakingOrb key="speaking" />}
      </AnimatePresence>
    </div>
  );
};

// ----------------------------------------------
// Orb States
// ----------------------------------------------

const IdleOrb: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="absolute w-32 h-32 rounded-full"
    >
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-full h-full rounded-full bg-gradient-to-tr from-primary/40 to-secondary/60 blur-2xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full bg-gradient-to-bl from-white/40 to-transparent blur-xl"
      />
    </motion.div>
  );
};

const ListeningOrb: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="absolute flex items-center justify-center w-full h-full"
    >
      {/* Outer ripples */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.2, 1.5, 2]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
          className="absolute w-24 h-24 rounded-full border border-primary/30"
        />
      ))}
      
      {/* Core */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1.05, 1.25, 1],
          opacity: [0.8, 1, 0.9, 1, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/80 to-[hsl(350,80%,85%)] blur-md shadow-[0_0_40px_rgba(167,139,250,0.5)]"
      />
    </motion.div>
  );
};

const ProcessingOrb: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      className="absolute w-20 h-20 rounded-full bg-white blur-sm"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-4px] rounded-full border-t-2 border-r-2 border-primary/50"
      />
    </motion.div>
  );
};

const SpeakingOrb: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 15, stiffness: 100 }}
      className="absolute flex items-center justify-center w-full h-full"
    >
      <motion.div
        animate={{
          scale: [1, 1.3, 1.1, 1.4, 1],
          opacity: [0.7, 1, 0.8, 1, 0.7],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent/90 to-primary/60 blur-lg shadow-[0_0_50px_rgba(147,197,253,0.6)]"
      />
      
      {/* Soundwave bars emanating from center */}
      <div className="absolute flex gap-1 items-center z-10">
        {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((bar, i) => (
          <motion.div
            key={i}
            animate={{
              height: [10, 10 + bar * 10, 10]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut"
            }}
            className="w-1 rounded-full bg-white/80"
          />
        ))}
      </div>
    </motion.div>
  );
};

// ----------------------------------------------
// Bottom Widget
// ----------------------------------------------

const Widget: React.FC<{ state: NeronState }> = ({ state }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute bottom-8 w-[90%] max-w-sm rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div className="px-6 py-5 min-h-[80px] flex items-center">
        <AnimatePresence mode="wait">
          {state === 'listening' && <ListeningContent key="listening" />}
          {state === 'processing' && <ProcessingContent key="processing" />}
          {state === 'speaking' && <SpeakingContent key="speaking" />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ListeningContent: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="w-full flex items-center gap-4"
    >
      <div className="flex gap-1 items-center h-6">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ height: ['20%', '80%', '20%'] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            className="w-1 rounded-full bg-primary/70"
          />
        ))}
      </div>
      <span className="text-foreground/80 font-medium tracking-wide">J'écoute...</span>
    </motion.div>
  );
};

const ProcessingContent: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full flex items-center gap-3"
    >
      <motion.div 
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-3 h-3 rounded-full bg-primary/50"
      />
      <span className="text-foreground/60 italic tracking-wide text-sm">Traitement...</span>
    </motion.div>
  );
};

const haiku = [
  "Le silence",
  "aussi",
  "est",
  "une",
  "réponse."
];

const SpeakingContent: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="w-full flex flex-col gap-2"
    >
      <span className="text-[10px] font-bold tracking-widest text-accent uppercase">
        Neron
      </span>
      <div className="text-foreground/90 font-medium leading-relaxed">
        {haiku.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.4, delay: i * 0.4 + 0.2 }}
            className="inline-block mr-1"
          >
            {word}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

export default Neron;
