import { MutableMappingTable } from "../mapping";
import { FontStyle, Reference, ValueType, getValue, isColor, isFontStyle } from "../middleware";
import { rgbaToHexArgb } from "../utils";

function createTextStyle(style: FontStyle): string {
    let lineHeight;
    if (style.lineHeight.unit === "PIXELS") {
        lineHeight = `${style.lineHeight.value}.sp`;
    } else if (style.lineHeight.unit === "PERCENT") {
        lineHeight = `${style.lineHeight.value / 100.0}.em`;
    } else {
        lineHeight = undefined;
    }
    const params = [
        ["fontWeight", `FontWeight(${style.fontWeight})`],
        ["fontSize", `${style.fontSize}.sp`],
        ["lineHeight", lineHeight],
    ]
        .filter(([, b]) => b !== undefined)
        .map(([a, b]) => `${a} = ${b}`)
        .join(", ");

    return `TextStyle(${params})`;
}

export class ComposeMutableMappingTable extends MutableMappingTable {
    transform<T = ValueType>(value: NonNullable<T> | Reference<T>): string {
        const v = getValue(value);
        if (typeof v === "string") {
            return `"${v}"`;
        }
        if (typeof v === "number") {
            return v.toString() + ".dp";
        }
        if (isColor(v)) {
            return `Color(0x${rgbaToHexArgb(v)})`;
        }
        if (isFontStyle(v)) {
            return createTextStyle(v);
        }
        throw new Error(`Unsupported value: ${value}`);
    }
}
