"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-clay/25 blur-3xl" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <div className="flex flex-col justify-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pill w-fit"
          >
            <Sparkles className="h-3.5 w-3.5" /> New — AI room designer
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
            className="font-display mt-5 text-5xl leading-[1.02] md:text-7xl"
          >
            Design the room.<br />
            <span className="italic text-clay">We&apos;ll shop it for you.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="mt-6 max-w-lg text-lg text-black/70"
          >
            Set your budget and style. Roomly searches Amazon, Facebook Marketplace, Target and more, then
            builds a shoppable 2D and 3D room you can rearrange.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/design" className="btn btn-primary">
              Design my room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#how" className="btn btn-ghost">
              <Search className="h-4 w-4" /> See how it works
            </Link>
          </motion.div>
          <div className="mt-8 flex items-center gap-6 text-xs text-black/60">
            <div className="flex -space-x-2">
              {["#c98b6b", "#5a6b4a", "#0b0b0f"].map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border-2 border-cream" style={{ background: c }} />
              ))}
            </div>
            2,300+ rooms designed this week
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="card p-4">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-sand via-cream to-clay/50">
              <img
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80&auto=format&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-black/50">Modern Warm · 12&apos; x 14&apos;</div>
                <div className="font-display text-2xl">Sunset Reading Room</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-black/50">Total</div>
                <div className="font-display text-2xl">$1,940</div>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card absolute -left-6 bottom-8 hidden w-56 p-3 md:block animate-float"
          >
            <div className="text-xs text-black/50">Facebook Marketplace</div>
            <div className="font-semibold">Belden Linen Sofa</div>
            <div className="text-sm">$649 · 6.5 ft</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card absolute -right-6 top-10 hidden w-56 p-3 md:block animate-float"
          >
            <div className="text-xs text-black/50">Target</div>
            <div className="font-semibold">Brass Arc Floor Lamp</div>
            <div className="text-sm">$149 · in stock</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
