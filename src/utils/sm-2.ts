interface SmResponse {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

export default function calcSm({
  quality,
  repetitions,
  previousInterval,
  previousEaseFactor,
}: {
  quality: number;
  repetitions: number;
  previousInterval: number;
  previousEaseFactor: number;
}): SmResponse {
  let interval: number;
  let easeFactor: number;

  if (quality >= 3) {
    switch (repetitions) {
      case 0:
        interval = 1;
        break;
      case 1:
        interval = 6;
        break;
      default:
        interval = Math.round(previousInterval * previousEaseFactor);
    }

    repetitions++;
    easeFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }
  else {
    repetitions = 0;
    interval = 1;
    easeFactor = previousEaseFactor;
  }

  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { interval, repetitions, easeFactor };
}
