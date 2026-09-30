'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GsapTextReveal } from './gsap-reveal';
import {
  ConnectorLine,
  Container,
  CornerConnector,
  GSAPIcon,
  Heading,
  IsometricBox,
  MotionIcon,
  NextIcon,
  ReactIcon,
  SubHeading,
  TailwindIcon,
  TypeScriptIcon,
} from './vui-primitives';

/* ============================================================================
   Vengeance UI FeatureCard1: Spring-Animated Stacked Cards with Floating Badges
   ============================================================================ */
function FeatureCard1() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col justify-between p-5 md:p-8 w-full h-[380px] md:h-full overflow-visible group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex-1 w-full flex items-center justify-center perspective-[1000px]">
        {/* Background Glow on Hover */}
        <motion.div
          animate={{
            opacity: isHovered ? 0.5 : 0.15,
            scale: isHovered ? 1.15 : 0.9,
          }}
          transition={{ duration: 0.5 }}
          className="w-40 h-40 bg-gradient-to-tr from-[#3b8ef4]/15 via-white/10 to-transparent rounded-full blur-3xl absolute pointer-events-none"
        />

        <div className="relative flex items-center justify-center">
          {/* Card 3 (Back - Right) */}
          <motion.div
            animate={{
              x: isHovered ? 75 : 20,
              y: isHovered ? -10 : -8,
              rotate: isHovered ? 12 : 5,
              scale: isHovered ? 0.95 : 0.9,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="w-36 h-44 rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5 flex flex-col justify-between shadow-xl absolute z-10"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-medium text-neutral-400">Preferences</span>
              <span className="font-mono text-[10px] text-neutral-500">⚙</span>
            </div>
            <div className="space-y-2.5 my-auto">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded-lg border border-neutral-800/50"
                >
                  <div className="w-10 h-1.5 rounded-full bg-neutral-700" />
                  <motion.div
                    animate={{
                      backgroundColor:
                        isHovered && i !== 2
                          ? 'rgba(59, 142, 244, 0.25)'
                          : 'rgba(38, 38, 38, 1)',
                    }}
                    className="w-5 h-3 rounded-full p-0.5 flex items-center border border-neutral-700"
                  >
                    <motion.div
                      animate={{ x: isHovered && i !== 2 ? 8 : 0 }}
                      className={`w-2 h-2 rounded-full ${
                        isHovered && i !== 2 ? 'bg-[#3b8ef4]' : 'bg-neutral-400'
                      }`}
                    />
                  </motion.div>
                </div>
              ))}
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: isHovered ? '78%' : '32%' }}
                className="h-full bg-[#3b8ef4]"
              />
            </div>
          </motion.div>

          {/* Card 2 (Middle - Left) */}
          <motion.div
            animate={{
              x: isHovered ? -75 : -20,
              y: isHovered ? -5 : -4,
              rotate: isHovered ? -12 : -5,
              scale: isHovered ? 0.95 : 0.92,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="w-36 h-44 rounded-2xl bg-neutral-900 border border-neutral-800 p-3 flex flex-col justify-between shadow-xl absolute z-20"
          >
            <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1.5 rounded-lg border border-neutral-800">
              <span className="font-mono text-[10px] text-neutral-400">⌘</span>
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
            </div>

            <div className="space-y-1.5 my-auto">
              {[
                { label: 'Deduplicate', active: true },
                { label: 'Page On-Call', active: false },
                { label: 'Audit SHA', active: false },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  animate={{
                    backgroundColor:
                      isHovered && item.active
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0)',
                    x: isHovered && item.active ? 4 : 0,
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-lg"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      item.active ? 'bg-[#3b8ef4]' : 'bg-neutral-600'
                    }`}
                  />
                  <span
                    className={`font-mono text-[9px] ${
                      item.active ? 'text-white font-medium' : 'text-neutral-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-between items-center px-1">
              <div className="w-8 h-1 bg-neutral-800 rounded-full" />
              <span className="font-mono text-[8px] text-neutral-600">ESC</span>
            </div>
          </motion.div>

          {/* Card 1 (Front - Center) */}
          <motion.div
            animate={{
              y: isHovered ? 8 : 0,
              scale: isHovered ? 1.04 : 1,
            }}
            transition={{ type: 'spring', stiffness: 250, damping: 22 }}
            className="w-40 h-48 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-neutral-700 p-4 flex flex-col justify-between shadow-2xl relative z-30 overflow-hidden"
          >
            <motion.div
              animate={{
                opacity: isHovered ? 0.2 : 0,
                x: isHovered ? '100%' : '-100%',
              }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 pointer-events-none"
            />

            <div className="flex justify-between items-start">
              <div className="size-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                <motion.div
                  animate={{ rotate: isHovered ? 360 : 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="font-mono text-xs text-[#3b8ef4]"
                >
                  ✦
                </motion.div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 font-mono text-[9px] text-white font-medium">
                V1.1
              </span>
            </div>

            <div className="my-auto space-y-1">
              <div className="text-xs font-semibold text-white">Interactive Core</div>
              <div className="font-mono text-[9px] text-neutral-400">Hover to expand</div>
            </div>

            <div className="space-y-1.5 bg-neutral-950/80 p-2 rounded-xl border border-neutral-800/80">
              <div className="flex justify-between font-mono text-[8px] text-neutral-400">
                <span>Preview state</span>
                <motion.span className="text-[#3b8ef4] font-medium">
                  {isHovered ? 'Expanded' : 'Resting'}
                </motion.span>
              </div>
              <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: isHovered ? '87%' : '45%' }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="h-full bg-gradient-to-r from-neutral-400 to-[#3b8ef4] rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Floating Badge 1 (Top Left) */}
          <motion.div
            animate={{
              x: isHovered ? -110 : -35,
              y: isHovered ? -75 : -25,
              scale: isHovered ? 1 : 0.8,
              opacity: isHovered ? 1 : 0,
              rotate: isHovered ? -8 : 0,
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
            className="absolute z-40 bg-neutral-900 border border-neutral-700 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none"
          >
            <span className="text-[10px] text-[#3b8ef4]">✦</span>
            <span className="font-mono text-[10px] text-white font-medium whitespace-nowrap">
              5-State Machine
            </span>
          </motion.div>

          {/* Floating Badge 2 (Bottom Right) */}
          <motion.div
            animate={{
              x: isHovered ? 105 : 35,
              y: isHovered ? 75 : 25,
              scale: isHovered ? 1 : 0.8,
              opacity: isHovered ? 1 : 0,
              rotate: isHovered ? 6 : 0,
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="absolute z-40 bg-white text-black px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center gap-1 pointer-events-none"
          >
            <span className="font-mono text-[10px] font-semibold">Interactive</span>
          </motion.div>
        </div>
      </div>

      {/* Text Content */}
      <div className="relative z-10 text-left mt-4">
        <Heading as="h2" className="text-xl md:text-2xl lg:text-2xl mb-1 text-left">
          Deterministic 5-State Incident Machine
        </Heading>
        <SubHeading className="text-xs md:text-sm text-neutral-400 text-left">
          Track five clear states, with response and resolution times recorded automatically.
        </SubHeading>
      </div>
    </div>
  );
}

/* ============================================================================
   Vengeance UI FeatureCard2: Interactive IsometricBox Pyramid
   ============================================================================ */
function FeatureCard2() {
  return (
    <div className="relative flex flex-col justify-between p-5 md:p-8 w-full md:h-full overflow-visible group">
      <div className="flex-1 w-full relative flex flex-col justify-center items-center -space-y-4 sm:space-y-1 py-4">
        <div className="flex items-center gap-4 scale-[0.65] sm:scale-[0.8] lg:scale-[0.95]">
          <IsometricBox>
            <NextIcon className="w-10 h-10" />
          </IsometricBox>
          <IsometricBox>
            <MotionIcon className="w-9 h-9" />
          </IsometricBox>
          <IsometricBox>
            <GSAPIcon className="w-10 h-10 text-[#3b8ef4]" />
          </IsometricBox>
        </div>

        <div className="flex items-center gap-4 scale-[0.65] sm:scale-[0.75] lg:scale-[0.9]">
          <IsometricBox>
            <ReactIcon className="w-10 h-10" />
          </IsometricBox>
          <IsometricBox>
            <TailwindIcon className="w-10 h-10 text-sky-400" />
          </IsometricBox>
        </div>

        <div className="flex items-center gap-4 scale-[0.65] sm:scale-[0.7] lg:scale-[0.85]">
          <IsometricBox>
            <TypeScriptIcon className="w-9 h-9" />
          </IsometricBox>
        </div>
      </div>

      <div className="text-left">
        <Heading as="h2" className="text-xl md:text-2xl lg:text-2xl mb-1 text-left">
          Built for Modern Self-Hosted Stacks
        </Heading>
        <SubHeading className="text-xs md:text-sm text-neutral-400 text-left">
          Next.js, PostgreSQL, and TypeScript. No external SaaS runtime.
        </SubHeading>
      </div>
    </div>
  );
}

/* ============================================================================
   FeatureCard3: Connected Security & Responder Network with Animated Connectors
   ============================================================================ */
function ResponderNode({
  role,
  tag,
  icon,
  delay = 0,
}: {
  role: string;
  tag: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="relative group"
    >
      <div className="relative size-12 sm:size-16 rounded-xl bg-zinc-900 border border-neutral-800 p-1.5 flex flex-col items-center justify-center shadow-md group-hover:border-blue-500/50 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all duration-300">
        <div className="text-zinc-400 group-hover:text-[#3b8ef4] transition-colors">
          {icon}
        </div>
        <span className="font-mono text-[8px] sm:text-[9px] font-semibold text-zinc-300 tracking-wider mt-1 uppercase text-center leading-tight">
          {tag}
        </span>
      </div>
    </motion.div>
  );
}

function FeatureCard3() {
  return (
    <div className="relative flex flex-col justify-between p-5 md:p-8 w-full md:h-full overflow-visible">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 py-6 w-full max-w-lg mx-auto">
        {/* Top Row: 3 On-Call Responder Nodes */}
        <div className="relative flex items-center justify-between w-full px-2 sm:px-4">
          <ResponderNode
            role="Incident Commander"
            tag="CMD"
            icon={
              <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            }
            delay={0.1}
          />
          <ConnectorLine className="flex-1" delay={0.2} />
          <ResponderNode
            role="Database Lead"
            tag="DB"
            icon={
              <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            }
            delay={0.2}
          />
          <ConnectorLine className="flex-1" delay={0.4} reverse />
          <ResponderNode
            role="Comms Lead"
            tag="COMMS"
            icon={
              <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                <circle cx="12" cy="12" r="2" />
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
              </svg>
            }
            delay={0.3}
          />
        </div>

        {/* Bottom Row: 2 Nodes + Center ARCH Dragon Hub */}
        <div className="relative flex items-center justify-center w-full px-2 sm:px-6">
          <div className="relative -top-8 sm:-top-12">
            <ResponderNode
              role="Security Auditor"
              tag="SEC"
              icon={
                <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              delay={0.4}
            />
          </div>
          <div className="flex-1 h-8 sm:h-12 flex items-center">
            <CornerConnector corner="bottom-left" className="w-full h-full" delay={0.5} radius={20} />
          </div>
          <div className="relative z-10">
            <div className="relative size-16 sm:size-20 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center shadow-lg group-hover:border-blue-500/40 transition-colors">
              <img
                src="/dragon-mark.webp"
                alt="ARCH Dragon"
                className="size-6 object-contain drop-shadow-[0_0_8px_rgba(59,142,244,0.32)]"
              />
              <span className="font-orbitron text-xs sm:text-sm font-extrabold text-white mt-0.5">
                ARCH<span className="text-[#3b8ef4]">.</span>
              </span>
              <span className="font-mono text-[7px] uppercase tracking-widest text-zinc-500">
                SHA-256
              </span>
            </div>
          </div>
          <div className="flex-1 h-8 sm:h-12 flex items-center">
            <CornerConnector
              corner="bottom-right"
              className="w-full h-full"
              delay={0.6}
              radius={20}
            />
          </div>
          <div className="relative -top-8 sm:-top-12">
            <ResponderNode
              role="SRE On-Call"
              tag="SRE"
              icon={
                <svg className="size-4 sm:size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              delay={0.5}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 text-left">
        <Heading as="h2" className="text-xl md:text-2xl lg:text-2xl mb-1 text-left">
          Append-Only Audit &amp; RBAC Governance
        </Heading>
        <SubHeading className="text-xs md:text-sm text-neutral-400 text-left">
          Actions and role changes are recorded in a signed audit log with role-based access.
        </SubHeading>
      </div>
    </div>
  );
}

/* ============================================================================
   Vengeance UI FeatureCard4: Interactive Wireframe-to-Live Status Scanner
   ============================================================================ */
function MiniStatusPage({ mode }: { mode: 'wireframe' | 'live' }) {
  const isLive = mode === 'live';

  return (
    <div
      className={`w-full h-full p-3 flex flex-col justify-between select-none ${
        isLive ? 'bg-neutral-950' : 'bg-neutral-900/90'
      }`}
    >
      {isLive && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-[#3b8ef4]/10 rounded-full blur-xl pointer-events-none" />
      )}

      {/* Mini Navbar */}
      <div
        className={`flex items-center justify-between border-b pb-2 z-10 ${
          isLive ? 'border-neutral-800/80' : 'border-neutral-800 border-dashed'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <div className="size-3.5 rounded bg-[#3b8ef4] flex items-center justify-center">
              <span className="text-[7px] font-bold text-black">✓</span>
            </div>
          ) : (
            <div className="size-3.5 rounded border border-neutral-700 border-dashed bg-neutral-800/50" />
          )}
          <div
            className={`w-10 h-1.5 rounded-full ${
              isLive ? 'bg-neutral-200' : 'bg-neutral-700'
            }`}
          />
        </div>
        <div
          className={`w-8 h-3 rounded-full ${
            isLive
              ? 'bg-ok-400/20 border border-ok-400/50'
              : 'border border-neutral-700 border-dashed'
          }`}
        />
      </div>

      {/* Mini Hero Content */}
      <div className="my-auto flex flex-col items-center text-center space-y-2 z-10 py-1">
        <div
          className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isLive
              ? 'bg-neutral-900 border border-neutral-700'
              : 'border border-neutral-700 border-dashed bg-neutral-800/30'
          }`}
        >
          {isLive && <span className="size-1.5 rounded-full bg-ok-400" />}
          <div
            className={`w-12 h-1 rounded-full ${
              isLive ? 'bg-neutral-300' : 'bg-neutral-700'
            }`}
          />
        </div>

        <div className="space-y-1 flex flex-col items-center w-full">
          <div
            className={`w-3/4 h-2.5 rounded-full ${
              isLive
                ? 'bg-gradient-to-r from-white via-neutral-200 to-neutral-400'
                : 'border border-neutral-700 border-dashed bg-neutral-800/50'
            }`}
          />
          <div
            className={`w-1/2 h-2.5 rounded-full ${
              isLive
                ? 'bg-gradient-to-r from-neutral-200 to-neutral-500'
                : 'border border-neutral-700 border-dashed bg-neutral-800/50'
            }`}
          />
        </div>

        {/* 90-Day Uptime Bars */}
        <div className="flex gap-0.5 pt-1">
          {Array.from({ length: 18 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-4 rounded-[1px] ${
                isLive
                  ? idx === 12
                    ? 'bg-[#3b8ef4]'
                    : 'bg-ok-400'
                  : 'bg-neutral-800 border border-neutral-700/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Mini Feature Grid */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-800/50 z-10">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-9 rounded-lg p-1.5 flex flex-col justify-between ${
              isLive
                ? 'bg-neutral-900 border border-neutral-800'
                : 'border border-neutral-700/70 border-dashed bg-neutral-800/20'
            }`}
          >
            <div
              className={`size-2 rounded-sm ${
                isLive ? 'bg-[#3b8ef4]/80' : 'bg-neutral-700'
              }`}
            />
            <div
              className={`w-full h-1 rounded-full ${
                isLive ? 'bg-neutral-400' : 'bg-neutral-700'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard4() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col justify-between p-5 md:p-8 w-full h-[380px] md:h-full overflow-visible group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex-1 w-full flex items-center justify-center">
        <motion.div
          animate={{
            opacity: isHovered ? 0.45 : 0.1,
            scale: isHovered ? 1.05 : 0.9,
          }}
          transition={{ duration: 0.5 }}
          className="w-48 h-36 bg-gradient-to-tr from-[#3b8ef4]/15 via-neutral-500/10 to-transparent rounded-full blur-2xl absolute pointer-events-none"
        />

        <div className="relative w-64 h-48 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Browser Top Bar */}
          <div className="h-6 bg-neutral-950 border-b border-neutral-800 flex items-center px-2.5 gap-1.5 z-30">
            <div className="size-2 rounded-full bg-neutral-700 group-hover:bg-red-500/80 transition-colors" />
            <div className="size-2 rounded-full bg-neutral-700 group-hover:bg-blue-400/80 transition-colors" />
            <div className="size-2 rounded-full bg-neutral-700 group-hover:bg-green-500/80 transition-colors" />
            <div className="ml-2 flex-1 h-3 bg-neutral-900 rounded-sm border border-neutral-800 flex items-center justify-center">
              <span className="font-mono text-[7px] text-neutral-500">
                status.arch.internal/arch
              </span>
            </div>
          </div>

          <div className="relative flex-1 w-full overflow-hidden">
            {/* Layer 1: Wireframe */}
            <div className="absolute inset-0">
              <MiniStatusPage mode="wireframe" />
            </div>

            {/* Layer 2: Live Status Page Revealed by Scanner */}
            <motion.div
              initial={{ clipPath: 'inset(0 0 100% 0)' }}
              animate={{
                clipPath: isHovered ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
              }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-10"
            >
              <MiniStatusPage mode="live" />
            </motion.div>

            {/* Layer 3: Glowing #3b8ef4 Scanner Line */}
            <motion.div
              initial={{ top: '0%', opacity: 0 }}
              animate={{
                top: isHovered ? '100%' : '0%',
                opacity: isHovered ? [0, 1, 1, 0] : 0,
              }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3b8ef4] to-transparent shadow-[0_0_12px_2px_rgba(59,142,244,0.7)] z-20 pointer-events-none"
            />
          </div>
        </div>

        {/* Floating Speed Badge */}
        <motion.div
          animate={{
            y: isHovered ? -85 : -70,
            x: isHovered ? 100 : 80,
            scale: isHovered ? 1 : 0.8,
            opacity: isHovered ? 1 : 0,
            rotate: isHovered ? 8 : 0,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="absolute z-30 bg-[#3b8ef4] text-white px-2.5 py-1 rounded-full shadow-[0_0_20px_rgba(59,142,244,0.3)] flex items-center gap-1 pointer-events-none"
        >
          <span className="text-[10px]">⚡</span>
          <span className="font-mono text-[10px] font-bold">90d Ledger</span>
        </motion.div>
      </div>

      <div className="relative z-10 text-left mt-4">
        <Heading as="h2" className="text-xl md:text-2xl lg:text-2xl mb-1 text-left">
          Built-In Public Status Pages
        </Heading>
        <SubHeading className="text-xs md:text-sm text-neutral-400 text-left">
          Publish 90-day uptime bars and incident advisories to /status/[slug] directly from the war room — no third-party status SaaS needed.
        </SubHeading>
      </div>
    </div>
  );
}

export function Platform() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.vui-feature-cell',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="relative border-b border-[#222] bg-[#050608] overflow-hidden"
    >
      <Container>
        <div className="flex flex-col items-center justify-center md:border-x border-[#222]">
          {/* Section Header */}
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <GsapTextReveal as="h2" className="font-orbitron font-extrabold text-2xl sm:text-3xl lg:text-4xl text-center text-white tracking-tight">
              Incident Response, Built for Production
            </GsapTextReveal>
            <p className="max-w-xl font-mono text-xs sm:text-sm text-zinc-400 text-center">
              Interactive, dependable tools for high-severity incidents.
            </p>
          </div>

          {/* Row 1: FeatureCard1 + FeatureCard2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222] border-t border-[#222] w-full md:h-[30rem]">
            <div className="vui-feature-cell h-full">
              <FeatureCard1 />
            </div>
            <div className="vui-feature-cell h-full">
              <FeatureCard2 />
            </div>
          </div>

          {/* Row 2: FeatureCard3 + FeatureCard4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222] border-t border-[#222] w-full md:h-[30rem]">
            <div className="vui-feature-cell h-full">
              <FeatureCard3 />
            </div>
            <div className="vui-feature-cell h-full">
              <FeatureCard4 />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
