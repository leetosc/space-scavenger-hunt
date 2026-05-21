import type { Variants, Transition } from "framer-motion";

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 24,
};

export const bounceTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 17,
};

export const gentleTransition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
};

// ---------------------------------------------------------------------------
// Container variants (orchestrate staggered children)
// ---------------------------------------------------------------------------

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

// ---------------------------------------------------------------------------
// Child item variants
// ---------------------------------------------------------------------------

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: bounceTransition,
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springTransition,
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springTransition,
  },
};

// ---------------------------------------------------------------------------
// AnimatePresence-friendly enter/exit variants
// ---------------------------------------------------------------------------

export const popInOut: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: bounceTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.2 },
  },
};

export const fadeInUpOut: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Special-purpose animations
// ---------------------------------------------------------------------------

export const shake: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

export const float: Variants = {
  animate: {
    y: [0, -8, 0],
    rotate: [0, 3, -3, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ---------------------------------------------------------------------------
// Interaction helpers (use directly on motion components)
// ---------------------------------------------------------------------------

export const tapScale = {
  whileTap: { scale: 0.95 },
};

export const hoverScale = {
  whileHover: { scale: 1.03 },
};

export const hoverLift = {
  whileHover: { y: -4 },
};

export const buttonInteraction = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.96 },
  transition: springTransition,
};

export const iconButtonInteraction = {
  whileHover: { scale: 1.15 },
  whileTap: { scale: 0.9 },
  transition: bounceTransition,
};
