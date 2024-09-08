import {
    ComposeColumnNode,
    ComposeModifier,
    ComposeNode,
    ComposePaddingModifier,
    ComposeRowNode,
    ComposeShape,
    ComposeTextNode,
} from "./types";
import { isColor, isReference, Reference, ValueType } from "../middleware";
import { rgbaToHexArgb } from "../utils";

function pad(n: number): string {
    return " ".repeat(n);
}

function refValue<T = ValueType>(value: T | Reference<T> | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (isReference(value)) {
        if (typeof value.value === "string") {
            return `"${value.value}"`;
        }
        if (typeof value.value === "number") {
            return value.value.toString() + ".dp";
        }
        if (isColor(value.value)) {
            return `Color("${rgbaToHexArgb(value.value)}")`;
        }
    } else {
        if (typeof value === "string") {
            return `"${value}"`;
        }
        if (typeof value === "number") {
            return value.toString() + ".dp";
        }
        if (isColor(value)) {
            return `Color("${rgbaToHexArgb(value)}")`;
        }
    }
    return undefined;
}

export class Render {
    private code: string = "";
    private indent: number = 0;

    private indentConfig: number = 4;

    private getInlineFunction(name: string, ...params: [string | undefined, string | undefined][]): string {
        const p = (params.filter(([, v]) => v) as [string | undefined, string][])
            .map(([k, v]) => {
                if (k) {
                    return `${k} = ${v}`;
                } else {
                    return v;
                }
            })
            .join(", ");

        return `${name}(${p})`;
    }

    private getShape(shape: ComposeShape): string {
        const radiusBottomRight = refValue(shape?.radiusBottomRight);
        const radiusBottomLeft = refValue(shape?.radiusBottomLeft);
        const radiusTopRight = refValue(shape?.radiusTopRight);
        const radiusTopLeft = refValue(shape?.radiusTopLeft);
        if (
            radiusBottomRight !== undefined &&
            radiusBottomRight === radiusBottomLeft &&
            radiusBottomRight === radiusTopRight &&
            radiusBottomRight === radiusTopLeft
        ) {
            // all identical
            return this.getInlineFunction("RoundedCornerShape", [undefined, radiusBottomRight]);
        } else {
            return this.getInlineFunction(
                "RoundedCornerShape",
                ["topStart", radiusTopLeft],
                ["topEnd", radiusTopRight],
                ["bottomEnd", radiusBottomRight],
                ["bottomStart", radiusBottomLeft],
            );
        }
    }

    private getPadding(padding: ComposePaddingModifier): string {
        const paddingLeft = refValue(padding?.paddingLeft);
        const paddingTop = refValue(padding?.paddingTop);
        const paddingRight = refValue(padding?.paddingRight);
        const paddingBottom = refValue(padding?.paddingBottom);
        if (
            paddingLeft !== undefined &&
            paddingLeft === paddingTop &&
            paddingLeft === paddingRight &&
            paddingLeft === paddingBottom
        ) {
            // all identical
            return this.getInlineFunction("padding", [undefined, paddingLeft]);
        } else if (paddingLeft == paddingRight && paddingTop == paddingBottom) {
            return this.getInlineFunction("padding", ["horizontal", paddingLeft], ["vertical", paddingTop]);
        } else {
            return this.getInlineFunction(
                "padding",
                ["start", paddingLeft],
                ["top", paddingTop],
                ["end", paddingRight],
                ["bottom", paddingBottom],
            );
        }
    }

    private addModifiers(modifiers: ComposeModifier[]) {
        if (modifiers.length === 0) return;
        const joinedModifiers = modifiers
            .map((modifier) => {
                if (modifier.name === "weight") {
                    return `weight(${modifier.weight})`;
                } else if (modifier.name === "background") {
                    const shape = modifier.shape ? this.getShape(modifier.shape) : undefined;
                    return this.getInlineFunction(
                        "background",
                        [undefined, refValue(modifier.color)],
                        [undefined, shape],
                    );
                } else if (modifier.name === "padding") {
                    return this.getPadding(modifier);
                } else if (modifier.name === "baseline") {
                    return "alignByBaseline()";
                }
            })
            .join(".");
        this.addParams(false, ["modifier", `Modifier.${joinedModifiers}`]);
    }

    private addRowParams(node: ComposeRowNode) {
        let arrangement: string | undefined;
        if (node.horizontalArrangement === "space_between") {
            arrangement = "Arrangement.SpaceBetween";
        } else if (node.horizontalArrangement === "center") {
            arrangement = "Arrangement.Center";
        } else if (node.horizontalArrangement === "start") {
            arrangement = "Arrangement.Start";
        } else if (node.horizontalArrangement === "end") {
            arrangement = "Arrangement.End";
        } else {
            const spacing = refValue(node.horizontalArrangement);
            if (spacing) {
                arrangement = `Arrangement.spacedBy(${spacing})`;
            }
        }
        if (arrangement) {
            this.addParams(false, ["horizontalArrangement", arrangement]);
        }
        let alignment: string | undefined;
        if (node.verticalAlignment === "top") {
            alignment = "Alignment.Start";
        } else if (node.verticalAlignment === "bottom") {
            alignment = "Alignment.End";
        } else if (node.verticalAlignment === "center") {
            alignment = "Alignment.CenterHorizontally";
        } else if (node.verticalAlignment === "baseline") {
            alignment = "Alignment.CenterHorizontally";
        }
        if (alignment) {
            this.addParams(false, ["verticalAlignment", alignment]);
        }
    }

    private addColumnParams(node: ComposeColumnNode) {
        let arrangement: string | undefined;
        if (node.verticalArrangement === "space_between") {
            arrangement = "Arrangement.SpaceBetween";
        } else if (node.verticalArrangement === "center") {
            arrangement = "Arrangement.Center";
        } else if (node.verticalArrangement === "top") {
            arrangement = "Arrangement.Top";
        } else if (node.verticalArrangement === "bottom") {
            arrangement = "Arrangement.Bottom";
        } else {
            const spacing = refValue(node.verticalArrangement);
            if (spacing) {
                arrangement = `Arrangement.spacedBy(${spacing})`;
            }
        }
        if (arrangement) {
            this.addParams(false, ["verticalArrangement", arrangement]);
        }
        let alignment: string | undefined;
        if (node.horizontalAlignment === "start") {
            alignment = "Alignment.Start";
        } else if (node.horizontalAlignment === "end") {
            alignment = "Alignment.End";
        } else if (node.horizontalAlignment === "center") {
            alignment = "Alignment.CenterHorizontally";
        }
        if (alignment) {
            this.addParams(false, ["horizontalAlignment", alignment]);
        }
    }

    private addTextParams(node: ComposeTextNode) {
        if (isReference(node.textStyle)) {
            this.addParams(false, ["style", node.textStyle.name]);
        } else {
            const style = node.textStyle;
            this.addOpenParam("style");
            this.addFunction("TextStyle", `${style.fontName}`, false, () => {
                this.addParams(
                    false,
                    ["fontWeight", `FontWeight(${style.fontWeight})`],
                    ["fontSize", `${style.fontSize}.sp`],
                    ["lineHeight", `${style.lineHeight}.sp`],
                );
            });
        }
        this.addParams(false, ["text", `"${node.text}"`]);
    }

    private addFunction(name: string, nodeName: string, inline: boolean, params: () => void) {
        const padding = inline ? "" : pad(this.indent);
        const lineEnding = inline ? "" : "\n";
        this.code += `${padding}// ${nodeName}${lineEnding}`;
        this.code += `${padding}${name}(${lineEnding}`;
        this.indent += inline ? 0 : this.indentConfig;
        params();
        this.indent -= inline ? 0 : this.indentConfig;
        this.code += `${padding})`;
    }

    private addParams(inline: boolean, ...params: [string, string][]) {
        const padding = inline ? "" : pad(this.indent);
        const lineEnding = inline ? "" : "\n";
        params.forEach(([k, v]) => {
            this.code += `${padding}${k} = ${v},${lineEnding}`;
        });
    }

    private addOpenParam(paramName: string) {
        this.code += `${paramName} = `;
    }

    private addBody(body: () => void) {
        const padding = pad(this.indent);
        this.code += ` {\n`;
        this.indent += this.indentConfig;
        body();
        this.indent -= this.indentConfig;
        this.code += `${padding}}\n`;
    }

    private addNewline() {
        this.code += "\n";
    }

    render(node: ComposeNode) {
        this.addFunction(node.name, node.nodeName, false, () => {
            this.addModifiers(node.modifiers);
            switch (node.name) {
                case "box":
                    break;
                case "row":
                    break;
                case "column":
                    this.addColumnParams(node);
                    break;
                case "text":
                    this.addTextParams(node);
                    break;
            }
        });
        switch (node.name) {
            case "box":
            case "row":
            case "column":
                if (node.children.length > 0) {
                    this.addBody(() => {
                        for (const child of node.children) {
                            this.render(child);
                        }
                    });
                } else {
                    this.addNewline();
                }
                break;
            default:
                this.addNewline();
                break;
        }
    }

    getCode(): string {
        return this.code;
    }
}
