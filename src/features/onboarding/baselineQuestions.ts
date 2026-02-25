import type { BaselineQuestion } from './onboardingTypes'

/**
 * Baseline‑test question bank.
 * A sailor must score ≥ 70 % to pass.
 * Three categories: Boat Anatomy, Harbor Anatomy, Simple Knot Forming.
 */
export const PASS_THRESHOLD = 70 // percent

const questions: BaselineQuestion[] = [
  /* ── Boat Anatomy ────────────────────────── */
  {
    id: 'ba-1',
    category: 'boat_anatomy',
    question: 'What is the front of a boat called?',
    choices: ['Stern', 'Bow', 'Port', 'Starboard'],
    correctIndex: 1,
    explanation: 'The bow is the forward‑most part of a boat.',
  },
  {
    id: 'ba-2',
    category: 'boat_anatomy',
    question: 'Which term describes the rear of a boat?',
    choices: ['Bow', 'Helm', 'Stern', 'Beam'],
    correctIndex: 2,
    explanation: 'The stern is the back end of a vessel.',
  },
  {
    id: 'ba-3',
    category: 'boat_anatomy',
    question: 'When facing the bow, which side is "port"?',
    choices: ['Right', 'Left', 'Top', 'Bottom'],
    correctIndex: 1,
    explanation: 'Port is the left side of the vessel when facing forward.',
  },
  {
    id: 'ba-4',
    category: 'boat_anatomy',
    question: 'What does "starboard" refer to?',
    choices: ['Left side', 'Right side', 'The mast', 'The keel'],
    correctIndex: 1,
    explanation: 'Starboard is the right side when facing the bow.',
  },
  {
    id: 'ba-5',
    category: 'boat_anatomy',
    question: 'The "helm" on a boat is used for:',
    choices: ['Anchoring', 'Steering', 'Fishing', 'Docking'],
    correctIndex: 1,
    explanation: 'The helm is the steering apparatus of a vessel.',
  },
  {
    id: 'ba-6',
    category: 'boat_anatomy',
    question: 'What is the keel of a sailboat?',
    choices: [
      'The top of the mast',
      'A fin on the bottom that provides stability',
      'The steering wheel',
      'The sail cover',
    ],
    correctIndex: 1,
    explanation: 'The keel is a weighted fin beneath the hull that prevents capsizing.',
  },

  /* ── Harbor Anatomy ──────────────────────── */
  {
    id: 'ha-1',
    category: 'harbor_anatomy',
    question: 'A "slip" in a marina refers to:',
    choices: [
      'An emergency exit',
      'A designated parking spot for a boat',
      'A type of anchor',
      'A mooring buoy',
    ],
    correctIndex: 1,
    explanation: 'A slip is a berthing space between two piers or floating docks.',
  },
  {
    id: 'ha-2',
    category: 'harbor_anatomy',
    question: 'What is a "fairway" in harbor navigation?',
    choices: [
      'A golf term only',
      'The main navigable channel in a harbor',
      'A type of dock cleat',
      'A fishing zone',
    ],
    correctIndex: 1,
    explanation: 'A fairway is the main traffic lane ships use to enter or leave a harbor.',
  },
  {
    id: 'ha-3',
    category: 'harbor_anatomy',
    question: 'Channel markers colored red indicate:',
    choices: [
      'Deep water ahead',
      'Keep the marker on your right (starboard) when returning from sea',
      'Shallow water ahead',
      'No-wake zone',
    ],
    correctIndex: 1,
    explanation: '"Red right returning" — keep red markers to starboard when returning to port.',
  },
  {
    id: 'ha-4',
    category: 'harbor_anatomy',
    question: 'What is a "breakwater"?',
    choices: [
      'A type of wave surfboard',
      'A structure that protects a harbor from large waves',
      'A drainage valve on a boat',
      'A mooring knot',
    ],
    correctIndex: 1,
    explanation: 'A breakwater is a barrier built to shelter a harbor from heavy seas.',
  },

  /* ── Simple Knot Forming ─────────────────── */
  {
    id: 'kn-1',
    category: 'knots',
    question: 'Which knot is best for tying a boat to a dock cleat?',
    choices: ['Square knot', 'Cleat hitch', 'Bowline', 'Reef knot'],
    correctIndex: 1,
    explanation: 'A cleat hitch is the standard method for securing a line to a dock cleat.',
  },
  {
    id: 'kn-2',
    category: 'knots',
    question: 'A bowline knot is known for:',
    choices: [
      'Slipping under load',
      'Creating a fixed loop that does not slip',
      'Joining two ropes of different sizes',
      'Decorative purposes only',
    ],
    correctIndex: 1,
    explanation: 'The bowline creates a reliable, non‑slip loop at the end of a line.',
  },
  {
    id: 'kn-3',
    category: 'knots',
    question: 'Which knot joins two lines of similar diameter?',
    choices: ['Clove hitch', 'Figure‑eight', 'Sheet bend', 'Trucker\'s hitch'],
    correctIndex: 2,
    explanation: 'A sheet bend securely joins two ropes, even of slightly different sizes.',
  },
  {
    id: 'kn-4',
    category: 'knots',
    question: 'A figure‑eight knot is primarily used as:',
    choices: [
      'A slip knot',
      'A stopper knot to prevent a line from running through a block',
      'A decorative knot',
      'An anchor tie',
    ],
    correctIndex: 1,
    explanation: 'The figure‑eight is the standard stopper knot in sailing.',
  },
]

/** Return a shuffled copy of the full question bank. */
export const getShuffledQuestions = (): BaselineQuestion[] => {
  const copy = [...questions]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const scoreAnswers = (
  questions: BaselineQuestion[],
  answers: Record<string, number>,
): { score: number; passed: boolean; total: number; correct: number } => {
  let correct = 0
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) {
      correct++
    }
  }
  const score = Math.round((correct / questions.length) * 100)
  return { score, passed: score >= PASS_THRESHOLD, total: questions.length, correct }
}
