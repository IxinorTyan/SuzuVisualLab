export interface EasterEggResult {
  image: string;
  message: string | null;
}

let loopAttemptCount = 0;

export function getLoopEasterEgg(): EasterEggResult {
  loopAttemptCount++;

  if (loopAttemptCount === 1) {
    return {
      image: '/eg/no.svg',
      message: '不可以哦，会回绕的'
    };
  }

  if (loopAttemptCount === 2) {
    return {
      image: '/eg/what.svg',
      message: '回绕就会导致崩溃，绝对不可以'
    };
  }

  if (loopAttemptCount === 3) {
    return {
      image: '/eg/angry.svg',
      message: '说了不可以!!!'
    };
  }

  return {
    image: '/eg/angry.svg',
    message: null
  };
}

export function resetLoopEasterEggCounter(): void {
  loopAttemptCount = 0;
}
