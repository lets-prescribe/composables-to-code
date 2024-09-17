import { Color, FontStyle, Reference } from "../middleware";

export type ComposeShape = {
    readonly type: "rounded";
    readonly radiusTopLeft: number | Reference<number>;
    readonly radiusTopRight: number | Reference<number>;
    readonly radiusBottomRight: number | Reference<number>;
    readonly radiusBottomLeft: number | Reference<number>;
};

export type ComposeBackgroundModifier = {
    readonly name: "background";
    readonly color: Color | Reference<Color>;
    readonly shape?: ComposeShape;
};

export type ComposeBorderModifier = {
    readonly name: "border";
    readonly color: Color | Reference<Color>;
    readonly shape?: ComposeShape;
    readonly width?: number | Reference<number>;
};

export type ComposeWeightModifier = {
    readonly name: "weight";
    readonly weight: number | Reference<number>;
};

export type ComposeFillMaxModifier = {
    readonly name: "fill_max_width" | "fill_max_height";
};

export type ComposeBaselineModifier = {
    readonly name: "baseline";
};

export type ComposeSizeModifier = {
    readonly name: "size" | "width" | "height";
    readonly value: number | Reference<number>;
};

export type ComposePaddingModifier = {
    readonly name: "padding";
    readonly paddingLeft?: number | Reference<number>;
    readonly paddingTop?: number | Reference<number>;
    readonly paddingRight?: number | Reference<number>;
    readonly paddingBottom?: number | Reference<number>;
};

export type ComposeModifier =
    | ComposeBackgroundModifier
    | ComposeBorderModifier
    | ComposePaddingModifier
    | ComposeWeightModifier
    | ComposeFillMaxModifier
    | ComposeBaselineModifier
    | ComposeSizeModifier;

export type ComposeBaseNode = {
    readonly nodeName: string;
    readonly modifiers: ComposeModifier[];
    readonly children: ComposeNode[];
};

export type ComposeRowNode = ComposeBaseNode & {
    readonly name: "row";
    readonly horizontalArrangement?: "space_between" | "center" | "start" | "end" | number | Reference<number>;
    readonly verticalAlignment?: "top" | "bottom" | "center" | "baseline";
};

export type ComposeFlowRowNode = ComposeBaseNode & {
    readonly name: "flowRow";
    readonly horizontalArrangement?: "space_between" | "center" | "start" | "end" | number | Reference<number>;
    readonly verticalArrangement?: "space_between" | "center" | "top" | "bottom" | number | Reference<number>;
};

export type ComposeColumnNode = ComposeBaseNode & {
    readonly name: "column";
    readonly verticalArrangement?: "space_between" | "center" | "top" | "bottom" | number | Reference<number>;
    readonly horizontalAlignment?: "start" | "end" | "center";
};

export type ComposeBoxNode = ComposeBaseNode & {
    readonly name: "box";
    readonly alignment?: "center";
};

export type ComposeTextNode = ComposeBaseNode & {
    readonly name: "text";
    readonly text: string;
    readonly textStyle: FontStyle | Reference<FontStyle>;
    readonly textColor?: Color | Reference<Color>;
    readonly textAlign?: "start" | "end" | "center" | "justify";
    readonly maxLines?: number;
    readonly overflow?: "ellipsis";
};

export type ComposeNode = ComposeRowNode | ComposeFlowRowNode | ComposeColumnNode | ComposeBoxNode | ComposeTextNode;
