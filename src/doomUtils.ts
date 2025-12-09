export interface DoomAlertConfig {
  label: string;
  showWhitelist: boolean;
}

export const getDoomAlertConfig = (dismissedOnce: boolean): DoomAlertConfig => {
  return dismissedOnce
    ? {
        label: 'DOOM SCROLL DETECTED — Block or Whitelist?',
        showWhitelist: true
      }
    : {
        label: 'DOOM SCROLL DETECTED',
        showWhitelist: false
      };
};

