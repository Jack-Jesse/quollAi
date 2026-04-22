"use client"

import { motion } from "framer-motion"
import {
  Button,
  LiquidButton,
  MetalButton,
} from "@/components/ui/liquid-glass-button"
import { Sparkles, ArrowRight, Zap, Shield } from "lucide-react"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
}

const sectionFade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
}

export function Demo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-20">
        {/* Hero Section */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4" />
            Component Showcase
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Liquid Glass Buttons
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg">
            A collection of beautifully crafted button components with framer-motion 
            animations, metal textures, and liquid glass effects.
          </p>
        </motion.div>

        {/* Standard Buttons */}
        <motion.section variants={sectionFade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">Standard Button</h2>
          <motion.div variants={container} className="flex flex-wrap items-center gap-3">
            {(["default", "destructive", "outline", "secondary", "ghost", "link", "cool"] as const).map((v) => (
              <motion.div key={v} variants={item}>
                <Button variant={v}>
                  {v === "cool" && <Zap className="w-4 h-4" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Standard Button Sizes */}
        <motion.section variants={sectionFade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">Button Sizes</h2>
          <motion.div variants={container} className="flex flex-wrap items-end gap-3">
            {(["sm", "default", "lg"] as const).map((s) => (
              <motion.div key={s} variants={item}>
                <Button size={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Button>
              </motion.div>
            ))}
            <motion.div variants={item}>
              <Button size="icon"><ArrowRight className="w-4 h-4" /></Button>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Liquid Glass Button */}
        <motion.section variants={sectionFade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">Liquid Glass</h2>
          <motion.div
            className="relative h-[200px] w-full rounded-2xl overflow-hidden"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            >
              <LiquidButton className="text-white font-semibold text-base tracking-wide">
                Liquid Glass
              </LiquidButton>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Liquid Glass Sizes */}
        <motion.section variants={sectionFade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">Liquid Glass Sizes</h2>
          <motion.div
            className="relative h-[160px] w-full rounded-2xl overflow-hidden"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex items-end gap-4"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {(["sm", "default", "lg", "xl", "xxl"] as const).map((s) => (
                <motion.div key={s} variants={item}>
                  <LiquidButton size={s} className="text-white">
                    {s.toUpperCase()}
                  </LiquidButton>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Metal Buttons */}
        <motion.section variants={sectionFade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">Metal Buttons</h2>
          <motion.div variants={container} className="flex flex-wrap items-center gap-5">
            {(["default", "primary", "success", "error", "gold", "bronze"] as const).map(
              (v) => (
                <motion.div
                  key={v}
                  variants={item}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <MetalButton variant={v}>
                    <span className="flex items-center gap-2">
                      {v === "primary" && <Shield className="w-4 h-4" />}
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </span>
                  </MetalButton>
                </motion.div>
              ),
            )}
          </motion.div>
        </motion.section>

        {/* Interactive Playground */}
        <motion.section variants={sectionFade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">Interactive Playground</h2>
          <motion.div
            className="relative h-[280px] w-full rounded-2xl overflow-hidden"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1200&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex items-center justify-center gap-6 z-10">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
              >
                <LiquidButton className="text-white font-semibold">
                  Get Started <ArrowRight className="w-5 h-5" />
                </LiquidButton>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
              >
                <MetalButton variant="gold">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Upgrade Pro
                  </span>
                </MetalButton>
              </motion.div>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </div>
  )
}
