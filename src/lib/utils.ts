import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  try {
    const _clsx = typeof clsx === 'function' ? clsx : (clsx as any)?.clsx || (clsx as any)?.default || clsx;
    const _twMerge = typeof twMerge === 'function' ? twMerge : (twMerge as any)?.twMerge || (twMerge as any)?.default || twMerge;
    
    if (typeof _clsx !== 'function') {
      return inputs.filter(Boolean).join(" ");
    }
    
    const merged = _clsx(...inputs);
    return typeof _twMerge === 'function' ? _twMerge(merged) : merged;
  } catch (e) {
    console.error("cn utility error:", e);
    return inputs.filter(Boolean).join(" ");
  }
}
