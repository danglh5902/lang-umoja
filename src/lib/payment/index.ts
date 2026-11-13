import { MockProvider } from "./mock";
import type { PaymentProvider } from "./types";

let cached: PaymentProvider | null = null;

export async function getPaymentProvider(): Promise<PaymentProvider> {
  if (cached) return cached;
  if (process.env.PAYMENT_PROVIDER === "payos") {
    const { PayOSProvider } = await import("./payos");
    cached = new PayOSProvider();
  } else {
    cached = new MockProvider();
  }
  return cached;
}

export function isMockPayment() {
  return process.env.PAYMENT_PROVIDER !== "payos";
}
