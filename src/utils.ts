import { Color } from "./middleware";

export function rgbaToHexArgb(color: Color): string {
    const toHex = (n: number) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `${toHex(color.a)}${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function filterNotNullish<T>(values: (T | undefined | null)[]): T[] {
    return values.filter((v): v is T => v !== null && v !== undefined);
}

export function hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) {
        return hash;
    }
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash * 31 + char) | 0; // Keep it a 32-bit integer
    }
    return hash;
}

export function escapeHtml(input: string): string {
    const map: { [key: string]: string } = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    const alreadyEscapedPattern = /&(?:amp|lt|gt|quot|#39|#96);/g;

    return input.replace(/[&<>"'`]/g, (char) => {
        return input.match(alreadyEscapedPattern) ? char : map[char];
    });
}
