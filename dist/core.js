// Pure game rules. Question seven is deliberately evaluated before correctness.
export const QUESTIONS = Object.freeze([
  { kind: 'balance', tag: 'Balance it', title: 'A little balancing act.', hint: 'Which number makes the two sides equal?', left: [3, 2], right: [], answer: 5, choices: [4, 5, 6, 7], equation: '3 + 2' },
  { kind: 'count', tag: 'Count together', title: 'A berry good question.', hint: 'How many berries are there altogether?', groups: [4, 3], answer: 7, choices: [5, 6, 7, 8], equation: '4 + 3' },
  { kind: 'hop', tag: 'Hop along', title: 'Three little hops back.', hint: 'Start at 9. Hop back 3. Where do you land?', start: 9, hops: 3, answer: 6, choices: [4, 5, 6, 7], equation: '9 − 3' },
  { kind: 'balance', tag: 'Find the missing number', title: 'Something is missing!', hint: 'Add a number to the right to balance the scale.', left: [8], right: [3], answer: 5, choices: [3, 4, 5, 6], equation: '3 + ? = 8', missing: true },
  { kind: 'groups', tag: 'Little groups', title: 'Better together.', hint: 'Three little pots. Two flowers in each. How many flowers?', groups: [2, 2, 2], answer: 6, choices: [4, 5, 6, 8], equation: '2 + 2 + 2' },
  { kind: 'pattern', tag: 'Spot the pattern', title: 'Keep the good thing growing.', hint: 'Each number grows by 2. What comes next?', sequence: [2, 4, 6], answer: 8, choices: [7, 8, 9, 10], equation: '2, 4, 6, ?' },
  { kind: 'balance', tag: 'One last little puzzle', title: 'You know what to do.', hint: 'Which number makes the two sides equal?', left: [4, 3], right: [], answer: 7, choices: [5, 6, 7, 8], equation: '4 + 3' }
]);

export function parseAnswer(value) {
  const text = String(value).trim();
  return /^\d{1,2}$/.test(text) ? Number(text) : null;
}

export function judge(index, value) {
  const answer = parseAnswer(value);
  if (answer === null || !QUESTIONS[index]) return 'empty';
  if (index === 6) return 'scare';
  return answer === QUESTIONS[index].answer ? 'correct' : 'retry';
}

export const SCARE_PHASES = Object.freeze([
  { at: 0, name: 'wrong-one', text: 'Wrong!' },
  { at: 1700, name: 'wrong-two', text: 'WRONG!' },
  { at: 3450, name: 'wrong-three', text: 'WRONG!!!!!!' },
  { at: 5500, name: 'silence', text: '' },
  { at: 6500, name: 'jump', text: '' },
  { at: 8300, name: 'after', text: '' },
  { at: 9400, name: 'finished', text: '' }
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
