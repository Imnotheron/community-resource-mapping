'use client'

interface CrmsLoadingScreenProps {
  label?: string
}

export function CrmsLoadingScreen({
  label = 'Preparing your workspace…',
}: CrmsLoadingScreenProps) {
  return (
    <div className="crms-loader-screen relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#04130f] px-5 text-white">
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
            radial-gradient(circle at 50% 44%, rgba(16,185,129,.22), transparent 24%),
            radial-gradient(circle at 28% 24%, rgba(45,212,191,.10), transparent 22%),
            radial-gradient(circle at 75% 70%, rgba(34,197,94,.09), transparent 22%),
            linear-gradient(180deg, #061914 0%, #03100d 60%, #020a08 100%);
        }

        .crms-loader-grid {
          position: absolute;
          inset: 0;
          z-index: -2;
          opacity: .16;
          background-image:
            linear-gradient(rgba(110,231,183,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(110,231,183,.12) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black 18%, transparent 72%);
        }

        .crms-loader-glow {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(76vw, 560px);
          aspect-ratio: 1;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(16,185,129,.16), rgba(16,185,129,.04) 46%, transparent 72%);
          transform: translate(-50%, -50%);
          filter: blur(12px);
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
          border: 1px solid rgba(110,231,183,.32);
          border-top-color: rgba(110,231,183,.95);
          border-right-color: rgba(52,211,153,.54);
          animation: crmsSpin 4.8s linear infinite;
        }

        .crms-loader-ring::before,
        .crms-loader-ring::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #6ee7b7;
          box-shadow: 0 0 20px rgba(110,231,183,.8);
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
          background: #2dd4bf;
        }

        .crms-loader-ring-alt {
          inset: 17px;
          border: 1px dashed rgba(94,234,212,.22);
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
          border: 1px solid rgba(167,243,208,.55);
          background: rgba(255,255,255,.96);
          box-shadow:
            0 0 0 8px rgba(16,185,129,.08),
            0 22px 70px rgba(0,0,0,.36),
            0 0 42px rgba(16,185,129,.16);
          animation: crmsLogoFloat 2.8s ease-in-out infinite;
        }

        .crms-loader-logo-wrap::after {
          content: "";
          position: absolute;
          inset: -45%;
          background: linear-gradient(105deg, transparent 42%, rgba(255,255,255,.9) 50%, transparent 58%);
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
          height: 3px;
          overflow: hidden;
          border-radius: 9999px;
          background: rgba(255,255,255,.08);
        }

        .crms-loader-progress::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 42%;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, #34d399 30%, #5eead4 70%, transparent);
          box-shadow: 0 0 18px rgba(52,211,153,.55);
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
          0%, 100% { opacity: .72; transform: translate(-50%, -50%) scale(.94); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
        }

        @keyframes crmsLogoFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.015); }
        }

        @keyframes crmsShine {
          0%, 55% { transform: translateX(-85%) rotate(12deg); opacity: 0; }
          68% { opacity: .9; }
          100% { transform: translateX(85%) rotate(12deg); opacity: 0; }
        }

        @keyframes crmsProgress {
          0% { transform: translateX(-125%); }
          100% { transform: translateX(310%); }
        }

        @keyframes crmsDot {
          0%, 70%, 100% { opacity: .28; transform: translateY(0); }
          35% { opacity: 1; transform: translateY(-2px); }
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
            opacity: .11;
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
        <div className="crms-loader-core" aria-hidden="true">
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
          <p className="crms-loader-wordmark text-[0.62rem] font-extrabold uppercase text-emerald-300/80 sm:text-[0.68rem]">
            San Policarpo · Eastern Samar
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
            Community Resource Mapping System
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-emerald-50/55">
            Connecting community data, people, and relief services.
          </p>
        </div>

        <div className="mt-8">
          <div className="crms-loader-progress" />
          <div className="crms-loader-dots mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-100/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span className="ml-2">{label}</span>
          </div>
        </div>

        <p className="mt-10 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/30">
          LGU San Policarpo · ESSU · Community Services
        </p>
      </div>
    </div>
  )
}

export default CrmsLoadingScreen
