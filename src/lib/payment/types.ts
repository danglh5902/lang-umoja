export interface CreatePaymentInput {
  orderCode: number;
  amount: number;
  description: string;
}

export interface CreatePaymentResult {
  /** URL trang thanh toán (PayOS); null với mock */
  checkoutUrl: string | null;
  /** Chuỗi VietQR (EMVCo) để render mã QR */
  qrString: string;
}

export interface PaymentProvider {
  readonly name: "mock" | "payos";
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
}
