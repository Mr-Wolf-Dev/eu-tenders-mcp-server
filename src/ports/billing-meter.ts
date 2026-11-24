export type BillingEventName = 'tender-extracted' | 'mcp-query';

export interface BillingMeter {
  charge(eventName: BillingEventName, count?: number): Promise<void>;
}
