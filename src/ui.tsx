import { ComposeMutableMappingTable } from "./compose/mapping";
import { ComposeRender } from "./compose/render";
import { ComposeNode } from "./compose/types";
import { Notify, Resize, SaveSettings, SelectionChanged } from "./events";
import { EditableSpan } from "./input";
import { MappingTable, MappingTableCategory, MappingTableKey, replaceAllReferenceMappings } from "./mapping";
import selection from "./select.svg";
import styles from "./styles.css";
import { Settings, WindowSize } from "./types";
import { escapeHtml } from "./utils";
import { Banner, Bold, IconResetInstance32, IconWarning32, Text, Toggle, render } from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { ComponentChildren, Ref, h } from "preact";
import { forwardRef } from "preact/compat";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

function composeCodeTransform(code: string, showMappedValues: boolean): string {
    return replaceAllReferenceMappings(
        code,
        (v) =>
            // eslint-disable-next-line max-len
            `<span variableId=${v.id} class=${styles.code_variable}>${escapeHtml(showMappedValues ? v.value : v.name)}</span>`,
    )
        .replace(/\w+ =/g, (m) => `<span class=${styles.code_parameter}>${escapeHtml(m)}</span>`)
        .replace(/\.([a-z]\w+)\(/g, (_, m) => `.<span class=${styles.code_callable}>${escapeHtml(m)}</span>(`)
        .replace(/([A-Z]\w+)\(/g, (_, m) => `<span class=${styles.code_function}>${escapeHtml(m)}</span>(`)
        .replace(/[(){}.]/g, (m) => `<span class=${styles.code_symbol}>${m}</span>`);
}

function Main(settings: Settings) {
    const selectedNode = useRef<ComposeNode | undefined>(undefined);
    const [windowSize, setWindowSize] = useState<WindowSize>(settings.pluginWindowSize);
    const [configTable, setConfigTable] = useState<MappingTable>(() => {
        try {
            return MappingTable.fromConfig(settings.mappingConfig);
        } catch (error) {
            console.error(error);
            return MappingTable.empty();
        }
    });
    const [code, setCode] = useState("");
    const [showMappedValues, setShowMappedValues] = useState(settings.showMappedValues);

    useEffect(() => {
        emit<SaveSettings>("SaveSettings", {
            pluginWindowSize: windowSize,
            mappingConfig: configTable.getConfig(),
            showMappedValues: showMappedValues,
        });
    }, [configTable, windowSize, showMappedValues]);

    function handleResize(size: WindowSize) {
        setWindowSize(size);
        emit<Resize>("Resize", size);
    }

    useEffect(() => {
        const deleteSelectionChangedHandler = on<SelectionChanged>(
            "SelectionChanged",
            function (node: ComposeNode | undefined) {
                if (node) {
                    selectedNode.current = node;
                    const mutableMapping = new ComposeMutableMappingTable();
                    mutableMapping.merge(configTable, true);
                    const code = ComposeRender.render(mutableMapping, node);
                    setCode(code);
                    setConfigTable(mutableMapping.getFrozen());
                }
            },
        );

        return () => {
            deleteSelectionChangedHandler();
        };
    }, [configTable]);

    function changeConfig(table: MappingTable) {
        if (selectedNode.current) {
            const mutableMapping = new ComposeMutableMappingTable();
            mutableMapping.merge(table, true);
            const code = ComposeRender.render(mutableMapping, selectedNode.current);
            setCode(code);
            setConfigTable(mutableMapping.getFrozen());
        }
    }

    function resetConfig() {
        if (selectedNode.current) {
            const mutableMapping = new ComposeMutableMappingTable();
            const code = ComposeRender.render(mutableMapping, selectedNode.current);
            setCode(code);
            setConfigTable(mutableMapping.getFrozen());
        } else {
            setConfigTable(MappingTable.empty());
        }
    }

    const codeTransform = useCallback(
        (code: string) => {
            return composeCodeTransform(code, showMappedValues);
        },
        [showMappedValues],
    );

    const codeEditorRef = useRef<HTMLDivElement>(null);
    const configEditorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (codeEditorRef.current && configEditorRef.current) {
            const elements = codeEditorRef.current.querySelectorAll<HTMLSpanElement>("[variableId]");
            elements.forEach((el) => {
                el.onmouseenter = () => {
                    if (configEditorRef.current) {
                        const id = el.getAttribute("variableId");
                        configEditorRef.current
                            .querySelector<HTMLSpanElement>(`[variableId="${id}"]`)
                            ?.setAttribute("variableHover", "true");
                    }
                };
                el.onmouseleave = () => {
                    if (configEditorRef.current) {
                        const id = el.getAttribute("variableId");
                        configEditorRef.current
                            .querySelector<HTMLSpanElement>(`[variableId="${id}"]`)
                            ?.removeAttribute("variableHover");
                    }
                };
            });
        }

        return () => {
            if (codeEditorRef.current) {
                const elements = codeEditorRef.current.querySelectorAll<HTMLSpanElement>("[variableId]");
                elements.forEach((el) => {
                    el.onmouseenter = null;
                    el.onmouseleave = null;
                });
            }
        };
    }, [code, codeTransform]);

    return (
        <div id={styles.main_grid}>
            <CodePreview
                title={"Preview.kt"}
                code={code}
                transform={codeTransform}
                ref={codeEditorRef}
                headerComponents={
                    <Toggle onValueChange={setShowMappedValues} value={showMappedValues}>
                        <Text>Show Mapped Values</Text>
                    </Toggle>
                }
            />
            <ConfigEditor
                title={"config.ini"}
                table={configTable}
                onTableChange={changeConfig}
                onClickReset={resetConfig}
                ref={configEditorRef}
            />
            <ResizeHandle onResize={handleResize} />
        </div>
    );
}

type CodePreviewParams = {
    title: string;
    code: string;
    transform: (code: string) => string;
    headerComponents?: ComponentChildren;
};

function copyClipboard(text: string) {
    // Figma currently doesn't expose the navigator clipboard. So we fall back to the old api.
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
}

const CodePreview = forwardRef(
    ({ title, code, transform, headerComponents }: CodePreviewParams, ref?: Ref<HTMLDivElement>) => {
        const codeLineRef = useRef<HTMLDivElement>(null);
        const codeRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (codeRef.current && codeLineRef.current && code.length > 0) {
                codeRef.current.innerHTML = transform(code);
                codeLineRef.current.innerHTML = code
                    .split("\n")
                    .map((_, index) => `${index + 1}`)
                    .join("\n");
            }
        }, [code, transform]);

        const handleCopyClipboard = useCallback(() => {
            if (codeRef.current) {
                copyClipboard(codeRef.current.textContent!);
                emit<Notify>("Notify", `${title} copied to clipboard`);
            }
        }, [codeRef]);

        const isEmpty = code.length === 0;
        return (
            <div className={styles.code_preview} ref={ref}>
                <div className={styles.code_header}>
                    <Text>
                        <Bold>{title}</Bold>
                    </Text>
                    <div />
                    {headerComponents}
                    <div style={"flex-grow: 1;"} />
                    <button onClick={handleCopyClipboard} className={styles.button_primary} disabled={isEmpty}>
                        Copy
                    </button>
                </div>
                {!isEmpty ? (
                    <div className={styles.code_container}>
                        <code className={styles.code_line_number} ref={codeLineRef} />
                        <code className={styles.code_content} ref={codeRef} />
                    </div>
                ) : (
                    <div className={styles.code_empty}>
                        <div style="align-self: center; display: flex; flex-direction: column;">
                            <img style="height: 64px;" src={selection} alt="" />
                            <div style="font-family: monospace;">Select an object</div>
                        </div>
                    </div>
                )}
            </div>
        );
    },
);

type MappingEditorParams = {
    title: string;
    table: MappingTable;
    onTableChange: (table: MappingTable, action: "overwrite" | "edit") => void;
    onClickReset?: () => void;
    headerComponents?: ComponentChildren;
};

const ConfigEditor = forwardRef(
    (
        { title, table, onTableChange, onClickReset, headerComponents }: MappingEditorParams,
        ref?: Ref<HTMLDivElement>,
    ) => {
        const codeLineRef = useRef<HTMLDivElement>(null);
        const codeRef = useRef<HTMLDivElement>(null);

        const [history, setHistory] = useState<MappingTable[]>([]);
        const [errorState, setErrorState] = useState<string | undefined>(undefined);

        useEffect(() => {
            if (codeRef.current && codeLineRef.current && !table.isEmpty()) {
                codeLineRef.current.innerHTML = table
                    .getConfig()
                    .split("\n")
                    .map((_, index) => `${index + 1}`)
                    .join("\n");

                if (!history.at(-1)?.contentEquals(table)) {
                    setHistory([...history, table]);
                }

                setErrorState(undefined);
            }
        }, [table]);

        const undo = useCallback(() => {
            if (codeRef.current && history.length > 1) {
                onTableChange(history.at(-2)!, "overwrite");
                setHistory(history.slice(0, -2));
            }
        }, [history]);

        function handlePastedConfig(config: string) {
            try {
                onTableChange(MappingTable.fromConfig(config), "overwrite");
            } catch (e) {
                setErrorState((e as Error).message);
            }
        }

        const handleEdit = useCallback((table: MappingTable) => {
            onTableChange(table, "edit");
        }, []);

        const handleCopyClipboard = useCallback(() => {
            if (codeRef.current) {
                copyClipboard(codeRef.current.textContent!);
                emit<Notify>("Notify", `${title} copied to clipboard`);
            }
        }, [codeRef]);

        const handlePasteClipboard = useCallback(() => {
            if (codeRef.current) {
                // Figma currently doesn't expose the navigator clipboard. So we fall back to the old api.
                const textArea = document.createElement("textarea");
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand("paste");

                handlePastedConfig(textArea.value);

                document.body.removeChild(textArea);
            }
        }, [codeRef]);

        function onCodeDrop(event: DragEvent) {
            event.preventDefault();

            if (event.dataTransfer) {
                const droppedText = event.dataTransfer.getData("text");
                if (droppedText) {
                    handlePastedConfig(droppedText);
                }
            }
        }

        return (
            <div className={styles.code_preview} ref={ref}>
                <div className={styles.code_header}>
                    <Text>
                        <Bold>{title}</Bold>
                    </Text>
                    <div />
                    {headerComponents}
                    <button onClick={onClickReset} className={styles.button_icon_danger}>
                        <IconResetInstance32 />
                        &nbsp;Reset&nbsp;
                    </button>
                    <div style={"flex-grow: 1;"} />
                    <button onClick={undo} disabled={history.length <= 1}>
                        Undo
                    </button>
                    <button onClick={handlePasteClipboard}>Paste from Clipboard</button>
                    <button onClick={handleCopyClipboard} className={styles.button_primary}>
                        Copy
                    </button>
                </div>
                {errorState ? (
                    <Banner icon={<IconWarning32 />} variant="warning">
                        {errorState}
                    </Banner>
                ) : null}
                {!table.isEmpty() ? (
                    <div
                        className={styles.code_container}
                        onDragEnter={(e) => e.preventDefault()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onCodeDrop}
                    >
                        <code className={styles.code_line_number} ref={codeLineRef} />
                        <CodeContent ref={codeRef} table={table} onTableChange={handleEdit} />
                    </div>
                ) : (
                    <div className={styles.code_empty}>
                        <div style="align-self: center; display: flex; flex-direction: column;">
                            <img style="height: 64px;" src={selection} alt="" />
                            <div style="font-family: monospace;">Select an object</div>
                        </div>
                    </div>
                )}
            </div>
        );
    },
);

const CodeContent = forwardRef(
    (
        { table, onTableChange }: { table: MappingTable; onTableChange: (table: MappingTable) => void },
        ref?: Ref<HTMLElement>,
    ) => {
        const onConfigChange = useCallback(
            (key: MappingTableCategory, id: MappingTableKey, value: string) => {
                onTableChange(table.updateValue(key, id, value));
            },
            [table],
        );
        return (
            <code className={styles.code_content} ref={ref}>
                {Array.from(table).flatMap((entry, index) => {
                    switch (entry) {
                        case "padding":
                        case "shape":
                        case "color":
                        case "text":
                            return [
                                index > 0 ? "\n" : null,
                                <span key={entry} className={styles.code_function}>
                                    [{entry}]
                                </span>,
                                "\n",
                            ];
                        default:
                            return [
                                <span
                                    key={`name_${entry.id}`}
                                    {...{ variableId: entry.id }}
                                    className={styles.code_chip}
                                >
                                    {entry.name}
                                </span>,
                                " ",
                                <span key={`eq_${entry.id}`} className={styles.code_parameter}>
                                    =
                                </span>,
                                " ",
                                <EditableSpan
                                    key={`value_${entry.id}`}
                                    className={styles.editable_code_chip}
                                    value={entry.value}
                                    onValueChange={(v) => onConfigChange(entry.table, entry.id, v)}
                                />,
                                "\n",
                            ];
                    }
                })}
            </code>
        );
    },
);

const ResizeHandle = ({ onResize }: { onResize: (size: WindowSize) => void }) => {
    const handle = useRef<HTMLDivElement>(null);

    function onPointerDown(event: PointerEvent) {
        if (handle.current) {
            handle.current.setPointerCapture(event.pointerId);
        }
    }

    function onPointerMove(event: PointerEvent) {
        if (handle.current && handle.current.hasPointerCapture(event.pointerId)) {
            const size = handle.current.clientWidth;
            onResize({
                w: Math.max(800, Math.floor(event.clientX + size)),
                h: Math.max(400, Math.floor(event.clientY + size)),
            });
        }
    }

    function onPointerUp(event: PointerEvent) {
        if (handle.current) {
            handle.current.releasePointerCapture(event.pointerId);
        }
    }

    return (
        <div
            className={styles.resize_handle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            ref={handle}
        />
    );
};

// function DonateLogo() {
//     return (
//         <a id={styles.donate} href="https://ko-fi.com/webpgen" target="_blank" rel="noreferrer">
//             <img src={donateLogo} alt="Donate" />
//             Donate
//         </a>
//     );
// }

export default render(Main);
