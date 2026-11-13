import { PayOS } from "@payos/node";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider } from "./types";

/**
 * Provider PayOS (sandbox hoặc production tùy API key trong .env).
 * Docs: https://payos.vn/docs — webhook được verify trong /api/webhooks/payos.
 */
export class PayOSProvider implements PaymentProvider {
  readonly name = "payos" as const;
  readonly client: PayOS;

  constructor() {
    this.client = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID!,
      apiKey: process.env.PAYOS_API_KEY!,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const site = process.env.SITE_URL ?? "http://localhost:3000";
    const res = await this.client.paymentRequests.create({
      orderCode: input.orderCode,
      amount: input.amount,
      // PayOS giới hạn description 25 ký tự
      description: input.description.slice(0, 25),
      returnUrl: `${site}/?paid=${input.orderCode}`,
      cancelUrl: `${site}/?cancelled=${input.orderCode}`,
    });
    return {
      checkoutUrl: res.checkoutUrl ?? null,
      qrString: res.qrCode ?? "",
    };
  }
}
