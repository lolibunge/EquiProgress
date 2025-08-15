
export interface Exercise {
  name: string;
  description: string;
  duration?: string;
  reps?: string;
}

export interface TrainingPlan {
  id: string;
  category: 'Unbroke' | 'Retraining' | 'Continuing Training';
  name: string;
  description: string;
  duration: string;
  exercises: Exercise[];
}

export const trainingPlans: TrainingPlan[] = [
  {
    id: 'unbroke-1',
    category: 'Unbroke',
    name: 'Foundation Groundwork: Week 1-4',
    description: 'Establishing trust, respect, and basic communication on the ground. This is the essential starting point for any young or unhandled horse.',
    duration: '4 Weeks',
    exercises: [
      {
        name: 'Haltering & Leading',
        description: 'Teach the horse to accept a halter without fear and to lead willingly without pulling or lagging.',
        duration: '15 min/day',
      },
      {
        name: 'Grooming & Touch Desensitization',
        description: 'Accustom the horse to being touched and groomed all over its body, including legs, belly, and ears.',
        duration: '10 min/day',
      },
      {
        name: 'Yielding to Pressure',
        description: 'Teach the horse to move away from steady, gentle pressure on its poll, shoulder, and hindquarters.',
        duration: '10 min/day',
      },
      {
        name: 'Longeing for Respect',
        description: 'Introduce the longe line to teach the horse to move in a circle around the handler, respecting personal space and voice commands.',
        duration: '20 min, 3 times/week',
      },
    ],
  },
  {
    id: 'retraining-1',
    category: 'Retraining',
    name: 'Back to Basics: Under Saddle',
    description: 'Re-establishing clear communication and correct responses under saddle for a horse that may have gaps in its training or has developed bad habits.',
    duration: '6 Weeks',
    exercises: [
      {
        name: 'Flexion & Softness',
        description: 'From a standstill and walk, ask the horse to soften its jaw and flex its neck laterally and vertically in response to gentle rein pressure.',
        duration: '10 min/session',
      },
      {
        name: 'Go, Whoa, and Turn',
        description: 'Focus on crisp, immediate responses to seat and leg aids for upward transitions and clean halt transitions from the seat. Steer with legs and seat, not just reins.',
        duration: '20 min/session',
      },
      {
        name: 'Basic Bending on a Circle',
        description: 'Ride large 20-meter circles at the walk and trot, ensuring the horse is bent correctly from poll to tail along the arc of the circle.',
        duration: '15 min/session',
      },
      {
        name: 'Introduction to Leg Yield',
        description: 'At the walk, teach the horse to move sideways away from leg pressure, starting along the arena wall.',
        duration: '10 min/session',
      },
    ],
  },
  {
    id: 'continuing-1',
    category: 'Continuing Training',
    name: 'Improving Suppleness & Collection',
    description: 'For the established horse, this plan focuses on developing more advanced lateral movements and improving self-carriage and engagement.',
    duration: 'Ongoing',
    exercises: [
      {
        name: 'Shoulder-in',
        description: 'Ride with the horse\'s shoulders displaced to the inside of the track, maintaining a consistent bend and angle. Improves collection and engagement of the inside hind leg.',
        reps: '4-6 times down the long side each direction',
      },
      {
        name: 'Haunches-in (Travers)',
        description: 'Ride with the horse\'s hindquarters displaced to the inside of the track. Complements the shoulder-in and improves suppleness through the back.',
        reps: '4-6 times down the long side each direction',
      },
      {
        name: 'Walk-Canter-Walk Transitions',
        description: 'Develops balance and power from the hind end. Focus on a clean, direct transition without trot steps.',
        reps: '8-10 transitions per session',
      },
      {
        name: 'Counter-Canter',
        description: 'Purposefully cantering on the "wrong" lead (e.g., right lead on a circle to the left). An excellent exercise for improving balance, straightness, and the quality of the true canter.',
        duration: '2-3 loops each direction',
      },
    ],
  },
];
