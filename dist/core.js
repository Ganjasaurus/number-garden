// Pure game rules. The fifth submission triggers the scare before correctness is checked.
export const SCARE_QUESTION = 4;
export const QUESTIONS = Object.freeze([
  { kind: 'balance', tag: 'Balance it', title: 'A little balancing act.', hint: 'Which number makes the two sides equal?', left: [3, 2], right: [], answer: 5, choices: [4, 5, 6, 7], equation: '3 + 2' },
  { kind: 'count', tag: 'Count together', title: 'A berry good question.', hint: 'How many berries are there altogether?', groups: [4, 3], answer: 7, choices: [5, 6, 7, 8], equation: '4 + 3' },
  { kind: 'hop', tag: 'Hop along', title: 'Three little hops back.', hint: 'Start at 9. Hop back 3. Where do you land?', start: 9, hops: 3, answer: 6, choices: [4, 5, 6, 7], equation: '9 − 3' },
  { kind: 'balance', tag: 'Find the missing number', title: 'Something is missing!', hint: 'Add a number to the right to balance the scale.', left: [8], right: [3], answer: 5, choices: [3, 4, 5, 6], equation: '3 + ? = 8', missing: true },
  { kind: 'groups', tag: 'Little groups', title: 'Better together.', hint: 'Three little pots. Two flowers in each. How many flowers?', groups: [2, 2, 2], answer: 6, choices: [4, 5, 6, 8], equation: '2 + 2 + 2' }
]);

export function parseAnswer(value) {
  const text = String(value).trim();
  return /^\d{1,2}$/.test(text) ? Number(text) : null;
}

export function judge(index, value) {
  const answer = parseAnswer(value);
  if (answer === null || !QUESTIONS[index]) return 'empty';
  if (index === SCARE_QUESTION) return 'scare';
  return answer === QUESTIONS[index].answer ? 'correct' : 'retry';
}

export const SCARE_PHASES = Object.freeze([
  { at: 0, name: 'jump' },
  { at: 2600, name: 'after' },
  { at: 3350, name: 'finished' }
]);

export function uiLayout(width, height) {
  const desktop = width >= 1000 && height >= 650;
  return { scale: desktop ? Math.max(1, Math.min(width / 1200, height / 820)) : 1, layout: width > height && height <= 650 ? 'landscape' : 'portrait' };
}

// Critically damped-ish spring, bounded steps so a resumed tab cannot explode.
export class Spring {
  constructor(value = 0) { this.value = value; this.target = value; this.velocity = 0; }
  step(dt) {
    const steps = Math.max(1, Math.ceil(Math.min(dt, .05) / .008));
    const step = Math.min(dt, .05) / steps;
    for (let i = 0; i < steps; i++) {
      this.velocity += ((this.target - this.value) * 140 - this.velocity * 13) * step;
      this.value += this.velocity * step;
    }
    const moving = Math.abs(this.value - this.target) > .015 || Math.abs(this.velocity) > .02;
    if (!moving) { this.value = this.target; this.velocity = 0; }
    return moving;
  }
}
