export interface WebVitalMetric {
  name: 'LCP' | 'FCP' | 'CLS' | 'INP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  entries: Record<string, unknown>[];
  timestamp: number;
  url?: string;
  userAgent?: string;
}

/**
 * A single resource timing entry collected via the Performance Resource Timing API.
 * Represents the fetch/load timing for a chunk resource (JS/CSS).
 */
export interface ResourceTimingData {
  /** Full URL of the resource */
  name: string;
  /** Resource type, e.g. 'script', 'link', 'css', 'fetch' */
  initiatorType: string;
  /** Time (ms) from navigation start to resource fetch start */
  startTime: number;
  /** Total duration (ms) of the resource load */
  duration: number;
  /** Size transferred over the network (bytes, 0 if cached) */
  transferSize: number;
  /** Decoded body size (bytes) */
  decodedBodySize: number;
  /** Encoded body size (bytes) */
  encodedBodySize: number;
  /** DNS lookup start */
  domainLookupStart: number;
  /** DNS lookup end */
  domainLookupEnd: number;
  /** TCP connect start */
  connectStart: number;
  /** TCP connect end */
  connectEnd: number;
  /** Request start */
  requestStart: number;
  /** Response start (TTFB for this resource) */
  responseStart: number;
  /** Response end */
  responseEnd: number;
  /** Whether the resource was fetched from the browser cache */
  fromCache: boolean;
  /** The protocol used (e.g. 'h2', 'http/1.1') */
  nextHopProtocol: string;
  /** Timestamp when this entry was collected */
  timestamp: number;
}

export interface RuntimePerfData {
  vitals: WebVitalMetric[];
  /** Resource timing entries for chunk resources (JS/CSS) */
  resourceTimings: ResourceTimingData[];
  url?: string;
  userAgent?: string;
}
