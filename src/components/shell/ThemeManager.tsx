"use client";

import { useEffect } from "react";
import { useSettings } from "@/store/settings";

/** zustand 설정을 <html> 속성/클래스에 반영 (테마·난독증폰트·글자크기) */
export function ThemeManager() {
  const theme = useSettings((s) => s.theme);
  const dyslexiaFont = useSettings((s) => s.dyslexiaFont);
  const fontScale = useSettings((s) => s.fontScale);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (dyslexiaFont) root.setAttribute("data-dyslexia", "true");
    else root.removeAttribute("data-dyslexia");
  }, [dyslexiaFont]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      String(fontScale),
    );
  }, [fontScale]);

  return null;
}
