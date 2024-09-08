import { ComposeNode, ComposeShape } from "./types";
import { isReference, Reference, ValueType } from "../middleware";

export class MappingTable {
    padding: Map<string, string> = new Map<string, string>();
    shape: Map<string, string> = new Map<string, string>();
    color: Map<string, string> = new Map<string, string>();
    text: Map<string, string> = new Map<string, string>();

    private mappingKey<T = ValueType>(value: T | Reference<T>): string | undefined {
        if (value && isReference(value)) {
            return value.name;
        } else {
            return undefined;
        }
    }

    addReference<T = ValueType>(table: "padding" | "shape" | "color" | "text", value: T | Reference<T>) {
        const key = this.mappingKey(value);
        if (!key) return;
        switch (table) {
            case "padding":
                this.padding.set(key, this.padding.get(key) ?? key);
                break;
            case "shape":
                this.shape.set(key, this.padding.get(key) ?? key);
                break;
            case "color":
                this.color.set(key, this.padding.get(key) ?? key);
                break;
            case "text":
                this.text.set(key, this.padding.get(key) ?? key);
                break;
        }
    }
}

function traverseComposeShape(table: MappingTable, shape: ComposeShape) {
    table.addReference("shape", shape.radiusTopLeft);
    table.addReference("shape", shape.radiusTopRight);
    table.addReference("shape", shape.radiusBottomLeft);
    table.addReference("shape", shape.radiusBottomRight);
}

export function traverseComposeNode(table: MappingTable, node: ComposeNode) {
    node.modifiers.forEach((modifier) => {
        switch (modifier.name) {
            case "background":
                table.addReference("color", modifier.color);
                if (modifier.shape) {
                    traverseComposeShape(table, modifier.shape);
                }
                break;
            case "padding":
                table.addReference("padding", modifier.paddingLeft);
                table.addReference("padding", modifier.paddingTop);
                table.addReference("padding", modifier.paddingRight);
                table.addReference("padding", modifier.paddingBottom);
                break;
        }
    });
    switch (node.name) {
        case "box":
            break;
        case "row":
            break;
        case "column":
            break;
        case "text":
            table.addReference("text", node.textStyle);
            break;
    }
    node.children.forEach((child) => traverseComposeNode(table, child));
}
