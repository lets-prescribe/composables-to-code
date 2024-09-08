export type ValueType = string | number | FontStyle | Color;

export type Reference<T = ValueType> = {
    type: "reference";
    readonly id: string;
    readonly name: string;
    readonly value: T;
};

export function isReference(v: any | Reference): v is Reference {
    return v["type"] === "reference";
}

export function isFontStyle(v: any): v is FontStyle {
    return (v as FontStyle).type === "font";
}

export function isColor(v: any): v is Color {
    return (v as Color).type === "color";
}

function ref<T = ValueType>(id: string, name: string, value: T): Reference<T> {
    return {
        type: "reference",
        id,
        name,
        value,
    };
}

export type Color = {
    type: "color";
    r: number;
    g: number;
    b: number;
    a: number;
};

export type NodeBackground = {
    readonly color: Color | Reference<Color>;
};

export type NodeLayout = {
    readonly direction: "horizontal" | "vertical" | "none";
    readonly wrap: boolean;
    readonly gap: number | Reference<number>;
    readonly paddingLeft: number | Reference<number>;
    readonly paddingTop: number | Reference<number>;
    readonly paddingRight: number | Reference<number>;
    readonly paddingBottom: number | Reference<number>;
};

export type FontStyle = {
    type: "font";
    fontSize: number;
    fontWeight: number;
    textDecoration: TextDecoration;
    fontName: FontName;
    letterSpacing: LetterSpacing;
    lineHeight: LineHeight;
    textCase: TextCase;
};

export type NodeText = {
    readonly text: string;
    readonly style: FontStyle | Reference<FontStyle>;
};

function getColor(paint: Paint): Color | undefined {
    if (paint?.type === "SOLID") {
        return { ...paint.color, a: paint.opacity ?? 1, type: "color" };
    } else {
        return undefined;
    }
}

/**
 * Retrieve the background of this node. Only supports simple solid backgrounds.
 * Returns on all other cases undefined.
 * @param node the node with basic fill information.
 */
export async function getBackground(node: MinimalFillsMixin): Promise<NodeBackground | undefined> {
    if (node.fillStyleId !== figma.mixed && node.fillStyleId !== "") {
        const style = await figma.getStyleByIdAsync(node.fillStyleId);
        if (style?.type == "PAINT" && style.paints.length > 0) {
            const color = getColor(style.paints[0]);
            if (color) {
                return {
                    color: ref(style.id, style.name, color),
                };
            } else {
                return undefined;
            }
        }
    } else if (node.fills !== figma.mixed && node.fills.length > 0) {
        if (node.fills.length > 0) {
            const color = getColor(node.fills[0]);
            if (color) {
                return {
                    color: color,
                };
            } else {
                return undefined;
            }
        }
    } else {
        return undefined;
    }
}

export async function getLayout(node: AutoLayoutMixin): Promise<NodeLayout | undefined> {
    let direction: NodeLayout["direction"];
    switch (node.layoutMode) {
        case "HORIZONTAL":
            direction = "horizontal";
            break;
        case "VERTICAL":
            direction = "vertical";
            break;
        case "NONE":
            direction = "none";
            break;
        default:
            return undefined;
    }

    let wrap: NodeLayout["wrap"];
    switch (node.layoutWrap) {
        case "NO_WRAP":
            wrap = false;
            break;
        case "WRAP":
            wrap = true;
            break;
        default:
            return undefined;
    }

    return {
        direction,
        wrap,
        gap: node.itemSpacing,
        paddingBottom: node.paddingBottom,
        paddingLeft: node.paddingLeft,
        paddingRight: node.paddingRight,
        paddingTop: node.paddingTop,
    };
}

export async function getText(node: TextNode): Promise<NodeText | undefined> {
    if (node.textStyleId !== figma.mixed && node.textStyleId !== "" && node.fontWeight !== figma.mixed) {
        const style = await figma.getStyleByIdAsync(node.textStyleId);
        if (style?.type == "TEXT") {
            return {
                text: node.characters,
                style: ref(style.id, style.name, { ...style, fontWeight: node.fontWeight, type: "font" }),
            };
        } else {
            return undefined;
        }
    } else if (
        node.fontSize !== figma.mixed &&
        node.fontWeight !== figma.mixed &&
        node.textDecoration !== figma.mixed &&
        node.fontName !== figma.mixed &&
        node.letterSpacing !== figma.mixed &&
        node.lineHeight !== figma.mixed &&
        node.textCase !== figma.mixed
    ) {
        return {
            text: node.characters,
            style: {
                type: "font",
                fontSize: node.fontSize,
                fontWeight: node.fontWeight,
                textDecoration: node.textDecoration,
                fontName: node.fontName,
                letterSpacing: node.letterSpacing,
                lineHeight: node.lineHeight,
                textCase: node.textCase,
            },
        };
    }
}
