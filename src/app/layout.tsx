import type { Metadata, Viewport } from "next";
import { Nunito, Lexend, Gowun_Batang } from "next/font/google";
import "./globals.css";
import { ThemeManager } from "@/components/shell/ThemeManager";
import { CloudSync } from "@/components/sync/CloudSync";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
  preload: false, // 읽기/다크 보조 폰트 — 첫 화면 미사용 시 preload 경고 방지
});
const gowun = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-gowun",
  display: "swap",
  // 한글 명조 — 유니코드 구간별 100+ woff2 조각이 전부 preload되어 "preloaded but not used"
  // 경고 118개를 유발. @font-face unicode-range로 필요한 조각만 on-demand 로드(display:swap)
  preload: false,
});

export const metadata: Metadata = {
  title: "EchoTale · 에코테일",
  description:
    "Read it. Hear it. Echo it. Speak it. — 영어 그림책으로 듣기·말하기가 터지는 낭독·쉐도잉 학습 앱",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "EchoTale", statusBarStyle: "default" },
  openGraph: {
    title: "EchoTale · 에코테일",
    description: "영어 그림책 낭독·쉐도잉 학습",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c9885",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/** 페인트 전 테마 적용(FOUC 방지) */
const noFlashScript = `
try {
  var s = (JSON.parse(localStorage.getItem('echotale-settings')||'{}').state)||{};
  var t = s.theme||'light';
  var dark = t==='dark' || (t==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var d = document.documentElement;
  d.classList.toggle('dark', dark);
  if (s.dyslexiaFont) d.setAttribute('data-dyslexia','true');
  if (s.fontScale) d.style.setProperty('--font-scale', String(s.fontScale));
} catch(e){}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body
        className={`${nunito.variable} ${lexend.variable} ${gowun.variable} antialiased`}
      >
        <ThemeManager />
        <CloudSync />
        {children}
      </body>
    </html>
  );
}
