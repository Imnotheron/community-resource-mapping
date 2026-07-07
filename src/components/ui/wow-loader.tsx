'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WowLoaderProps {
    label?: string
    description?: string
    className?: string
    compact?: boolean
}

export function WowLoader({
    label = 'Loading dashboard',
    description = 'Preparing your workspace...',
    className,
    compact = false,
}: WowLoaderProps) {
    return (
        <div
            className={cn(
                'relative grid place-items-center overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl',
                compact ? 'min-h-[180px]' : 'min-h-[360px]',
                className
            )}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.18),transparent_30%)]" />

            <motion.div
                className="absolute h-44 w-44 rounded-full border border-emerald-300/50"
                animate={{
                    rotateX: [0, 65, 0],
                    rotateY: [0, 360, 0],
                    scale: [0.9, 1.05, 0.9],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{
                    transformStyle: 'preserve-3d',
                }}
            />

            <motion.div
                className="absolute h-32 w-32 rounded-full border border-blue-300/50"
                animate={{
                    rotateX: [65, 0, 65],
                    rotateY: [360, 0, 360],
                    scale: [1.05, 0.9, 1.05],
                }}
                transition={{
                    duration: 3.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{
                    transformStyle: 'preserve-3d',
                }}
            />

            <motion.div
                className="relative z-10 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
            >
                <motion.div
                    className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 shadow-[0_24px_60px_rgba(16,185,129,0.38)]"
                    animate={{
                        rotateX: [0, 18, 0, -18, 0],
                        rotateY: [0, -18, 0, 18, 0],
                        y: [0, -8, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        transformStyle: 'preserve-3d',
                    }}
                >
                    <motion.div
                        className="absolute inset-3 rounded-2xl bg-white/20"
                        animate={{ rotate: [0, 180, 360] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                    />

                    <motion.div
                        className="h-9 w-9 rounded-xl bg-white/90 shadow-inner"
                        animate={{
                            scale: [1, 0.75, 1],
                            rotate: [0, 90, 180, 270, 360],
                        }}
                        transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </motion.div>

                <div className="mt-6">
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-700">
                        {label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        {description}
                    </p>
                </div>

                <div className="mt-5 flex gap-1.5">
                    {[0, 1, 2].map((dot) => (
                        <motion.span
                            key={dot}
                            className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                            animate={{
                                opacity: [0.35, 1, 0.35],
                                y: [0, -5, 0],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: dot * 0.16,
                            }}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    )
}