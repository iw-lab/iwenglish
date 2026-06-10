import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EchoTale · 에코테일",
    short_name: "EchoTale",
    description: "영어 그림책 낭독·쉐도잉 학습 — Read it. Hear it. Echo it. Speak it.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#7c9885",
    lang: "ko",
    orientation: "portrait",
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
