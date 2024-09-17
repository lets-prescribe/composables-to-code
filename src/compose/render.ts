import { wrapReferenceMapping } from "../mapping";
import { Reference, ValueType, isReference } from "../middleware";
import { ComposeMutableMappingTable } from "./mapping";
import {
    ComposeColumnNode,
    ComposeFlowRowNode,
    ComposeModifier,
    ComposeNode,
    ComposePaddingModifier,
    ComposeRowNode,
    ComposeShape,
    ComposeTextNode,
} from "./types";

function pad(n: number): string {
    return " ".repeat(n);
}

export class ComposeRender {
    private code: string = "";
    private indent: number = 0;

    private indentConfig: number = 4;

    private constructor(private table: ComposeMutableMappingTable) {}

    private transformValue<T = ValueType>(
        table: "padding" | "shape" | "color" | "text",
        value: T | Reference<T>,
    ): string | undefined {
        if (!value) return undefined;
        const mappingValue = this.table.addReference(table, value);
        if (!mappingValue) return undefined;
        return wrapReferenceMapping(mappingValue);
    }

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

        if (name[0] === name[0].toUpperCase()) {
            return `${name}(${p})`;
        } else {
            return `${name}(${p})`;
        }
    }

    private getShape(shape: ComposeShape): string {
        const radiusBottomRight = this.transformValue("shape", shape.radiusBottomRight);
        const radiusBottomLeft = this.transformValue("shape", shape.radiusBottomLeft);
        const radiusTopRight = this.transformValue("shape", shape.radiusTopRight);
        const radiusTopLeft = this.transformValue("shape", shape.radiusTopLeft);
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
        const paddingLeft = this.transformValue("padding", padding.paddingLeft);
        const paddingTop = this.transformValue("padding", padding.paddingTop);
        const paddingRight = this.transformValue("padding", padding.paddingRight);
        const paddingBottom = this.transformValue("padding", padding.paddingBottom);
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
                    return `weight(${modifier.weight}f)`;
                } else if (modifier.name === "fill_max_width") {
                    return `fillMaxWidth()`;
                } else if (modifier.name === "background") {
                    const shape = modifier.shape ? this.getShape(modifier.shape) : undefined;
                    return this.getInlineFunction(
                        "background",
                        [undefined, this.transformValue("color", modifier.color)],
                        [undefined, shape],
                    );
                } else if (modifier.name === "border") {
                    const shape = modifier.shape ? this.getShape(modifier.shape) : "RectangleShape";
                    return this.getInlineFunction(
                        "border",
                        [undefined, this.transformValue("shape", modifier.width)],
                        [undefined, this.transformValue("color", modifier.color)],
                        [undefined, shape],
                    );
                } else if (modifier.name === "padding") {
                    return this.getPadding(modifier);
                } else if (modifier.name === "baseline") {
                    return `alignByBaseline()`;
                } else if (modifier.name === "size") {
                    return `size(${this.transformValue("shape", modifier.value)})`;
                } else if (modifier.name === "width") {
                    return `width(${this.transformValue("shape", modifier.value)})`;
                } else if (modifier.name === "height") {
                    return `height(${this.transformValue("shape", modifier.value)})`;
                }
            })
            .join("\n.");
        this.addParams(false, ["modifier", `Modifier\n.${joinedModifiers}`]);
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
            const spacing = this.transformValue("padding", node.horizontalArrangement);
            if (spacing) {
                arrangement = `Arrangement.spacedBy(${spacing})`;
            }
        }
        if (arrangement) {
            this.addParams(false, ["horizontalArrangement", arrangement]);
        }
        let alignment: string | undefined;
        if (node.verticalAlignment === "top") {
            alignment = "Alignment.Top";
        } else if (node.verticalAlignment === "bottom") {
            alignment = "Alignment.Bottom";
        } else if (node.verticalAlignment === "center") {
            alignment = "Alignment.CenterVertically";
        } else if (node.verticalAlignment === "baseline") {
            alignment = undefined;
        }
        if (alignment) {
            this.addParams(false, ["verticalAlignment", alignment]);
        }
    }

    private addFlowRowParams(node: ComposeFlowRowNode) {
        let horizontalArrangement: string | undefined;
        if (node.horizontalArrangement === "space_between") {
            horizontalArrangement = "Arrangement.SpaceBetween";
        } else if (node.horizontalArrangement === "center") {
            horizontalArrangement = "Arrangement.Center";
        } else if (node.horizontalArrangement === "start") {
            horizontalArrangement = "Arrangement.Start";
        } else if (node.horizontalArrangement === "end") {
            horizontalArrangement = "Arrangement.End";
        } else {
            const spacing = this.transformValue("padding", node.horizontalArrangement);
            if (spacing) {
                horizontalArrangement = `Arrangement.spacedBy(${spacing})`;
            }
        }
        if (horizontalArrangement) {
            this.addParams(false, ["horizontalArrangement", horizontalArrangement]);
        }
        let verticalArrangement: string | undefined;
        if (node.verticalArrangement === "space_between") {
            verticalArrangement = "Arrangement.SpaceBetween";
        } else if (node.verticalArrangement === "center") {
            verticalArrangement = "Arrangement.Center";
        } else if (node.verticalArrangement === "top") {
            verticalArrangement = "Arrangement.Top";
        } else if (node.verticalArrangement === "bottom") {
            verticalArrangement = "Arrangement.Bottom";
        } else {
            const spacing = this.transformValue("padding", node.verticalArrangement);
            if (spacing) {
                verticalArrangement = `Arrangement.spacedBy(${spacing})`;
            }
        }
        if (verticalArrangement) {
            this.addParams(false, ["verticalArrangement", verticalArrangement]);
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
            const spacing = this.transformValue("padding", node.verticalArrangement);
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
            this.addParams(false, ["style", this.transformValue("text", node.textStyle)]);
        } else {
            const style = node.textStyle;
            this.addParams(false, [
                "style",
                () => {
                    this.addFunction("TextStyle", `${style.fontName.family} / ${style.fontName.style}`, false, () => {
                        const lineHeight = style.lineHeight.unit === "PIXELS" ? style.lineHeight.value : undefined;
                        this.addParams(
                            false,
                            ["fontWeight", `FontWeight(${style.fontWeight})`],
                            ["fontSize", `${style.fontSize}.sp`],
                            ["lineHeight", lineHeight ? `${lineHeight}.sp` : undefined],
                        );
                    });
                },
            ]);
        }
        this.addParams(false, ["text", `"${node.text.replace(/\n/g, "\\n")}"`]);
        this.addParams(false, ["color", this.transformValue("color", node.textColor)]);
        console.log(node);
        let alignment: string | undefined;
        if (node.textAlign === "start") {
            alignment = "TextAlign.Start";
        } else if (node.textAlign === "end") {
            alignment = "TextAlign.End";
        } else if (node.textAlign === "justify") {
            alignment = "TextAlign.Justify";
        } else if (node.textAlign === "center") {
            alignment = "TextAlign.Center";
        }
        this.addParams(false, ["textAlign", alignment]);
        this.addParams(false, ["overflow", node.overflow === "ellipsis" ? "TextOverflow.Ellipsis" : undefined]);
        this.addParams(false, ["maxLines", node.maxLines?.toString()]);
    }

    private truncate(name: string, maxLength: number): string {
        if (name.length > maxLength) {
            return name.substring(0, maxLength) + "...";
        } else {
            return name;
        }
    }

    private addFunction(name: string, nodeName: string, inline: boolean, params: () => void) {
        const padding = inline ? "" : pad(this.indent);
        const lineEnding = inline ? "" : "\n";
        this.code += `${padding}// ${this.truncate(nodeName, 80)}${lineEnding}`;
        this.code += `${padding}${name}(${lineEnding}`;
        this.indent += inline ? 0 : this.indentConfig;
        params();
        this.indent -= inline ? 0 : this.indentConfig;
        this.code += `${padding})`;
    }

    private addParams(inline: boolean, ...params: [string, string | (() => void) | undefined][]) {
        const padding = inline ? "" : pad(this.indent);
        const lineEnding = inline ? "" : "\n";
        params.forEach(([k, v]) => {
            if (!v) return;

            this.code += `${padding}${k} = `;
            if (typeof v === "function") {
                this.code += "\n";
                this.indent += this.indentConfig;
                v();
                this.indent -= this.indentConfig;
            } else {
                this.code += v.replace(/\n/gm, () => "\n" + pad(this.indent + this.indentConfig));
            }
            this.code += `,${lineEnding}`;
        });
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

    private addLineComment(comment: string) {
        const padding = pad(this.indent);
        this.code += `${padding}// ${comment}\n`;
    }

    private nameMapping: { [key in ComposeNode["name"]]: string } = {
        row: "Row",
        flowRow: "FlowRow",
        column: "Column",
        box: "Box",
        text: "Text",
    };

    private process(node: ComposeNode) {
        this.addFunction(this.nameMapping[node.name], node.nodeName, false, () => {
            this.addModifiers(node.modifiers);
            switch (node.name) {
                case "box":
                    break;
                case "row":
                    this.addRowParams(node);
                    break;
                case "flowRow":
                    this.addFlowRowParams(node);
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
            case "flowRow":
            case "column":
                this.addBody(() => {
                    if (node.children.length > 0) {
                        for (const child of node.children) {
                            this.process(child);
                        }
                    } else {
                        this.addLineComment("...");
                    }
                });
                break;
            default:
                this.addNewline();
                break;
        }
    }

    static render(table: ComposeMutableMappingTable, node: ComposeNode): string {
        const render = new ComposeRender(table);
        render.process(node);
        return render.code;
    }
}
