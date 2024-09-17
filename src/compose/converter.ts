import {
    NodeBackground,
    NodeBorder,
    NodeLayout,
    getBackground,
    getBorder,
    getLayout,
    getText,
    getValue,
} from "../middleware";
import { filterNotNullish } from "../utils";
import {
    ComposeBackgroundModifier,
    ComposeBaselineModifier,
    ComposeBorderModifier,
    ComposeBoxNode,
    ComposeColumnNode,
    ComposeFillMaxModifier,
    ComposeFlowRowNode,
    ComposeModifier,
    ComposeNode,
    ComposePaddingModifier,
    ComposeRowNode,
    ComposeShape,
    ComposeSizeModifier,
    ComposeTextNode,
    ComposeWeightModifier,
} from "./types";

function extractPadding(layout: NodeLayout): ComposePaddingModifier | undefined {
    if (
        layout.paddingLeft === 0 &&
        layout.paddingTop === 0 &&
        layout.paddingRight === 0 &&
        layout.paddingBottom === 0
    ) {
        return undefined;
    }
    return {
        name: "padding",
        paddingLeft: layout.paddingLeft !== 0 ? layout.paddingLeft : undefined,
        paddingTop: layout.paddingTop !== 0 ? layout.paddingTop : undefined,
        paddingRight: layout.paddingRight !== 0 ? layout.paddingRight : undefined,
        paddingBottom: layout.paddingBottom !== 0 ? layout.paddingBottom : undefined,
    };
}

function extractWeightOrMaxWidthOrHeight(
    parentNode: Partial<ComposeNode> | undefined,
    layout: LayoutMixin,
): ComposeWeightModifier | ComposeFillMaxModifier | undefined {
    if (!parentNode) return undefined;
    if (parentNode.name === "box") return undefined;
    if (parentNode.name === "flowRow") return undefined;
    if (parentNode.name === "row") {
        if (layout.layoutSizingHorizontal === "FILL") {
            return {
                name: "weight",
                weight: 1,
            };
        }
        if (layout.layoutSizingVertical === "FILL") {
            return {
                name: "fill_max_width",
            };
        }
    }
    if (parentNode.name === "column") {
        if (layout.layoutSizingVertical === "FILL") {
            return {
                name: "weight",
                weight: 1,
            };
        }
        if (layout.layoutSizingHorizontal === "FILL") {
            return {
                name: "fill_max_width",
            };
        }
    }
    return undefined;
}

function extractBaseline(parentNode: Partial<ComposeNode> | undefined): ComposeBaselineModifier | undefined {
    if (!parentNode) return undefined;
    if (parentNode.name === "row" && parentNode.verticalAlignment === "baseline") {
        return {
            name: "baseline",
        };
    } else {
        return undefined;
    }
}

function extractBackground(background: NodeBackground, cornerRadius: RectangleCornerMixin): ComposeBackgroundModifier {
    let shape: ComposeShape | undefined;
    if (
        cornerRadius.topLeftRadius !== 0 ||
        cornerRadius.topRightRadius !== 0 ||
        cornerRadius.bottomLeftRadius !== 0 ||
        cornerRadius.bottomRightRadius !== 0
    ) {
        shape = {
            type: "rounded",
            radiusTopLeft: cornerRadius.topLeftRadius,
            radiusTopRight: cornerRadius.topRightRadius,
            radiusBottomRight: cornerRadius.bottomRightRadius,
            radiusBottomLeft: cornerRadius.bottomLeftRadius,
        };
    }

    const color = background.color;

    return {
        name: "background",
        color,
        shape,
    };
}

function extractBorder(border: NodeBorder, background?: ComposeBackgroundModifier): ComposeBorderModifier {
    return {
        name: "border",
        shape: background?.shape,
        width: border.width,
        color: border.color,
    };
}

function extractSize(layout: LayoutMixin): ComposeSizeModifier[] {
    let width: number | undefined;
    let height: number | undefined;
    if (layout.layoutSizingHorizontal === "FIXED") {
        width = layout.width;
    }
    if (layout.layoutSizingVertical === "FIXED") {
        height = layout.height;
    }
    if (width && width === height) {
        return [{ name: "size", value: width }];
    }
    let modifiers: ComposeSizeModifier[] = [];
    if (width) {
        modifiers = [...modifiers, { name: "width", value: width }];
    }
    if (height) {
        modifiers = [...modifiers, { name: "height", value: height }];
    }
    return modifiers;
}

const horizontalArrangementMapping: Record<
    AutoLayoutMixin["primaryAxisAlignItems"],
    ComposeRowNode["horizontalArrangement"]
> = {
    CENTER: "center",
    SPACE_BETWEEN: "space_between",
    MIN: "start",
    MAX: "end",
};

const horizontalAlignmentMapping: Record<
    AutoLayoutMixin["counterAxisAlignItems"],
    ComposeColumnNode["horizontalAlignment"]
> = {
    CENTER: "center",
    BASELINE: undefined,
    MIN: "start",
    MAX: "end",
};

const verticalArrangementMapping: Record<
    AutoLayoutMixin["primaryAxisAlignItems"],
    ComposeColumnNode["verticalArrangement"]
> = {
    CENTER: "center",
    SPACE_BETWEEN: "space_between",
    MIN: "top",
    MAX: "bottom",
};

const verticalAlignmentMapping: Record<AutoLayoutMixin["counterAxisAlignItems"], ComposeRowNode["verticalAlignment"]> =
    {
        CENTER: "center",
        BASELINE: "baseline",
        MIN: "top",
        MAX: "bottom",
    };

function columnLayout(
    layout: NodeLayout,
    node: AutoLayoutMixin,
): Omit<ComposeColumnNode, "modifiers" | "children" | "nodeName"> {
    const verticalArrangement = verticalArrangementMapping[node.primaryAxisAlignItems];
    const horizontalAlignment = horizontalAlignmentMapping[node.counterAxisAlignItems];
    return {
        name: "column",
        verticalArrangement:
            verticalArrangement === "space_between"
                ? verticalArrangement
                : getValue(layout.primaryAxisSpacing) > 0
                  ? layout.primaryAxisSpacing
                  : undefined,
        horizontalAlignment: horizontalAlignment,
    };
}

export function rowLayout(
    layout: NodeLayout,
    node: AutoLayoutMixin,
): Omit<ComposeRowNode, "modifiers" | "children" | "nodeName"> {
    const horizontalArrangement = horizontalArrangementMapping[node.primaryAxisAlignItems];
    const verticalAlignment = verticalAlignmentMapping[node.counterAxisAlignItems];
    return {
        name: "row",
        horizontalArrangement:
            horizontalArrangement === "space_between"
                ? horizontalArrangement
                : getValue(layout.primaryAxisSpacing) > 0
                  ? layout.primaryAxisSpacing
                  : undefined,
        verticalAlignment: verticalAlignment,
    };
}

export function flowRowLayout(
    layout: NodeLayout,
    node: AutoLayoutMixin,
): Omit<ComposeFlowRowNode, "modifiers" | "children" | "nodeName"> {
    const verticalArrangement = verticalArrangementMapping[node.primaryAxisAlignItems];
    const horizontalArrangement = horizontalArrangementMapping[node.primaryAxisAlignItems];
    return {
        name: "flowRow",
        horizontalArrangement:
            horizontalArrangement === "space_between"
                ? horizontalArrangement
                : getValue(layout.primaryAxisSpacing) > 0
                  ? layout.primaryAxisSpacing
                  : undefined,
        verticalArrangement:
            verticalArrangement === "space_between"
                ? verticalArrangement
                : layout.counterAxisSpacing
                  ? getValue(layout.counterAxisSpacing) > 0
                      ? layout.counterAxisSpacing
                      : undefined
                  : undefined,
    };
}

export function boxLayout(): Omit<ComposeBoxNode, "modifiers" | "children" | "nodeName"> {
    return {
        name: "box",
        alignment: undefined,
    };
}

async function processChildren(
    parentNode: Partial<ComposeNode> | undefined,
    node: ChildrenMixin,
): Promise<ComposeNode[]> {
    return filterNotNullish(await Promise.all(node.children.map(async (child) => await process(parentNode, child))));
}

async function layoutNode(
    parentNode: Partial<ComposeNode> | undefined,
    node: DefaultFrameMixin,
): Promise<ComposeNode | undefined> {
    const nodeBackground = await getBackground(node);
    const nodeBorder = await getBorder(node);
    const nodeLayout = await getLayout(node);
    if (!nodeLayout) return undefined;

    let modifiers: (ComposeModifier | undefined)[] = [
        ...extractSize(node),
        extractWeightOrMaxWidthOrHeight(parentNode, node),
    ];
    const backgroundModifier = nodeBackground ? extractBackground(nodeBackground, node) : undefined;
    const borderModifier = nodeBorder ? extractBorder(nodeBorder, backgroundModifier) : undefined;
    modifiers = [...modifiers, backgroundModifier, borderModifier, extractPadding(nodeLayout)];

    const hasMultipleChildren = node.children.length > 1;
    let composeNode: Omit<ComposeNode, "children">;
    if (hasMultipleChildren && nodeLayout.direction === "horizontal" && nodeLayout.wrap) {
        composeNode = {
            ...flowRowLayout(nodeLayout, node),
            modifiers: filterNotNullish(modifiers),
            nodeName: node.name,
        };
    } else if (hasMultipleChildren && nodeLayout.direction === "horizontal") {
        composeNode = {
            ...rowLayout(nodeLayout, node),
            modifiers: filterNotNullish(modifiers),
            nodeName: node.name,
        };
    } else if (hasMultipleChildren && nodeLayout.direction === "vertical") {
        composeNode = {
            ...columnLayout(nodeLayout, node),
            modifiers: filterNotNullish(modifiers),
            nodeName: node.name,
        };
    } else if (!hasMultipleChildren || nodeLayout.direction === "none") {
        composeNode = {
            ...boxLayout(),
            modifiers: filterNotNullish(modifiers),
            nodeName: node.name,
        };
    } else {
        return undefined;
    }

    return {
        ...composeNode,
        children: await processChildren(composeNode, node),
    } as ComposeNode;
}

const textAlignMapping: { [key in TextNode["textAlignHorizontal"]]: ComposeTextNode["textAlign"] } = {
    CENTER: "center",
    JUSTIFIED: "justify",
    LEFT: "start",
    RIGHT: "end",
};

async function textNode(
    parentNode: Partial<ComposeNode> | undefined,
    node: TextNode,
): Promise<ComposeTextNode | undefined> {
    const nodeText = await getText(node);
    if (!nodeText) return undefined;

    return {
        nodeName: node.name,
        name: "text",
        text: nodeText.text,
        textStyle: nodeText.style,
        textColor: nodeText.color,
        textAlign: nodeText.align !== "LEFT" ? textAlignMapping[nodeText.align] : undefined,
        overflow: nodeText.truncation === "ENDING" ? "ellipsis" : undefined,
        maxLines: nodeText.maxLines,
        children: [],
        modifiers: filterNotNullish([
            extractBaseline(parentNode),
            ...extractSize(node),
            extractWeightOrMaxWidthOrHeight(parentNode, node),
        ]),
    };
}

async function process(
    parentNode: Partial<ComposeNode> | undefined,
    node: SceneNode,
): Promise<ComposeNode | undefined> {
    if (!node.visible) return undefined;
    if (node.type == "FRAME" || node.type == "COMPONENT" || node.type == "INSTANCE") {
        return await layoutNode(parentNode, node);
    } else if (node.type == "TEXT") {
        return await textNode(parentNode, node);
    } else {
        return undefined;
    }
}

export async function processNode(node: SceneNode): Promise<ComposeNode | undefined> {
    return process(undefined, node);
}
