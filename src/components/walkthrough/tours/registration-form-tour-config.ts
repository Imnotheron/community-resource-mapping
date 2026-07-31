import type { WalkthroughTour } from '@/components/walkthrough/types'
import {
  REGISTRATION_MODAL_TARGETS as TARGETS,
  showRegistrationModalStep,
} from '@/components/walkthrough/registration-modal-dom'

export function createRegistrationFormTour(tourId: string): WalkthroughTour {
  return {
    id: tourId,
    version: 1,
    title: 'Registration form guide',
    role: 'ADMIN',
    steps: [
      {
        id: 'welcome',
        title: 'This form has five simple parts',
        description:
          'You will enter personal details, medical and assistance information, administrative details, supporting documents, and then review everything before registration. This guide will move between sections, but it will not enter, save, or submit information for you.',
        placement: 'center',
        eyebrow: 'Registration form guide',
      },
      {
        id: 'window',
        title: 'Everything you need stays inside this window',
        description:
          'The form area scrolls by itself, the left side keeps the steps and saved drafts together, and the action buttons stay at the bottom. You do not need to scroll the page behind the registration window.',
        target: TARGETS.window,
        placement: 'center',
        padding: 0,
      },
      {
        id: 'progress',
        title: 'Use progress as a quick check',
        description:
          'Step tells you where you are in the five-part form. Required completion shows how many sections already have their important fields completed. You can still move between sections while you finish the information.',
        target: TARGETS.progress,
        placement: 'bottom',
        padding: 3,
      },
      {
        id: 'steps',
        title: 'Move between the five sections whenever you need to',
        description:
          'Select Personal, Medical, Administrative, Documents, or Review from this list. Moving to another section does not erase information you already entered.',
        target: TARGETS.steps,
        placement: 'right',
        padding: 3,
      },
      {
        id: 'drafts',
        title: 'Saved Drafts lets you stop and continue later',
        description:
          'Save Draft stores the information you entered so far. Select Resume to continue a saved draft, or Delete to remove one. You can also select the Drafts badge at the top to jump here. File attachments are not kept in a saved draft, so choose those files again after resuming.',
        target: TARGETS.drafts,
        placement: 'right',
        padding: 3,
      },
      {
        id: 'personal',
        title: '1. Personal — identify and locate the correct person',
        description:
          'Enter the name, date of birth, gender, contact details, and barangay. A red asterisk means the field is required. Use the map to verify the location, then check the address before moving on.',
        target: TARGETS.section,
        placement: 'bottom',
        padding: 3,
        beforeEnter: () => showRegistrationModalStep(0),
      },
      {
        id: 'medical',
        title: '2. Medical — record why assistance may be needed',
        description:
          'Choose the correct government registry basis, then fill in the medical, disability, welfare, or assistance information that applies. Some fields become required only when the matching option is selected. Read the consent statement before checking it.',
        target: TARGETS.section,
        placement: 'bottom',
        padding: 3,
        beforeEnter: () => showRegistrationModalStep(1),
      },
      {
        id: 'administrative',
        title: '3. Administrative — add support and emergency details',
        description:
          'Use this section for administrative IDs, education or employment information, guardian details when applicable, and the emergency contact. The emergency contact and phone are important required fields.',
        target: TARGETS.section,
        placement: 'bottom',
        padding: 3,
        beforeEnter: () => showRegistrationModalStep(2),
      },
      {
        id: 'documents',
        title: '4. Documents — record the supporting documents available',
        description:
          'Use this section for supporting documents such as proof of identity, proof of residence, medical records, or ID photos when available. If you loaded a saved draft, choose the files again because drafts do not retain file attachments.',
        target: TARGETS.section,
        placement: 'bottom',
        padding: 3,
        beforeEnter: () => showRegistrationModalStep(3),
      },
      {
        id: 'review',
        title: '5. Review — check everything before creating the account',
        description:
          'Review all details carefully. If an important field is missing, the form shows what still needs attention. A profile created directly by an Administrator is created as Approved, so correct mistakes before confirming the registration.',
        target: TARGETS.section,
        placement: 'bottom',
        padding: 3,
        beforeEnter: () => showRegistrationModalStep(4),
      },
      {
        id: 'save-draft',
        title: 'Save Draft is your safe stopping point',
        description:
          'Use Save Draft when you cannot finish yet. After the draft is saved, the form is cleared and you can resume the saved copy later from Saved Drafts.',
        target: TARGETS.saveDraft,
        placement: 'top',
        padding: 2,
      },
      {
        id: 'footer',
        title: 'Use these buttons to move, save, or finish',
        description:
          'Previous returns to the earlier section. Continue moves forward. On Review, the final button becomes Confirm Registration when the important required information is complete.',
        target: TARGETS.footer,
        placement: 'top',
        padding: 2,
      },
      {
        id: 'resize',
        title: 'Need more room? Resize the window',
        description:
          'On a computer, drag the lower-right corner or any window edge to change the window size. The lower-right resize corner is now visible so you do not have to guess where to grab it. The form and Saved Drafts remain scrollable when space is limited.',
        target: TARGETS.resize,
        placement: 'top',
        padding: 8,
      },
      {
        id: 'ready',
        title: 'You are ready to begin with Personal Information',
        description:
          'Start with the correct person, complete required fields marked with an asterisk, save a draft if you need to stop, and use Review as the final accuracy check before registration.',
        target: TARGETS.section,
        placement: 'bottom',
        padding: 3,
        beforeEnter: () => showRegistrationModalStep(0),
        eyebrow: 'Ready to register',
      },
    ],
  }
}
