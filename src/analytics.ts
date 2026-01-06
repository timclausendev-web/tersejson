/**
 * TerseJSON Analytics
 *
 * Opt-in analytics to track compression savings.
 * Data is anonymous and helps improve the library.
 */

/**
 * Compression event data
 */
export interface CompressionEvent {
  /** Timestamp of the compression */
  timestamp: number;
  /** Original payload size in bytes */
  originalSize: number;
  /** Compressed payload size in bytes */
  compressedSize: number;
  /** Number of objects in the array */
  objectCount: number;
  /** Number of keys compressed */
  keysCompressed: number;
  /** Route/endpoint (optional, anonymized) */
  endpoint?: string;
  /** Key pattern used */
  keyPattern: string;
}

/**
 * Aggregated stats for reporting
 */
export interface AnalyticsStats {
  /** Total compression events */
  totalEvents: number;
  /** Total bytes before compression */
  totalOriginalBytes: number;
  /** Total bytes after compression */
  totalCompressedBytes: number;
  /** Total bytes saved */
  totalBytesSaved: number;
  /** Average compression ratio (0-1) */
  averageRatio: number;
  /** Total objects processed */
  totalObjects: number;
  /** Session start time */
  sessionStart: number;
  /** Last event time */
  lastEvent: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /**
   * Enable analytics collection
   * @default false
   */
  enabled: boolean;

  /**
   * Send anonymous stats to tersejson.com
   * Helps improve the library
   * @default false
   */
  reportToCloud: boolean;

  /**
   * API key for tersejson.com (optional)
   * Get one at tersejson.com/dashboard
   */
  apiKey?: string;

  /**
   * Project/site identifier (optional)
   */
  projectId?: string;

  /**
   * Callback for each compression event
   * Use for custom logging/monitoring
   */
  onEvent?: (event: CompressionEvent) => void;

  /**
   * Callback for periodic stats summary
   */
  onStats?: (stats: AnalyticsStats) => void;

  /**
   * How often to report stats (ms)
   * @default 60000 (1 minute)
   */
  reportInterval?: number;

  /**
   * Include endpoint paths in analytics
   * Paths are hashed for privacy
   * @default false
   */
  trackEndpoints?: boolean;

  /**
   * Cloud reporting endpoint
   * @default 'https://api.tersejson.com/v1/analytics'
   */
  endpoint?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<AnalyticsConfig, 'apiKey' | 'projectId' | 'onEvent' | 'onStats'>> = {
  enabled: false,
  reportToCloud: false,
  reportInterval: 60000,
  trackEndpoints: false,
  endpoint: 'https://api.tersejson.com/v1/analytics',
  debug: false,
};

/**
 * Analytics collector class
 */
export class TerseAnalytics {
  private config: Required<Omit<AnalyticsConfig, 'apiKey' | 'projectId' | 'onEvent' | 'onStats'>> &
    Pick<AnalyticsConfig, 'apiKey' | 'projectId' | 'onEvent' | 'onStats'>;
  private events: CompressionEvent[] = [];
  private stats: AnalyticsStats;
  private reportTimer?: ReturnType<typeof setInterval>;
  private isNode: boolean;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isNode = typeof window === 'undefined';
    this.stats = this.createEmptyStats();

    if (this.config.enabled && this.config.reportToCloud) {
      this.startReporting();
    }
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): AnalyticsStats {
    return {
      totalEvents: 0,
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      totalBytesSaved: 0,
      averageRatio: 0,
      totalObjects: 0,
      sessionStart: Date.now(),
      lastEvent: Date.now(),
    };
  }

  /**
   * Record a compression event
   */
  record(event: Omit<CompressionEvent, 'timestamp'>): void {
    if (!this.config.enabled) return;

    const fullEvent: CompressionEvent = {
      ...event,
      timestamp: Date.now(),
      // Hash endpoint for privacy if tracking is enabled
      endpoint: this.config.trackEndpoints && event.endpoint
        ? this.hashEndpoint(event.endpoint)
        : undefined,
    };

    // Update stats
    this.stats.totalEvents++;
    this.stats.totalOriginalBytes += event.originalSize;
    this.stats.totalCompressedBytes += event.compressedSize;
    this.stats.totalBytesSaved += (event.originalSize - event.compressedSize);
    this.stats.totalObjects += event.objectCount;
    this.stats.lastEvent = fullEvent.timestamp;
    this.stats.averageRatio = this.stats.totalCompressedBytes / this.stats.totalOriginalBytes;

    // Store event for batch reporting
    this.events.push(fullEvent);

    // Call event callback
    if (this.config.onEvent) {
      this.config.onEvent(fullEvent);
    }

    // Debug logging
    if (this.config.debug) {
      const savings = ((1 - event.compressedSize / event.originalSize) * 100).toFixed(1);
      console.log(`[tersejson:analytics] ${event.originalSize} → ${event.compressedSize} bytes (${savings}% saved)`);
    }
  }

  /**
   * Get current stats
   */
  getStats(): AnalyticsStats {
    return { ...this.stats };
  }

  /**
   * Get formatted stats summary
   */
  getSummary(): string {
    const stats = this.stats;
    const savedKB = (stats.totalBytesSaved / 1024).toFixed(2);
    const savedPercent = stats.totalOriginalBytes > 0
      ? ((1 - stats.averageRatio) * 100).toFixed(1)
      : '0';

    return `TerseJSON Stats: ${stats.totalEvents} compressions, ${savedKB}KB saved (${savedPercent}% avg)`;
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.events = [];
    this.stats = this.createEmptyStats();
  }

  /**
   * Start periodic reporting to cloud
   */
  private startReporting(): void {
    if (this.reportTimer) return;

    this.reportTimer = setInterval(() => {
      this.reportToCloud();
    }, this.config.reportInterval);

    // Report on exit (Node.js only)
    if (this.isNode && typeof process !== 'undefined') {
      process.on('beforeExit', () => this.reportToCloud());
    }
  }

  /**
   * Stop reporting
   */
  stop(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  /**
   * Report stats to tersejson.com
   */
  private async reportToCloud(): Promise<void> {
    if (!this.config.reportToCloud || this.events.length === 0) return;

    const payload = {
      apiKey: this.config.apiKey,
      projectId: this.config.projectId,
      stats: this.stats,
      events: this.events.slice(-100), // Last 100 events only
      meta: {
        version: '0.1.0',
        runtime: this.isNode ? 'node' : 'browser',
      },
    };

    try {
      // Use appropriate fetch based on environment
      const fetchFn = this.isNode
        ? (await import('node:https')).request
        : globalThis.fetch;

      if (this.isNode) {
        // Node.js - fire and forget
        const url = new URL(this.config.endpoint);
        const req = (fetchFn as typeof import('node:https').request)({
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        req.write(JSON.stringify(payload));
        req.end();
      } else {
        // Browser
        (fetchFn as typeof fetch)(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true, // Allow sending on page unload
        }).catch(() => {}); // Ignore errors
      }

      // Clear reported events
      this.events = [];

      // Call stats callback
      if (this.config.onStats) {
        this.config.onStats(this.stats);
      }

      if (this.config.debug) {
        console.log('[tersejson:analytics] Reported stats to cloud');
      }
    } catch {
      // Silently fail - analytics should never break the app
      if (this.config.debug) {
        console.log('[tersejson:analytics] Failed to report stats');
      }
    }
  }

  /**
   * Hash endpoint for privacy
   */
  private hashEndpoint(endpoint: string): string {
    // Simple hash - just keeps route structure without specifics
    return endpoint
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
      .replace(/\?.*$/, '');
  }
}

/**
 * Global analytics instance (singleton)
 */
let globalAnalytics: TerseAnalytics | null = null;

/**
 * Initialize global analytics
 */
export function initAnalytics(config: Partial<AnalyticsConfig>): TerseAnalytics {
  globalAnalytics = new TerseAnalytics(config);
  return globalAnalytics;
}

/**
 * Get global analytics instance
 */
export function getAnalytics(): TerseAnalytics | null {
  return globalAnalytics;
}

/**
 * Record an event to global analytics (if initialized)
 */
export function recordEvent(event: Omit<CompressionEvent, 'timestamp'>): void {
  globalAnalytics?.record(event);
}

/**
 * Quick setup for common use cases
 */
export const analytics = {
  /**
   * Enable local-only analytics (no cloud reporting)
   */
  local(options: { debug?: boolean; onEvent?: AnalyticsConfig['onEvent'] } = {}) {
    return initAnalytics({
      enabled: true,
      reportToCloud: false,
      debug: options.debug,
      onEvent: options.onEvent,
    });
  },

  /**
   * Enable cloud analytics with API key
   */
  cloud(apiKey: string, options: Partial<AnalyticsConfig> = {}) {
    return initAnalytics({
      ...options,
      enabled: true,
      reportToCloud: true,
      apiKey,
    });
  },

  /**
   * Get current stats
   */
  getStats() {
    return globalAnalytics?.getStats() ?? null;
  },

  /**
   * Get formatted summary
   */
  getSummary() {
    return globalAnalytics?.getSummary() ?? 'Analytics not initialized';
  },
};

export default analytics;
