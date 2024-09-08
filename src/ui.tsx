import {
    Button,
    Checkbox,
    Container,
    IconFrame32,
    MiddleAlign,
    Text,
    render,
    Textbox,
    VerticalSpace,
    Inline,
    Divider,
    Toggle,
    DropdownOption,
    Dropdown,
    Bold,
    RangeSlider,
    TextboxNumeric,
    Banner,
    IconWarning32,
    IconInfo32,
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import donateLogo from "./ko-fi-logo.png";
import { emit } from "@create-figma-plugin/utilities";
import { Settings } from "./types";
import { SaveSettings } from "./events";
import styles from "./styles.css";

function Preview(settings: Settings) {
    useEffect(() => {
        emit<SaveSettings>("SAVE_SETTINGS", {});
    }, []);

    // useEffect(() => {
    //   const deleteSelectionChangedHandler = on<SelectionChanged>(
    //     "SELECTION_CHANGED",
    //     function (
    //       totalPixelSize: number,
    //       nodes: SelectedNode[],
    //       previewImages: Uint8Array[],
    //     ) {
    //       setShowExportWarning(totalPixelSize > MaxPixelSize);
    //       setSelectedNodes(nodes);
    //       if (nodes.length === 0) {
    //         setPreviewImages([]);
    //         setFileName("");
    //       } else {
    //         setPreviewImages(previewImages);
    //         setOriginalFileName(nodes[0].name);
    //         setFileName(convertFileName(nodes[0].name, namingConvention));
    //       }
    //     },
    //   );
    //
    //   return () => {
    //     deleteSelectionChangedHandler();
    //   };
    // });
    //
    return <Container space="medium">{DonateLogo()}</Container>;
}

function DonateLogo() {
    return (
        <a id={styles.donate} href="https://ko-fi.com/webpgen" target="_blank" rel="noreferrer">
            <img src={donateLogo} alt="Donate" />
            Donate
        </a>
    );
}

export default render(Preview);
