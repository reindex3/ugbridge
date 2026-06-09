export type TtsTextDirection = 'uey-to-uly' | 'uly-to-uey';

interface SpeakableUeyTextInput {
  direction: TtsTextDirection;
  input: string;
  output: string;
}

export function getSpeakableUeyText({
  direction,
  input,
  output,
}: SpeakableUeyTextInput) {
  return direction === 'uey-to-uly' ? input : output;
}
