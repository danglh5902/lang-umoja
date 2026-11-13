import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-X3Q400PBJC";

// Be Vietnam Pro: font được thiết kế riêng cho Tiếng Việt (dấu chồng, dấu móc hiển thị chuẩn)
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Playfair Display: font có chân cho phần dẫn truyện, hỗ trợ đầy đủ dấu Tiếng Việt
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mầm Xanh Umoja — Phá dự án rác AI, gieo lại màu xanh",
  description:
    "Ngôi làng Umoja đang bị những dự án rác AI hút cạn nước và chiếm hết đất. Góp một nhát búa phá dỡ, một ổ bánh mì — và mở ra thế giới mới cho lũ trẻ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Google Analytics — chỉ nạp ở môi trường online để dữ liệu thử không lẫn vào số liệu thật */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
