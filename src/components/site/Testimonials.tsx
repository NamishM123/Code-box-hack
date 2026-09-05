"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const QUOTES = [
  {
    name: "Renter, first apartment",
    handle: "Queens, NY",
    quote: "I measured nothing. Six photos, and the sofa it picked cleared my stairwell by an inch and a half.",
    initials: "RA",
    color: "#FF7A3D"
  },
  {
    name: "Two roommates, one budget",
    handle: "Chicago, IL",
    quote: "It found the same coffee table on Marketplace for a third of Target's price, four miles away.",
    initials: "TR",
    color: "#4B76FF"
  },
  {
    name: "Home stager",
    handle: "Austin, TX",
    quote: "The layouts explain themselves. I send clients the reasoning and they stop second-guessing the plan.",
    initials: "HS",
    color: "#6FA97F"
  }
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1320px] px-5 py-24 md:py-32">
      <div className="grid gap-3 md:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="panel relative min-h-[420px] overflow-hidden"
        >
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1000&q=85&auto=format&fit=crop"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          <div className="relative flex h-full flex-col justify-between p-7 md:p-9">
            <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] text-white/85 backdrop-blur">
              Room 041 · $2,140 · 7 pieces
            </span>
            <div>
              <div className="display-lg text-[clamp(30px,3.6vw,46px)] text-white">
                One afternoon.<br />One room.<br />Four shops.
              </div>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-white/70">
                A living room measured, laid out, priced, and ordered between lunch and dinner. Every piece
                checked against the wall it had to sit on.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-3">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              className="card card-lift flex-1 p-6"
            >
              <blockquote className="serif-quote text-[16px] leading-relaxed tracking-[-0.01em]">
                {q.quote}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: q.color }}
                >
                  {q.initials}
                </span>
                <span>
                  <span className="block text-[13px] font-medium">{q.name}</span>
                  <span className="block text-[11px] text-ash">{q.handle}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}

          <Link
            href="/capture"
            className="card card-lift group flex items-center justify-between bg-ink p-6 text-paper"
          >
            <span className="text-[17px] font-semibold tracking-[-0.02em]">Map your first room</span>
            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
