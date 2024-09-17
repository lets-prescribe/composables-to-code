import * as ComposeConverter from "./compose/converter";
import { Notify, Resize, SaveSettings, SelectionChanged } from "./events";
import { WindowSize } from "./types";
import { emit, on, showUI } from "@create-figma-plugin/utilities";

export default function () {
    on<Resize>("Resize", async (size: WindowSize) => {
        figma.ui.resize(size.w, size.h);
    });

    on<SaveSettings>("SaveSettings", async (settings) => {
        await figma.clientStorage.setAsync("settings", settings);
    });

    on<Notify>("Notify", async (message) => {
        figma.notify(message);
    });

    figma.on("selectionchange", async () => {
        if (figma.currentPage.selection.length > 0) {
            const processedNode = await ComposeConverter.processNode(figma.currentPage.selection[0]);
            emit<SelectionChanged>("SelectionChanged", processedNode);
        }
    });

    // figma.clientStorage.deleteAsync("settings")
    //
    // return;

    figma.clientStorage.getAsync("settings").then((settings: any | undefined) => {
        // never had the plugin before
        if (settings === undefined) {
            settings = {};
        }
        // V0
        if (!("pluginWindowSize" in settings) || !("mappingConfig" in settings) || !("showMappedValues" in settings)) {
            settings = {
                pluginWindowSize: {
                    w: 800,
                    h: 600,
                },
                mappingConfig: "",
                showMappedValues: true,
            };
        }
        const windowSize = settings["pluginWindowSize"] as WindowSize;
        showUI({ width: windowSize.w, height: windowSize.h }, settings);
    });
}
