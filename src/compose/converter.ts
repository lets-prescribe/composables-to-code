import { getBackground, getLayout, getText, NodeBackground, NodeLayout } from "../middleware";
import {
    ComposeBackgroundModifier,
    ComposeBaselineModifier,
    ComposeBoxNode,
    ComposeColumnNode,
    ComposeModifier,
    ComposeNode,
    ComposePaddingModifier,
    ComposeRowNode,
    ComposeShape,
    ComposeTextNode,
    ComposeWeightModifier,
} from "./types";
import { filterNotNullish } from "../utils";

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

function extractWeight(
    parentNode: Partial<ComposeNode> | undefined,
    layout: LayoutMixin,
): ComposeWeightModifier | undefined {
    if (!parentNode) return undefined;
    if (parentNode.name === "box") return undefined;
    if (parentNode.name === "row" && layout.layoutSizingHorizontal !== "FILL") return undefined;
    if (parentNode.name === "column" && layout.layoutSizingVertical !== "FILL") return undefined;
    return {
        name: "weight",
        weight: 1,
    };
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

function columnLayout(node: AutoLayoutMixin): Omit<ComposeColumnNode, "modifiers" | "children" | "nodeName"> {
    const spacingMap: Record<AutoLayoutMixin["primaryAxisAlignItems"], ComposeColumnNode["verticalArrangement"]> = {
        CENTER: "center",
        SPACE_BETWEEN: "space_between",
        MIN: "top",
        MAX: "bottom",
    };
    const alignMap: Record<AutoLayoutMixin["counterAxisAlignItems"], ComposeColumnNode["horizontalAlignment"]> = {
        CENTER: "center",
        BASELINE: undefined,
        MIN: "start",
        MAX: "end",
    };
    return {
        name: "column",
        verticalArrangement: node.itemSpacing > 0 ? node.itemSpacing : spacingMap[node.primaryAxisAlignItems],
        horizontalAlignment: alignMap[node.counterAxisAlignItems],
    };
}

export function boxLayout(node: AutoLayoutMixin): Omit<ComposeBoxNode, "modifiers" | "children" | "nodeName"> {
    return {
        name: "box",
        alignment: undefined,
    };
}

export function rowLayout(node: AutoLayoutMixin): Omit<ComposeRowNode, "modifiers" | "children" | "nodeName"> {
    const spacingMap: Record<AutoLayoutMixin["primaryAxisAlignItems"], ComposeRowNode["horizontalArrangement"]> = {
        CENTER: "center",
        SPACE_BETWEEN: "space_between",
        MIN: "start",
        MAX: "end",
    };
    const alignMap: Record<AutoLayoutMixin["counterAxisAlignItems"], ComposeRowNode["verticalAlignment"]> = {
        CENTER: "center",
        BASELINE: "baseline",
        MIN: "top",
        MAX: "bottom",
    };
    return {
        name: "row",
        horizontalArrangement: node.itemSpacing > 0 ? node.itemSpacing : spacingMap[node.primaryAxisAlignItems],
        verticalAlignment: alignMap[node.counterAxisAlignItems],
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
    const nodeLayout = await getLayout(node);
    if (!nodeLayout) return undefined;

    let modifiers: (ComposeModifier | undefined)[] = [extractPadding(nodeLayout), extractWeight(parentNode, node)];
    if (nodeBackground) {
        modifiers = [...modifiers, extractBackground(nodeBackground, node)];
    }

    let composeNode: Omit<ComposeNode, "children">;
    if (nodeLayout.direction === "horizontal") {
        composeNode = {
            ...rowLayout(node),
            modifiers: filterNotNullish(modifiers),
            nodeName: node.name,
        };
    } else if (nodeLayout.direction === "vertical") {
        composeNode = {
            ...columnLayout(node),
            modifiers: filterNotNullish(modifiers),
            nodeName: node.name,
        };
    } else if (nodeLayout.direction === "none") {
        composeNode = {
            ...boxLayout(node),
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
        children: [],
        modifiers: filterNotNullish([extractBaseline(parentNode)]),
    };
}

async function process(
    parentNode: Partial<ComposeNode> | undefined,
    node: SceneNode,
): Promise<ComposeNode | undefined> {
    console.log(node.type);
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
