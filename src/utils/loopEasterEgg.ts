import { Language } from '../i18n/translations';

export interface EasterEggResult {
  image: string;
  message: string | null;
}

let loopAttemptCount = 0;

export function getLoopEasterEgg(lang: Language = 'zh'): EasterEggResult {
  loopAttemptCount++;

  if (loopAttemptCount === 1) {
    return {
      image: '/eg/no.svg',
      message: lang === 'zh' ? '不可以哦，会回绕的' : 'No no no, that creates a loop!'
    };
  }

  if (loopAttemptCount === 2) {
    return {
      image: '/eg/what.svg',
      message: lang === 'zh' ? '回绕就会导致崩溃，绝对不可以' : 'Loops will cause a crash, absolutely not!'
    };
  }

  if (loopAttemptCount === 3) {
    return {
      image: '/eg/angry.svg',
      message: lang === 'zh' ? '说了不可以!!!' : 'I SAID NO!!!'
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
