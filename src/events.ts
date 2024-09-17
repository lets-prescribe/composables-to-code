import { ComposeNode } from "./compose/types";
import { Settings, WindowSize } from "./types";
import { EventHandler } from "@create-figma-plugin/utilities";

export interface Resize extends EventHandler {
    name: "Resize";
    handler: (size: WindowSize) => void;
}

export interface SelectionChanged extends EventHandler {
    name: "SelectionChanged";
    handler: (node: ComposeNode | undefined) => void;
}

export interface SaveSettings extends EventHandler {
    name: "SaveSettings";
    handler: (settings: Settings) => void;
}

export interface Notify extends EventHandler {
    name: "Notify";
    handler: (message: string) => void;
}
