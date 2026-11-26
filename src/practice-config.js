import { BASIC_TEMPLATE_IDS } from './music.js';

export function createDefaultPracticeConfig() {
  return {
    mode: 'forward',
    duration: 0,
    questionCount: 10,
    templateIds: [...BASIC_TEMPLATE_IDS],
    rootAccidentals: ['natural'],
  };
}
