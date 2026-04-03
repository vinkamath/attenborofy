export const PROCESSING_STEPS = [
  { key: "Validating", label: "Checking if Sir David would approve" },
  { key: "Analyzing", label: "Studying the footage intently" },
  { key: "Writing", label: "Calling Sir David Attenborough" },
  { key: "Generating", label: "Recording the telephone conversation" },
  { key: "Creating", label: "Deciphering what he said through the static" },
  { key: "Composing", label: "Posting the final tape via Royal Mail" },
];

export function getStepIndex(progress: string): number {
  for (let i = PROCESSING_STEPS.length - 1; i >= 0; i--) {
    if (progress.includes(PROCESSING_STEPS[i].key)) return i;
  }
  return -1;
}
