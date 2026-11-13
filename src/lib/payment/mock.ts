import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider } from "./types";

/**
 * Provider giả lập: không gọi dịch vụ ngoài. QR chứa payload giả,
 * thanh toán được xác nhận bằng nút "Tôi đã chuyển khoản (giả lập)"
 * gọi POST /api/mock-pay.
 */
export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      checkoutUrl: null,
      qrString: `MAMXANH-MOCK|order:${input.orderCode}|amount:${input.amount}|${input.description}`,
    };
  }
}
