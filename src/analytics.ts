type AnalyticsEvent = {
  name: string;
  params?: Record<string, string | number | boolean>;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

export function trackEvent({ name, params = {} }: AnalyticsEvent) {
  if (!measurementId || !window.gtag) return;
  window.gtag("event", name, params);
}

export function trackPageView() {
  if (!measurementId || !window.gtag) return;
  window.gtag("config", measurementId);
}
