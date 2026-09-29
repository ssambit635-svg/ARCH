'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/* ============================================================================
   Vengeance UI Container, Heading & SubHeading
   ============================================================================ */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-[1440px] md:px-4 xl:px-20', className)}>
      {children}
    </div>
  );
}

export function Heading({
  children,
  className,
  as: Component = 'h2',
  variant = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2';
  variant?: 'default' | 'big';
}) {
  const variants = {
    default: 'text-2xl md:text-4xl lg:text-5xl',
    big: 'text-3xl md:text-4xl lg:text-6xl',
  };
  return (
    <Component
      className={cn(
        'font-orbitron font-bold leading-tight tracking-tight text-white',
        variants[variant],
        className
      )}
    >
      {children}
    </Component>
  );
}

export function SubHeading({
  children,
  className,
  as: Component = 'h3',
  variant = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3' | 'p';
  variant?: 'default' | 'big';
}) {
  const variants = {
    default: 'text-sm md:text-base max-w-2xl',
    big: 'text-base md:text-base lg:text-lg max-w-2xl',
  };
  return (
    <Component className={cn('font-mono text-[#8e929f]', variants[variant], className)}>
      {children}
    </Component>
  );
}

/* ============================================================================
   Vengeance UI BorderBeam
   ============================================================================ */
export function BorderBeam({
  className,
  size = 68,
  duration = 4.2,
  borderWidth = 1.5,
  colorFrom = '#f4f4f5',
  colorTo = '#71717a',
  delay = 0,
}: {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--border-width': borderWidth,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]',
        '![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
        'after:animate-border-beam after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]',
        className
      )}
    />
  );
}

/* ============================================================================
   Vengeance UI Brand & Framework Icons
   ============================================================================ */
export function NextIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16" className={cn('h-full w-full', className)}>
      <circle cx="8" cy="8" r="7.375" fill="black" stroke="#fff" strokeOpacity="0.2" strokeWidth="1" />
      <path d="M10.63 11V5" stroke="white" strokeOpacity="0.75" strokeWidth="1.25" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.995 5.00087V5H4.745V11H5.995V6.96798L12.3615 14.7076C12.712 14.4793 13.0434 14.2242 13.353 13.9453L5.99527 5.00065L5.995 5.00087Z"
        fill="white"
      />
    </svg>
  );
}

export function TailwindIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className={className} {...props}>
      <path
        d="M8 0C5.86662 0 4.53375 1.06625 4 3.19963C4.79975 2.13325 5.73337 1.73338 6.79975 2C7.40862 2.15175 7.84375 2.59325 8.32563 3.0825C9.10988 3.87838 10.0176 4.79975 12 4.79975C14.1332 4.79975 15.4663 3.73337 16 1.5995C15.2 2.66642 14.2667 3.0665 13.2001 2.79975C12.5914 2.64788 12.1568 2.2065 11.6743 1.71725C10.8905 0.921375 9.983 0 8 0ZM4 4.79975C1.86675 4.79975 0.53375 5.86613 0 8C0.799917 6.93308 1.73317 6.533 2.79975 6.79975C3.40863 6.95163 3.84375 7.393 4.32562 7.88225C5.10987 8.67813 6.01762 9.5995 8 9.5995C10.1332 9.5995 11.4663 8.53325 12 6.39988C11.2 7.46629 10.2667 7.86617 9.20013 7.5995C8.59138 7.44775 8.15675 7.00625 7.67425 6.517C6.8905 5.72113 5.983 4.79975 4 4.79975Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TypeScriptIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 128 128" className={cn('rounded-sm', className)}>
      <path fill="#fff" d="M22.67 47h99.67v73.67H22.67z" />
      <path
        fill="#007acc"
        d="M1.5 63.91v62.5h125v-125H1.5zm100.73-5a15.56 15.56 0 017.82 4.5 20.58 20.58 0 013 4c0 .16-5.4 3.81-8.69 5.85-.12.08-.6-.44-1.13-1.23a7.09 7.09 0 00-5.87-3.53c-3.79-.26-6.23 1.73-6.21 5a4.58 4.58 0 00.54 2.34c.83 1.73 2.38 2.76 7.24 4.86 8.95 3.85 12.78 6.39 15.16 10 2.66 4 3.25 10.46 1.45 15.24-2 5.2-6.9 8.73-13.83 9.9a38.32 38.32 0 01-9.52-.1 23 23 0 01-12.72-6.63c-1.15-1.27-3.39-4.58-3.25-4.82a9.34 9.34 0 011.15-.73L82 101l3.59-2.08.75 1.11a16.78 16.78 0 004.74 4.54c4 2.1 9.46 1.81 12.16-.62a5.43 5.43 0 00.69-6.92c-1-1.39-3-2.56-8.59-5-6.45-2.78-9.23-4.5-11.77-7.24a16.48 16.48 0 01-3.43-6.25 25 25 0 01-.22-8c1.33-6.23 6-10.58 12.82-11.87a31.66 31.66 0 019.49.26zm-29.34 5.24v5.12H56.66v46.23H45.15V69.26H28.88v-5a49.19 49.19 0 01.12-5.17C29.08 59 39 59 51 59h21.83z"
      />
    </svg>
  );
}

export function MotionIcon({ className }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 34 12" className={cn('h-full w-full bg-[#FEF62A] p-0.5 rounded-sm', className)}>
      <path
        d="M 12.838 0 L 6.12 11.989 L 0 11.989 L 5.245 2.628 C 6.059 1.176 8.088 0 9.778 0 Z M 27.846 2.997 C 27.846 1.342 29.216 0 30.906 0 C 32.596 0 33.966 1.342 33.966 2.997 C 33.966 4.653 32.596 5.995 30.906 5.995 C 29.216 5.995 27.846 4.653 27.846 2.997 Z M 13.985 0 L 20.105 0 L 13.387 11.989 L 7.267 11.989 Z M 21.214 0 L 27.334 0 L 22.088 9.362 C 21.275 10.813 19.246 11.989 17.556 11.989 L 14.496 11.989 Z"
        fill="#0b1012"
      />
    </svg>
  );
}

export function GSAPIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 9" fill="none" className={cn('h-full w-full p-1 rounded-sm', className)} {...props}>
      <path
        d="M9.82982 0C10.6468 0.005 11.2668 0.237999 11.6718 0.691999C12.0548 1.123 12.2388 1.746 12.2188 2.542L12.2048 2.603C12.1921 2.63156 12.1713 2.65578 12.145 2.67266C12.1187 2.68954 12.0881 2.69835 12.0568 2.698H10.3978C10.3458 2.69776 10.2959 2.67726 10.2588 2.64085C10.2216 2.60445 10.2001 2.555 10.1988 2.503C10.2002 2.08033 10.0702 1.84367 9.80882 1.793L9.68882 1.782C9.34682 1.782 9.12482 1.993 9.11882 2.361C9.11182 2.771 9.34382 3.144 10.0038 3.784C10.8718 4.6 11.2208 5.323 11.2038 6.277C11.1768 7.821 10.1268 8.82 8.53082 8.82C7.71582 8.82 7.09282 8.601 6.67782 8.171C6.25782 7.734 6.06582 7.093 6.10582 6.265C6.1077 6.22288 6.12517 6.18297 6.15482 6.153C6.18485 6.12395 6.22505 6.1078 6.26682 6.108H7.98282C8.00665 6.1095 8.03002 6.11526 8.05182 6.125C8.09124 6.14556 8.12103 6.18074 8.13482 6.223C8.14016 6.243 8.14082 6.263 8.13682 6.283C8.11782 6.581 8.17082 6.804 8.28782 6.928C8.32789 6.96937 8.37643 7.0016 8.4301 7.02248C8.48378 7.04336 8.54133 7.05241 8.59882 7.049C8.91582 7.049 9.10182 6.824 9.10882 6.434C9.11482 6.097 9.00682 5.8 8.42682 5.202C7.67582 4.468 7.00282 3.71 7.02382 2.518C7.02639 2.18433 7.09626 1.85462 7.22925 1.54859C7.36225 1.24257 7.55563 0.966526 7.79782 0.737C8.31182 0.255 9.01382 0 9.82982 0ZM4.04682 0.0279999C4.79382 0.0219999 5.38082 0.252 5.78882 0.713C6.22082 1.2 6.43982 1.934 6.44082 2.895C6.44029 2.93726 6.42307 2.9776 6.3929 3.0072C6.36274 3.0368 6.32209 3.05327 6.27982 3.053H4.47882C4.44739 3.05156 4.41754 3.03877 4.39482 3.017C4.37319 2.99387 4.36075 2.96365 4.35982 2.932C4.34582 2.309 4.17182 1.986 3.82782 1.948L3.75682 1.944C3.06682 1.945 2.65982 2.882 2.44382 3.402C2.13841 4.12956 1.99312 4.91432 2.01782 5.703C2.03282 6.069 2.09182 6.583 2.43782 6.796C2.74582 6.985 3.18482 6.86 3.45082 6.65C3.71582 6.441 3.92982 6.079 4.01982 5.749C4.03315 5.70233 4.03349 5.66967 4.02082 5.651C4.01415 5.64367 4.00349 5.63867 3.98882 5.636L3.48482 5.632C3.46037 5.63129 3.43632 5.6256 3.41414 5.61529C3.39196 5.60497 3.37212 5.59024 3.35582 5.572C3.3429 5.55805 3.33423 5.5407 3.33082 5.522C3.32549 5.50371 3.32549 5.48429 3.33082 5.466L3.64682 4.092C3.65609 4.05626 3.67612 4.02423 3.70421 4.00026C3.73229 3.97629 3.76707 3.96154 3.80382 3.958V3.955H6.83882L6.85982 3.956C6.93882 3.966 6.99482 4.04 6.99382 4.12V4.124L6.67782 5.495C6.66082 5.573 6.58282 5.63 6.49382 5.63H6.11282C6.09906 5.63009 6.08569 5.63461 6.0747 5.6429C6.06372 5.65119 6.05569 5.66279 6.05182 5.676C5.69982 6.87 5.22282 7.692 4.59382 8.185C4.05782 8.605 3.39882 8.801 2.51682 8.801C1.72482 8.801 1.19082 8.546 0.737822 8.043C0.139822 7.377 -0.107178 6.289 0.0428217 4.976C0.312822 2.513 1.58882 0.0279999 4.04682 0.0279999ZM21.0158 0.16C23.0258 0.16 24.0298 1.072 23.9988 2.871C23.9618 4.979 22.6778 6.529 20.7448 6.887C20.4695 6.93567 20.1918 6.95833 19.9118 6.955L18.9778 6.951C18.9628 6.95148 18.9484 6.95761 18.9377 6.96817C18.9269 6.97874 18.9206 6.99295 18.9198 7.008C18.9198 7.018 18.9225 7.02767 18.9278 7.037C18.934 7.04508 18.9415 7.05216 18.9498 7.058L19.7438 7.472C19.8092 7.50733 19.8345 7.562 19.8198 7.636L19.6128 8.569C19.5958 8.647 19.5328 8.692 19.4418 8.692H17.7388C17.7144 8.69137 17.6904 8.68629 17.6678 8.677C17.646 8.66601 17.6263 8.65109 17.6098 8.633C17.5974 8.61844 17.5887 8.60114 17.5844 8.58253C17.58 8.56392 17.5802 8.54454 17.5848 8.526L19.4808 0.285C19.4998 0.199 19.5808 0.161 19.6528 0.161L21.0158 0.16ZM17.2728 0.172C17.2914 0.180339 17.3086 0.191467 17.3238 0.205C17.3378 0.220456 17.3493 0.238001 17.3578 0.257C17.3644 0.276001 17.3681 0.295892 17.3688 0.316L17.3578 8.529C17.3609 8.54833 17.3599 8.56809 17.3548 8.587C17.349 8.60729 17.3388 8.62602 17.3247 8.64177C17.3107 8.65753 17.2933 8.66991 17.2738 8.678C17.2538 8.68732 17.2319 8.69177 17.2098 8.691H15.3968C15.3554 8.69094 15.3156 8.67481 15.2858 8.646C15.2723 8.63078 15.2612 8.61358 15.2528 8.595C15.2458 8.57573 15.2417 8.5555 15.2408 8.535L15.2798 7.738C15.2818 7.651 15.2798 7.627 15.2288 7.621L15.1608 7.619H13.4468C13.3228 7.619 13.3138 7.63 13.2698 7.744L12.9138 8.601C12.8818 8.661 12.8178 8.691 12.7218 8.691H10.9268C10.8178 8.691 10.7398 8.583 10.7808 8.482L14.4988 0.283C14.5238 0.234 14.5618 0.16 14.6478 0.16H17.2138C17.2338 0.16 17.2535 0.164 17.2728 0.172ZM15.4998 2.395C15.4918 2.363 15.4658 2.366 15.4448 2.408C15.4299 2.4383 15.4166 2.46934 15.4048 2.501L14.1208 5.684L14.1048 5.732C14.1035 5.73867 14.1032 5.745 14.1038 5.751L14.1108 5.768C14.1148 5.77316 14.1199 5.77728 14.1258 5.78C14.131 5.78327 14.1368 5.78532 14.1428 5.786L15.2148 5.8C15.3338 5.79 15.3398 5.784 15.3518 5.663C15.3538 5.62 15.5058 2.432 15.4998 2.395ZM20.1118 1.992C20.0968 1.99247 20.0826 1.99853 20.0718 2.009C20.061 2.01958 20.0546 2.03387 20.0538 2.049C20.054 2.05937 20.0568 2.06952 20.0621 2.07845C20.0674 2.08739 20.0748 2.09482 20.0838 2.1L20.9258 2.545C20.9678 2.568 20.9688 2.608 20.9548 2.677C20.9478 2.708 20.4148 5.052 20.4158 5.054C20.4188 5.057 20.4348 5.065 20.5148 5.065H20.5508C21.4458 5.029 21.9338 3.971 21.9518 2.944C21.9608 2.389 21.7718 2.048 21.4288 1.998L21.3578 1.992H20.1118Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ReactIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className}>
      <g fill="#61DAFB">
        <circle cx="64" cy="64" r="11.4" />
        <path d="M107.3 45.2c-2.2-.8-4.5-1.6-6.9-2.3.6-2.4 1.1-4.8 1.5-7.1 2.1-13.2-.2-22.5-6.6-26.1-1.9-1.1-4-1.6-6.4-1.6-7 0-15.9 5.2-24.9 13.9-9-8.7-17.9-13.9-24.9-13.9-2.4 0-4.5.5-6.4 1.6-6.4 3.7-8.7 13-6.6 26.1.4 2.3.9 4.7 1.5 7.1-2.4.7-4.7 1.4-6.9 2.3C8.2 50 1.4 56.6 1.4 64s6.9 14 19.3 18.8c2.2.8 4.5 1.6 6.9 2.3-.6 2.4-1.1 4.8-1.5 7.1-2.1 13.2.2 22.5 6.6 26.1 1.9 1.1 4 1.6 6.4 1.6 7.1 0 16-5.2 24.9-13.9 9 8.7 17.9 13.9 24.9 13.9 2.4 0 4.5-.5 6.4-1.6 6.4-3.7 8.7-13 6.6-26.1-.4-2.3-.9-4.7-1.5-7.1 2.4-.7 4.7-1.4 6.9-2.3 12.5-4.8 19.3-11.4 19.3-18.8s-6.8-14-19.3-18.8z" />
      </g>
    </svg>
  );
}

/* ============================================================================
   Exact Vengeance UI IsometricStack (from /src/components/landing/ui/isometric-stack.tsx)
   ============================================================================ */
export function IsometricStack({
  children,
  className = 'md:w-20 w-16 h-auto cursor-pointer',
  backFillClass = 'fill-[#141519]',
  backStrokeClass = 'stroke-neutral-600',
  frontRectClass = 'fill-[#08090c] stroke-neutral-600',
  linesClass = 'stroke-neutral-600',
  contentWrapperClass = 'text-white text-[8px]',
}: {
  children?: React.ReactNode;
  className?: string;
  backFillClass?: string;
  backStrokeClass?: string;
  frontRectClass?: string;
  linesClass?: string;
  contentWrapperClass?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 35"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`iso-stack ${className}`}
    >
      <g className="iso-stack-back">
        <path
          d="M38.6162 5.29118C38.8616 5.80954 39 6.38856 39 7.00016V30.0002C39 32.2093 37.2091 34.0001 35 34.0001H7C6.21257 34.0001 5.47933 33.771 4.86035 33.3781C2.68828 31.9994 1.5 29 1.5 29L3 29.8595V7.00016C3 4.79102 4.79086 3.00016 7 3.00016H34.6631L34.5 1.5C34.5 1.5 37.7407 3.44195 38.6162 5.29118Z"
          className={`transition-colors duration-300 ${backFillClass} ${backStrokeClass}`}
        />
        <path
          d="M35.7144 25.5003L38.9286 28M35.7144 23.2188L39 26"
          className={`transition-colors duration-300 ${linesClass}`}
        />
      </g>
      <g className="iso-stack-front">
        <rect
          x="0.5"
          y="0.5"
          width="35"
          height="30"
          rx="3.5"
          className={`transition-colors duration-300 ${frontRectClass}`}
        />
        <foreignObject x="0.5" y="0.5" width="35" height="30">
          <div className={`flex items-center justify-center w-full h-full px-1 overflow-hidden ${contentWrapperClass}`}>
            <div className="flex flex-col items-center justify-center gap-0.5 w-full truncate line-clamp-1 select-none text-center">
              {children}
            </div>
          </div>
        </foreignObject>
      </g>
      <style>{`
        .iso-stack { cursor: pointer; }
        .iso-stack-back { transition: opacity 0.1s ease; }
        .iso-stack-front { transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .iso-stack:hover .iso-stack-back,
        .iso-stack:active .iso-stack-back { opacity: 0; }
        .iso-stack:hover .iso-stack-front,
        .iso-stack:active .iso-stack-front { transform: translate(3.5px, 3.5px); }
      `}</style>
    </svg>
  );
}

/* ============================================================================
   Exact Vengeance UI IsometricBox (from /src/components/landing/ui/isometric-box.tsx)
   ============================================================================ */
export function IsometricBox({
  children,
  className = '',
  iconClassName = '',
  boxClassName = 'text-neutral-600',
  topFaceClassName = 'fill-neutral-900',
  gridClassName = 'text-neutral-500',
  gridOpacity = 0.16,
}: {
  children?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  boxClassName?: string;
  topFaceClassName?: string;
  gridClassName?: string;
  gridOpacity?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const bottomWallPath =
    'M134.447 55C134.447 56.5621 133.35 57.9763 131.577 59L76.1514 91C72.325 93.2091 66.1213 93.2091 62.2949 91L6.86914 59C5.09658 57.9764 4 56.5618 4 55V40C4 41.4644 4.96359 42.7991 6.54492 43.8037L6.87012 44L62.2949 76C66.1213 78.2091 72.325 78.2091 76.1514 76L131.577 44C133.35 42.9763 134.447 41.5621 134.447 40V55Z';

  return (
    <motion.div
      className={`relative w-[139px] h-[93px] group cursor-pointer ${className}`}
      initial="initial"
      whileHover="hover"
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      variants={{
        initial: { y: 0 },
        hover: { y: -10 },
      }}
    >
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        style={{
          transform: 'rotateX(60deg) rotateZ(45deg) translateZ(5px)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className={cn('flex items-center justify-center w-9 h-9', iconClassName)}>
          {children}
        </div>
      </div>

      <svg
        width="139"
        height="93"
        viewBox="0 0 139 93"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 z-10 overflow-visible"
      >
        <path
          d="M63.3294 5.24609C66.6775 3.3131 72.1057 3.3131 75.4538 5.24609L130.459 37.0032C133.089 38.522 133.089 40.9844 130.459 42.5032L76.3198 73.7603C72.4935 75.9694 66.2897 75.9694 62.4634 73.7603L7.89154 42.2532C5.50007 40.8725 5.50007 38.6339 7.89154 37.2532L63.3294 5.24609Z"
          strokeWidth="1"
          className={cn(boxClassName, topFaceClassName)}
          stroke="currentColor"
        />
        <path
          d="M75.9273 5.51893L10.0593 43.5479M82.5128 9.32107L16.6448 47.35M89.0983 13.1232L23.2302 51.1521M95.6838 16.9253L29.8157 54.9543M102.269 20.7275L36.4012 58.7564M108.855 24.5296L42.9867 62.5585M115.44 28.3317L49.5722 66.3607M122.026 32.1339L56.1577 70.1628M128.611 35.936L62.7432 73.9649M62.755 5.51969L128.61 43.541M56.1682 9.32258L122.023 47.3439M49.5814 13.1255L115.436 51.1468M42.9946 16.9284L108.85 54.9497M36.4078 20.7313L102.263 58.7526M29.821 24.5342L95.6759 62.5555M23.2342 28.337L89.0891 66.3584M16.6474 32.1399L82.5023 70.1613M10.0606 35.9428L75.9155 73.9642"
          stroke="currentColor"
          strokeOpacity={gridOpacity}
          strokeWidth="0.5"
          className={gridClassName}
        />
        <path d={bottomWallPath} stroke="currentColor" strokeWidth="1" fill="transparent" className={boxClassName} />
        <motion.path
          d={bottomWallPath}
          fill={`url(#bottom-wall-gradient-${uid})`}
          stroke="none"
          variants={{
            initial: { opacity: 0 },
            hover: { opacity: 1 },
          }}
          transition={{ duration: 0.3 }}
        />
        <defs>
          <linearGradient id={`bottom-wall-gradient-${uid}`} x1="69.2236" y1="40" x2="69.2236" y2="92.6569" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="0.53" stopColor="#FEF62A" stopOpacity="0.85" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

/* ============================================================================
   Exact Vengeance UI IsometricGrid & IsometricHeroBox (662-line SVG Stage + Cube)
   ============================================================================ */
export function IsometricGrid({
  strokeColor = '#606060',
  strokeWidth = 0.25,
  className = '',
}: {
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <div className={`absolute bottom-0 left-0 w-full overflow-visible pointer-events-none ${className}`}>
      <svg viewBox="0 0 700 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto overflow-visible">
        <g transform="translate(3, 10)">
          <path
            d="M381.224 20.0996L34.8139 220.1M415.865 40.0996L69.4549 240.1M450.506 60.0996L104.096 260.1M485.147 80.0996L138.737 280.1M519.788 100.1L173.378 300.1M554.429 120.1L208.019 320.1M589.07 140.1L242.66 340.1M623.711 160.1L277.301 360.1M658.352 180.1L311.942 380.1M311.942 20.0996L658.352 220.1M277.301 40.0996L623.711 240.1M242.66 60.0996L589.07 260.1M208.019 80.0996L554.429 280.1M173.378 100.1L519.788 300.1M138.737 120.1L485.147 320.1M104.096 140.1L450.506 340.1M69.4549 160.1L415.865 360.1M34.8139 180.1L381.224 380.1M346.583 0.0996094L0.172853 200.1L346.583 400.1L692.993 200.1L346.583 0.0996094Z"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="iso-grid-path"
          />
        </g>
      </svg>
    </div>
  );
}

function CreepyPreviewButton() {
  const eyesRef = useRef<HTMLSpanElement>(null);
  const [eyeCoords, setEyeCoords] = useState({ x: 0, y: 0 });
  const [isClicked, setIsClicked] = useState(false);

  const updateEyes = (e: React.MouseEvent | React.TouchEvent) => {
    const userEvent = 'touches' in e ? e.touches[0] : e;
    if (!userEvent || !eyesRef.current) return;
    const eyesRect = eyesRef.current.getBoundingClientRect();
    const eyesCenter = {
      x: eyesRect.left + eyesRect.width / 2,
      y: eyesRect.top + eyesRect.height / 2,
    };
    const cursor = { x: userEvent.clientX, y: userEvent.clientY };
    const dx = cursor.x - eyesCenter.x;
    const dy = cursor.y - eyesCenter.y;
    const angle = Math.atan2(-dy, dx) + Math.PI / 2;
    const visionRangeX = 180;
    const visionRangeY = 75;
    const distance = Math.hypot(dx, dy);
    const x = (Math.sin(angle) * Math.min(distance, visionRangeX)) / visionRangeX;
    const y = (Math.cos(angle) * Math.min(distance, visionRangeY)) / visionRangeY;
    setEyeCoords({ x, y });
  };

  const translateX = `${-50 + eyeCoords.x * 50}%`;
  const translateY = `${-50 + eyeCoords.y * 50}%`;

  return (
    <button
      type="button"
      onClick={() => {
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 500);
      }}
      onMouseMove={updateEyes}
      onTouchMove={updateEyes}
      className="relative min-w-[8.5em] rounded-xl bg-black cursor-pointer outline-none select-none group"
    >
      <span
        ref={eyesRef}
        className="absolute flex items-center gap-[0.375em] right-[1em] bottom-[0.5em] h-[0.75em] z-0 pointer-events-none"
      >
        <span className="relative w-[0.75em] bg-white rounded-full overflow-hidden h-[0.75em]">
          <span
            className="absolute top-1/2 left-1/2 w-[0.375em] h-[0.375em] bg-black rounded-full"
            style={{ transform: `translate(${translateX}, ${translateY})` }}
          />
        </span>
        <span className="relative w-[0.75em] bg-white rounded-full overflow-hidden h-[0.75em]">
          <span
            className="absolute top-1/2 left-1/2 w-[0.375em] h-[0.375em] bg-black rounded-full"
            style={{ transform: `translate(${translateX}, ${translateY})` }}
          />
        </span>
      </span>
      <span
        className={cn(
          'block relative inset-0 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-[11px] px-3.5 py-2',
          'shadow-[inset_0_0_0_2px_rgba(0,0,0,1)] transition-transform duration-300 ease-in-out origin-[1.25em_50%] text-center',
          'group-hover:rotate-[-12deg]',
          isClicked && 'rotate-[-38deg] translate-y-1'
        )}
      >
        Click Me
      </span>
    </button>
  );
}

const HERO_FACE_COMPONENTS = [
  <div key="c0" className="w-full h-full flex items-center justify-center p-4">
    <button
      type="button"
      className="relative overflow-hidden rounded-md border border-zinc-700 bg-neutral-950 px-4 py-2 text-[11px] font-semibold text-zinc-100 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
    >
      <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#FEF62A] to-transparent" />
      <span>Hover</span>
    </button>
  </div>,
  <div key="c1" className="w-full h-full flex items-center justify-center p-4">
    <CreepyPreviewButton />
  </div>,
  <div key="c2" className="w-full h-full flex items-center justify-center p-4">
    <span className="font-orbitron text-lg font-bold text-zinc-100 tracking-wider">FLIP</span>
  </div>,
  <div key="c3" className="w-full h-full flex items-center justify-center p-4">
    <button
      type="button"
      className="relative rounded-md border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100"
    >
      <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-2 w-2 border-t-2 border-l-2 border-[#FEF62A]" />
      <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-2 w-2 border-t-2 border-r-2 border-[#FEF62A]" />
      <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-2 w-2 border-b-2 border-l-2 border-[#FEF62A]" />
      <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2 w-2 border-b-2 border-r-2 border-[#FEF62A]" />
      <span>Corner</span>
    </button>
  </div>,
  <div key="c4" className="w-full h-full flex items-center justify-center p-4">
    <button
      type="button"
      className="rounded-lg border border-zinc-700 bg-[radial-gradient(95%_60%_at_50%_75%,#18181b_0%,#3f3f46_100%)] px-5 py-2 text-[11px] font-semibold text-white shadow-[inset_0_1px_8px_-4px_#fff]"
    >
      Candy
    </button>
  </div>,
  <div key="c5" className="w-full h-full flex items-center justify-center p-4">
    <button
      type="button"
      className="rounded-full border border-zinc-700 bg-zinc-900/95 px-4 py-2 text-xs font-semibold text-zinc-100"
    >
      <span className="text-[#FEF62A] mr-1">✦</span>ARCH V1.1
    </button>
  </div>,
];

export function IsometricHeroBox() {
  const uid = useId().replace(/:/g, '');
  const [pairStartIndex, setPairStartIndex] = useState(0);
  const leftIndex = pairStartIndex % HERO_FACE_COMPONENTS.length;
  const rightIndex = (pairStartIndex + 1) % HERO_FACE_COMPONENTS.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setPairStartIndex((prev) => (prev + 2) % HERO_FACE_COMPONENTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-[540px] w-full flex-col items-center justify-center overflow-hidden bg-[#0b0b0c] px-4 py-10">
      <div className="absolute inset-0 border m-4 border-white/10 pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_50%_72%,rgba(255,255,255,0.06),transparent_30%)]" />
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <div className="relative z-20 inline-block w-full max-w-[340px] lg:max-w-[380px]">
          <svg
            width="360"
            height="488"
            viewBox="0 0 360 488"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto overflow-visible"
          >
            {/* Stage base */}
            <rect
              x="0.866026"
              width="205.158"
              height="205.158"
              transform="matrix(0.866026 -0.499999 0.866026 0.499999 1.11603 304.511)"
              fill="#0a0a0b"
            />
            <rect
              x="0.866026"
              width="205.158"
              height="205.158"
              transform="matrix(0.866026 -0.499999 0.866026 0.499999 1.11603 304.511)"
              fill={`url(#stageTop_${uid})`}
            />
            <rect
              x="0.866026"
              width="205.158"
              height="205.158"
              transform="matrix(0.866026 -0.499999 0.866026 0.499999 1.11603 304.511)"
              fill="none"
              stroke="#e4e4e7"
            />
            <path
              d="M1.98828 304.71L179.781 407.358V486.377L1.98828 383.729V304.71Z"
              fill="#0a0a0b"
              stroke="#e4e4e7"
            />
            <rect
              width="205.297"
              height="79.0189"
              transform="matrix(0.866026 -0.499999 0 1 179.781 407.359)"
              fill="#0a0a0b"
              stroke="#e4e4e7"
            />
            {(
              [
                'M191.959 409.418C194.082 408.193 195.803 409.186 195.803 411.638C195.803 414.089 194.082 417.07 191.959 418.295C189.837 419.521 188.116 418.528 188.116 416.076C188.116 413.625 189.837 410.644 191.959 409.418Z',
                'M12.1909 319.534C14.3138 320.759 16.0347 323.74 16.0347 326.191C16.0347 328.643 14.3139 329.636 12.1909 328.411C10.068 327.185 8.34708 324.204 8.34708 321.753C8.34717 319.302 10.0681 318.308 12.1909 319.534Z',
                'M167.266 409.417C169.389 410.643 171.109 413.624 171.109 416.075C171.109 418.527 169.389 419.52 167.266 418.294C165.143 417.069 163.422 414.088 163.422 411.637C163.422 409.186 165.143 408.192 167.266 409.417Z',
                'M167.266 461.766C169.389 462.992 171.109 465.972 171.109 468.424C171.109 470.875 169.389 471.869 167.266 470.643C165.143 469.417 163.422 466.437 163.422 463.985C163.422 461.534 165.143 460.541 167.266 461.766Z',
                'M12.1909 371.883C14.3138 373.109 16.0347 376.09 16.0347 378.541C16.0347 380.992 14.3139 381.986 12.1909 380.76C10.068 379.534 8.34708 376.554 8.34708 374.103C8.34717 371.651 10.0681 370.658 12.1909 371.883Z',
                'M191.959 461.767C194.082 460.541 195.803 461.535 195.803 463.986C195.803 466.438 194.082 469.418 191.959 470.644C189.837 471.87 188.116 470.876 188.116 468.425C188.116 465.974 189.837 462.993 191.959 461.767Z',
                'M348.022 373.859C350.145 372.633 351.866 373.627 351.866 376.078C351.866 378.53 350.145 381.51 348.022 382.736C345.899 383.961 344.178 382.968 344.178 380.517C344.178 378.065 345.899 375.085 348.022 373.859Z',
                'M348.022 317.558C350.145 316.332 351.866 317.326 351.866 319.777C351.866 322.229 350.145 325.209 348.022 326.435C345.899 327.661 344.178 326.667 344.178 324.216C344.178 321.765 345.899 318.784 348.022 317.558Z',
              ] as const
            ).map((d, i) => (
              <path key={i} d={d} fill="#0a0a0b" stroke="#e4e4e7" />
            ))}
            <path d="M16.3101 326.936L163.483 411.881" stroke="#e4e4e7" strokeDasharray="4 4" />
            <path
              d="M15.8164 379.78L163.483 463.737M196.079 411.387L344.239 325.454M196.079 463.737L344.239 381.261"
              stroke="#e4e4e7"
              strokeDasharray="4 4"
            />
            <ellipse cx="180" cy="337" rx="92" ry="34" fill="black" opacity="0.45" />

            {/* Floating Cube Group */}
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 -6; 0 -18; 0 -6"
                dur="4s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0; 0.5; 1"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />

              {/* Panel shadow borders */}
              <rect
                width="173.205"
                height="173.205"
                transform="matrix(0.866025 0.5 -0.866025 0.5 180 7)"
                fill="#0a0a0b"
                stroke="#e4e4e7"
              />
              <rect
                width="173.205"
                height="173.21"
                transform="matrix(0.866025 0.5 0 1 30 93.6025)"
                fill="#0a0a0b"
                stroke="#e4e4e7"
              />
              <rect
                width="173.205"
                height="173.21"
                transform="matrix(0.866025 -0.5 0 1 180 180.205)"
                fill="#0a0a0b"
                stroke="#e4e4e7"
              />

              {/* Solid panels */}
              <rect
                width="160"
                height="160"
                transform="matrix(0.866025 0.5 -0.866025 0.5 179.564 14)"
                fill="#060607"
                stroke="#e4e4e7"
              />
              <rect
                width="160"
                height="160.005"
                transform="matrix(0.866025 0.5 0 1 36 104)"
                fill="#060607"
                stroke="#e4e4e7"
              />
              <rect
                width="160"
                height="160.005"
                transform="matrix(0.866025 -0.5 0 1 186 184)"
                fill="#060607"
                stroke="#e4e4e7"
              />

              {/* Top Face Wordmark */}
              <g transform="matrix(0.866025 0.5 -0.866025 0.5 179.564 14)">
                <foreignObject width="160" height="160">
                  <div className="w-[160px] h-[160px] flex flex-col items-center justify-center select-none">
                    <span className="font-orbitron text-xl font-black tracking-tight text-white">
                      ARCH<span className="text-[#FEF62A]">.</span>
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-400 mt-1">
                      V1.1 CORE
                    </span>
                  </div>
                </foreignObject>
              </g>

              {/* Left Face Content */}
              <g transform="matrix(0.866025 0.5 0 1 36 104)">
                <foreignObject width="160" height="160">
                  <div className="w-[160px] h-[160px] overflow-hidden relative">
                    <div
                      key={`left-${leftIndex}`}
                      className="absolute inset-0 w-full h-full pointer-events-none hero-face-preview"
                    >
                      <div className="pointer-events-auto w-full h-full">
                        {HERO_FACE_COMPONENTS[leftIndex]}
                      </div>
                    </div>
                  </div>
                </foreignObject>
              </g>

              {/* Right Face Content */}
              <g transform="matrix(0.866025 -0.5 0 1 186 184)">
                <foreignObject width="160" height="160">
                  <div className="w-[160px] h-[160px] overflow-hidden relative">
                    <div
                      key={`right-${rightIndex}`}
                      className="absolute inset-0 w-full h-full pointer-events-none hero-face-preview"
                    >
                      <div className="pointer-events-auto w-full h-full">
                        {HERO_FACE_COMPONENTS[rightIndex]}
                      </div>
                    </div>
                  </div>
                </foreignObject>
              </g>

              {/* Hexagon boundary with fade */}
              <path
                d="M335.385 90.2881V269.711L180 359.423L24.6152 269.711V90.2881L180 0.576172L335.385 90.2881Z"
                fill={`url(#p3_${uid})`}
                fillOpacity="0.25"
                stroke="#e4e4e7"
              />
            </g>

            <defs>
              <linearGradient id={`p3_${uid}`} x1="180" y1="242" x2="180" y2="367.5" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e4e4e7" stopOpacity="0" />
                <stop offset="1" stopColor="#e4e4e7" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={`stageTop_${uid}`} x1="180" y1="304" x2="180" y2="486" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="white" stopOpacity="0.08" />
                <stop offset="0.55" stopColor="white" stopOpacity="0.02" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <IsometricGrid className="z-0 scale-[2.2] opacity-40" />
      </div>
    </div>
  );
}

/* ============================================================================
   Vengeance UI Animated Connectors (Used in FeatureCard3)
   ============================================================================ */
export function ConnectorLine({
  className,
  delay = 0,
  duration = 2,
  reverse = false,
}: {
  className?: string;
  delay?: number;
  duration?: number;
  reverse?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn('relative w-full h-[2px] flex items-center justify-center overflow-hidden', className)}>
      <svg className="w-full h-full" viewBox="0 0 100 2" preserveAspectRatio="none">
        <line x1="0" y1="1" x2="100" y2="1" className="stroke-neutral-800" strokeWidth="2" strokeLinecap="round" />
        <line
          x1="0"
          y1="1"
          x2="100"
          y2="1"
          stroke={`url(#gradient-${id})`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <defs>
          <motion.linearGradient
            id={`gradient-${id}`}
            gradientUnits="userSpaceOnUse"
            initial={{
              x1: reverse ? '120%' : '-20%',
              x2: reverse ? '100%' : '0%',
            }}
            animate={{
              x1: reverse ? '-20%' : '100%',
              x2: reverse ? '0%' : '120%',
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'linear',
              delay,
            }}
          >
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#FEF62A" />
            <stop offset="100%" stopColor="transparent" />
          </motion.linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function CornerConnector({
  className,
  delay = 0,
  duration = 2,
  corner = 'bottom-left',
  radius = 40,
  reverse = false,
}: {
  className?: string;
  delay?: number;
  duration?: number;
  corner?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  radius?: number;
  reverse?: boolean;
}) {
  const id = useId();
  const r = Math.min(Math.max(radius, 0), 90);
  const paths = {
    'bottom-left': `M 2 0 V ${100 - r} Q 2 98 ${2 + r} 98 H 100`,
    'bottom-right': `M 98 0 V ${100 - r} Q 98 98 ${98 - r} 98 H 0`,
    'top-left': `M 2 100 V ${r} Q 2 2 ${2 + r} 2 H 100`,
    'top-right': `M 98 100 V ${r} Q 98 2 ${98 - r} 2 H 0`,
  };
  const d = paths[corner];
  const isRight = corner.includes('right');

  return (
    <div className={cn('relative w-full h-full flex items-center justify-center overflow-hidden', className)}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
        <path
          d={d}
          className="stroke-neutral-800"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={d}
          stroke={`url(#gradient-${id})`}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <motion.linearGradient
            id={`gradient-${id}`}
            gradientUnits="userSpaceOnUse"
            initial={{
              x1: reverse ? (isRight ? '0%' : '120%') : isRight ? '120%' : '-20%',
              y1: reverse ? '120%' : '-20%',
              x2: reverse ? (isRight ? '20%' : '100%') : isRight ? '100%' : '0%',
              y2: reverse ? '100%' : '0%',
            }}
            animate={{
              x1: reverse ? (isRight ? '120%' : '-20%') : isRight ? '0%' : '100%',
              y1: reverse ? '-20%' : '100%',
              x2: reverse ? (isRight ? '100%' : '0%') : isRight ? '-20%' : '120%',
              y2: reverse ? '0%' : '120%',
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'linear',
              delay,
            }}
          >
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#FEF62A" />
            <stop offset="100%" stopColor="transparent" />
          </motion.linearGradient>
        </defs>
      </svg>
    </div>
  );
}
