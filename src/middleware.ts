export type ValueType = string | number | FontStyle | Color;

export type Reference<T = ValueType> = {
    type: "reference";
    readonly id: string;
    readonly name: string;
    readonly value: T;
};

export function isReference<T = ValueType>(v: NonNullable<T> | Reference<T>): v is Reference<T> {
    return (v as Reference)["type"] === "reference";
}

export function isFontStyle(v: any): v is FontStyle {
    return (v as FontStyle).type === "font";
}

export function isColor(v: any): v is Color {
    return (v as Color).type === "color";
}

export function getValue<T = ValueType>(v: NonNullable<T> | Reference<T>): T {
    if (isReference(v)) {
        return v.value;
    } else {
        return v;
    }
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

export type NodeBorder = {
    readonly color: Color | Reference<Color>;
    readonly width: number | Reference<number>;
};

export type NodeLayout = {
    readonly direction: "horizontal" | "vertical" | "none";
    readonly wrap: boolean;
    readonly primaryAxisSpacing: number | Reference<number>;
    readonly counterAxisSpacing?: number | Reference<number>;
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
    readonly color?: Color | Reference<Color>;
    readonly align: TextNode["textAlignHorizontal"];
    readonly truncation: TextNode["textTruncation"];
    readonly maxLines?: number;
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
 */
export async function getBackground(node: MinimalFillsMixin): Promise<NodeBackground | undefined> {
    if (node.fillStyleId !== figma.mixed && node.fillStyleId !== "") {
        const style = await figma.getStyleByIdAsync(node.fillStyleId);
        if (style?.type == "PAINT" && style.paints.length > 0 && style.paints[0].visible) {
            const color = getColor(style.paints[0]);
            if (color) {
                return {
                    color: ref(style.id, style.name, color),
                };
            }
        }
    } else if (node.fills !== figma.mixed && node.fills.length > 0 && node.fills[0].visible) {
        const color = getColor(node.fills[0]);
        if (color) {
            return {
                color: color,
            };
        }
    }
    return undefined;
}

/**
 * Retrieve the border of this node. Only supports simple solid borders.
 * Returns on all other cases undefined.
 */
export async function getBorder(node: MinimalStrokesMixin): Promise<NodeBorder | undefined> {
    if (node.strokeStyleId !== "") {
        const style = await figma.getStyleByIdAsync(node.strokeStyleId);
        if (
            style?.type == "PAINT" &&
            style.paints.length > 0 &&
            style.paints[0].visible &&
            node.strokeWeight !== figma.mixed
        ) {
            const color = getColor(style.paints[0]);
            if (color) {
                return {
                    color: ref(style.id, style.name, color),
                    width: node.strokeWeight,
                };
            }
        }
    } else if (node.strokes.length > 0 && node.strokes[0].visible && node.strokeWeight !== figma.mixed) {
        const color = getColor(node.strokes[0]);
        if (color) {
            return {
                color: color,
                width: node.strokeWeight,
            };
        }
    }
    return undefined;
}

async function tryResolveVariable<T = number | string>(
    node: SceneNodeMixin,
    alias: VariableAlias | undefined,
    fallback: T,
): Promise<T | Reference<T>> {
    if (!alias) return fallback;
    const variable = await figma.variables.getVariableByIdAsync(alias.id);
    if (variable && (variable.resolvedType === "FLOAT" || variable.resolvedType === "STRING")) {
        const modeId = node.resolvedVariableModes[variable.variableCollectionId];
        return {
            type: "reference",
            id: variable.id,
            name: variable.name,
            value: variable.valuesByMode[modeId] as T,
        };
    } else {
        return fallback;
    }
}

export async function getLayout(node: AutoLayoutMixin & SceneNodeMixin): Promise<NodeLayout | undefined> {
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
        primaryAxisSpacing: await tryResolveVariable(node, node.boundVariables?.itemSpacing, node.itemSpacing),
        counterAxisSpacing: node.counterAxisSpacing
            ? await tryResolveVariable(node, node.boundVariables?.counterAxisSpacing, node.counterAxisSpacing)
            : undefined,
        paddingBottom: await tryResolveVariable(node, node.boundVariables?.paddingBottom, node.paddingBottom),
        paddingLeft: await tryResolveVariable(node, node.boundVariables?.paddingLeft, node.paddingLeft),
        paddingRight: await tryResolveVariable(node, node.boundVariables?.paddingRight, node.paddingRight),
        paddingTop: await tryResolveVariable(node, node.boundVariables?.paddingTop, node.paddingTop),
    };
}

export async function getText(node: TextNode): Promise<NodeText | undefined> {
    if (node.textStyleId !== figma.mixed && node.textStyleId !== "" && node.fontWeight !== figma.mixed) {
        const style = await figma.getStyleByIdAsync(node.textStyleId);
        if (style?.type === "TEXT") {
            const color = await getBackground(node);
            return {
                text: node.characters,
                style: ref(style.id, style.name, {
                    type: "font",
                    fontSize: style.fontSize,
                    fontWeight: node.fontWeight,
                    textDecoration: style.textDecoration,
                    fontName: style.fontName,
                    letterSpacing: style.letterSpacing,
                    lineHeight: style.lineHeight,
                    textCase: style.textCase,
                }),
                color: color?.color,
                align: node.textAlignHorizontal,
                truncation: node.textTruncation,
                maxLines: node.maxLines ? node.maxLines : undefined,
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
        const color = await getBackground(node);
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
            color: color?.color,
            align: node.textAlignHorizontal,
            truncation: node.textTruncation,
            maxLines: node.maxLines ? node.maxLines : undefined,
        };
    }
}
