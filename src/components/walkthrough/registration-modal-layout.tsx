'use client'

export function RegistrationModalLayoutStyles() {
  return (
    <style>{`
      [data-registration-modal][data-registration-enhanced="true"] {
        resize: both;
      }

      [data-registration-modal][data-registration-enhanced="true"]::after {
        content: '';
        position: absolute;
        right: .45rem;
        bottom: .45rem;
        z-index: 90;
        width: .9rem;
        height: .9rem;
        pointer-events: none;
        opacity: .65;
        background: linear-gradient(135deg, transparent 0 48%, rgb(5 150 105) 49% 56%, transparent 57% 67%, rgb(5 150 105) 68% 75%, transparent 76%);
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="legacy-resize-handle"] {
        display: none !important;
        pointer-events: none !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header"] {
        cursor: default !important;
        padding: .75rem 1rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header-grid"] {
        align-items: center !important;
        gap: .75rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header-controls"] {
        align-items: center !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="progress-card"] {
        border-radius: .875rem !important;
        padding: .5rem .75rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="progress-description"] {
        display: none !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="progress-card"] > div:last-child {
        margin-top: .375rem !important;
        height: .3rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header-progress-track"] {
        margin-top: .625rem !important;
        height: .3rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-shortcut"] {
        cursor: pointer;
        outline: none;
        transition: background-color 160ms ease, box-shadow 160ms ease;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-shortcut"]:hover,
      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-shortcut"]:focus-visible {
        background: rgb(226 232 240) !important;
        box-shadow: 0 0 0 2px rgb(16 185 129 / .22);
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="rail"] {
        width: 20rem !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="rail-inner"] {
        min-height: 100% !important;
        height: auto !important;
        padding: .75rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="step-navigation"] {
        gap: .25rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="step-button"] {
        border-radius: .875rem !important;
        gap: .5rem !important;
        padding: .45rem .625rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="step-button"] p + p {
        display: none !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-wrapper"] {
        min-height: 12rem !important;
        margin-top: .625rem !important;
        overflow: hidden !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-card"] {
        min-height: 12rem !important;
      }

      [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="footer"] {
        padding-top: .65rem !important;
        padding-bottom: .65rem !important;
      }

      @media (max-width: 767px) {
        [data-registration-modal][data-registration-enhanced="true"] {
          resize: none !important;
        }

        [data-registration-modal][data-registration-enhanced="true"]::after {
          display: none;
        }
      }

      @media (min-width: 768px) {
        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header"] {
          padding: .85rem 1.25rem !important;
        }
      }

      @media (min-width: 1280px) {
        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header-grid"] {
          grid-template-columns: minmax(0, 1fr) minmax(11rem, 14rem) auto !important;
        }
      }

      @media (max-width: 1399px) and (min-width: 1024px) {
        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="rail"] {
          width: 18rem !important;
        }
      }

      @media (max-height: 760px) and (min-width: 768px) {
        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header"] {
          padding-top: .55rem !important;
          padding-bottom: .55rem !important;
        }

        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="modal-subtitle"] {
          display: none !important;
        }

        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="header-progress-track"] {
          margin-top: .4rem !important;
        }

        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="step-button"] {
          padding-top: .35rem !important;
          padding-bottom: .35rem !important;
        }

        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-wrapper"],
        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="draft-card"] {
          min-height: 10rem !important;
        }

        [data-registration-modal][data-registration-enhanced="true"] [data-registration-layout="footer"] {
          padding-top: .45rem !important;
          padding-bottom: .45rem !important;
        }
      }
    `}</style>
  )
}
