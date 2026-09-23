'use client'

interface CrmsLoadingScreenProps {
  label?: string
}

export function CrmsLoadingScreen({
  label = 'Preparing your workspace…',
}: CrmsLoadingScreenProps) {
  return (
    <div className="crms-loader-screen relative flex min-h-dvh items-center justify-center overflow-hidden bg-white px-5 text-slate-900">
      <style>{`
        .crms-loader-screen {
          isolation: isolate;
        }

        .crms-loader-screen::before {
          content: "";
          position: absolute;
          inset: -18%;
          z-index: -3;
          background:
            radial-gradient(circle at 50% 42%, rgba(16,185,129,.16), transparent 27%),
            radial-gradient(circle at 22% 22%, rgba(56,189,248,.13), transparent 24%),
            radial-gradient(circle at 82% 74%, rgba(45,212,191,.12), transparent 26%),
            linear-gradient(180deg, #ffffff 0%, #f8fffc 52%, #f2fbf7 100%);
        }

        .crms-loader-grid {
          position: absolute;
          inset: 0;
          z-index: -2;
          opacity: .34;
          background-image:
            linear-gradient(rgba(16,185,129,.09) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,.09) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black 18%, transparent 74%);
        }

        .crms-loader-glow {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(76vw, 580px);
          aspect-ratio: 1;
          border-radius: 9999px;
          background:
            radial-gradient(circle, rgba(16,185,129,.14), rgba(45,212,191,.06) 46%, transparent 72%);
          transform: translate(-50%, -50%);
          filter: blur(10px);
          animation: crmsGlowPulse 3.2s ease-in-out infinite;
        }

        .crms-loader-core {
          position: relative;
          display: grid;
          place-items: center;
          width: 154px;
          height: 154px;
        }

        .crms-loader-ring,
        .crms-loader-ring-alt {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
        }

        .crms-loader-ring {
          border: 1.5px solid rgba(5,150,105,.22);
          border-top-color: rgba(5,150,105,.92);
          border-right-color: rgba(13,148,136,.55);
          box-shadow: 0 0 28px rgba(16,185,129,.08);
          animation: crmsSpin 4.8s linear infinite;
        }

        .crms-loader-ring::before,
        .crms-loader-ring::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #10b981;
          box-shadow: 0 0 16px rgba(16,185,129,.38);
        }

        .crms-loader-ring::before {
          top: 12px;
          left: 24px;
        }

        .crms-loader-ring::after {
          bottom: 18px;
          right: 18px;
          width: 6px;
          height: 6px;
          background: #0ea5e9;
          box-shadow: 0 0 14px rgba(14,165,233,.28);
        }

        .crms-loader-ring-alt {
          inset: 17px;
          border: 1px dashed rgba(13,148,136,.28);
          animation: crmsSpinReverse 7.5s linear infinite;
        }

        .crms-loader-logo-wrap {
          position: relative;
          display: grid;
          place-items: center;
          width: 96px;
          height: 96px;
          overflow: hidden;
          border-radius: 9999px;
          border: 1px solid rgba(16,185,129,.22);
          background: rgba(255,255,255,.98);
          box-shadow:
            0 0 0 8px rgba(16,185,129,.06),
            0 18px 48px rgba(15,23,42,.10),
            0 0 36px rgba(16,185,129,.10);
          animation: crmsLogoFloat 2.8s ease-in-out infinite;
        }

        .crms-loader-logo-wrap::after {
          content: "";
          position: absolute;
          inset: -45%;
          background:
            linear-gradient(
              105deg,
              transparent 42%,
              rgba(255,255,255,.98) 50%,
              transparent 58%
            );
          transform: translateX(-70%) rotate(12deg);
          animation: crmsShine 2.7s ease-in-out infinite;
        }

        .crms-loader-logo {
          width: 110%;
          height: 110%;
          object-fit: contain;
          transform: scale(1.16);
        }

        .crms-loader-wordmark {
          letter-spacing: .24em;
        }

        .crms-loader-progress {
          position: relative;
          width: min(310px, 72vw);
          height: 4px;
          overflow: hidden;
          border-radius: 9999px;
          background: rgba(15,23,42,.07);
          box-shadow: inset 0 1px 2px rgba(15,23,42,.04);
        }

        .crms-loader-progress::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 42%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              transparent,
              #10b981 30%,
              #14b8a6 58%,
              #38bdf8 78%,
              transparent
            );
          box-shadow: 0 0 16px rgba(16,185,129,.24);
          animation: crmsProgress 1.65s cubic-bezier(.4,0,.2,1) infinite;
        }

        .crms-loader-dots span {
          animation: crmsDot 1.35s ease-in-out infinite;
        }

        .crms-loader-dots span:nth-child(2) {
          animation-delay: .16s;
        }

        .crms-loader-dots span:nth-child(3) {
          animation-delay: .32s;
        }

        @keyframes crmsSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes crmsSpinReverse {
          to { transform: rotate(-360deg); }
        }

        @keyframes crmsGlowPulse {
          0%, 100% {
            opacity: .72;
            transform: translate(-50%, -50%) scale(.94);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06);
          }
        }

        @keyframes crmsLogoFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.015);
          }
        }

        @keyframes crmsShine {
          0%, 55% {
            transform: translateX(-85%) rotate(12deg);
            opacity: 0;
          }
          68% {
            opacity: .95;
          }
          100% {
            transform: translateX(85%) rotate(12deg);
            opacity: 0;
          }
        }

        @keyframes crmsProgress {
          0% {
            transform: translateX(-125%);
          }
          100% {
            transform: translateX(310%);
          }
        }

        @keyframes crmsDot {
          0%, 70%, 100% {
            opacity: .28;
            transform: translateY(0);
          }
          35% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @media (max-width: 640px) {
          .crms-loader-core {
            width: 136px;
            height: 136px;
          }

          .crms-loader-logo-wrap {
            width: 84px;
            height: 84px;
          }

          .crms-loader-grid {
            background-size: 34px 34px;
            opacity: .24;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .crms-loader-glow,
          .crms-loader-ring,
          .crms-loader-ring-alt,
          .crms-loader-logo-wrap,
          .crms-loader-logo-wrap::after,
          .crms-loader-progress::after,
          .crms-loader-dots span {
            animation: none !important;
          }

          .crms-loader-progress::after {
            width: 62%;
            transform: translateX(30%);
          }
        }
      `}</style>

      <div className="crms-loader-grid" />
      <div className="crms-loader-glow" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <div
          className="crms-loader-core"
          aria-hidden="true"
        >
          <div className="crms-loader-ring" />
          <div className="crms-loader-ring-alt" />

          <div className="crms-loader-logo-wrap">
            <img
              src="/icon.png"
              alt=""
              className="crms-loader-logo"
            />
          </div>
        </div>

        <div className="mt-7">
          <p className="crms-loader-wordmark text-[0.62rem] font-extrabold uppercase text-emerald-600/80 sm:text-[0.68rem]">
            San Policarpo · Eastern Samar
          </p>

          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
            Community Resource Mapping System
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
            Connecting community data, people, and relief services.
          </p>
        </div>

        <div className="mt-8">
          <div className="crms-loader-progress" />

          <div className="crms-loader-dots mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
            <span className="ml-2">{label}</span>
          </div>
        </div>

        <p className="mt-10 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
          LGU San Policarpo · ESSU · Community Services
        </p>
      </div>
    </div>
  )
}

export default CrmsLoadingScreen
