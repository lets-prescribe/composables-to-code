import { EventHandler } from "@create-figma-plugin/utilities";
import { SelectedNode, Settings } from "./types";

export interface SelectionChanged extends EventHandler {
    name: "SELECTION_CHANGED";
    handler: (totalPixelSize: number, nodes: SelectedNode[], previewImages: Uint8Array[]) => void;
}

export interface SaveSettings extends EventHandler {
    name: "SAVE_SETTINGS";
    handler: (settings: Settings) => void;
}
