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

export type ComposeWeightModifier = {
    readonly name: "weight";
    readonly weight: number | Reference<number>;
};

export type ComposeBaselineModifier = {
    readonly name: "baseline";
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
    | ComposePaddingModifier
    | ComposeWeightModifier
    | ComposeBaselineModifier;

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
};

export type ComposeNode = ComposeRowNode | ComposeColumnNode | ComposeBoxNode | ComposeTextNode;
