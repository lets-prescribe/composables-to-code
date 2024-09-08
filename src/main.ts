import { on, showUI } from "@create-figma-plugin/utilities";
import { SaveSettings } from "./events";
import * as ComposeRender from "./compose/render";
import * as ComposeConverter from "./compose/converter";
import { MappingTable, traverseComposeNode } from "./compose/mapping";

export default function () {
    on<SaveSettings>("SAVE_SETTINGS", async (settings) => {
        await figma.clientStorage.setAsync("settings", settings);
    });

    figma.on("selectionchange", async () => {
        if (figma.currentPage.selection.length > 0) {
            const processedNode = await ComposeConverter.processNode(figma.currentPage.selection[0]);
            if (processedNode) {
                console.log(processedNode);
                const render = new ComposeRender.Render();
                render.render(processedNode);
                console.log(render.getCode());
                const table = new MappingTable();
                traverseComposeNode(table, processedNode);
                console.log(table);
            }
        }
    });

    figma.clientStorage.getAsync("settings").then((settings: any | undefined) => {
        // never had the plugin before
        if (settings === undefined) {
            settings = {};
        }
        showUI({ width: 320, height: 580 }, settings);
    });
}
