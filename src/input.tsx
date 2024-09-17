import { ComponentProps, h } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

export type EditableSpanProps = ComponentProps<"span"> & {
    value: string;
    onValueChange: (value: string) => void;
};
export const EditableSpan = ({ value, onValueChange, ...rest }: EditableSpanProps) => {
    const [cursor, setCursor] = useState<number | null>(null);
    const ref = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const selection = window.getSelection();
        if (!ref.current || !ref.current.firstChild || !cursor || !selection) return;
        const range = document.createRange();
        range.setStart(ref.current.firstChild, Math.min(cursor, ref.current.firstChild.textContent?.length ?? 0));
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
    }, [cursor, value]);

    function getSelectionRange(element: HTMLElement): { start: number; end: number } {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return { start: 0, end: 0 };
        }

        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(element);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);

        const start = preSelectionRange.toString().length;
        const end = start + range.toString().length;

        return { start, end };
    }

    function onInput() {
        if (!ref.current) return;
        setCursor(getSelectionRange(ref.current).start);
        onValueChange(ref.current.textContent ?? "");
    }

    return (
        <span {...rest} ref={ref} contentEditable={true} spellcheck={false} onInput={onInput}>
            {value}
        </span>
    );
};
