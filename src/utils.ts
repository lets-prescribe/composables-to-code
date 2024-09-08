import { Color } from "./middleware";

export function rgbaToHexArgb(color: Color): string {
    const toHex = (n: number) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(color.a)}${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function filterNotNullish<T>(values: (T | undefined | null)[]): T[] {
    return values.filter((v): v is T => v !== null && v !== undefined);
}
