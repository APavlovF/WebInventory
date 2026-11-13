// src/features/shared/Combobox.tsx
// One dropdown used by all forms, styled with the app theme.
//  - allowCustom = false: a normal "pick one" dropdown (value = the picked option's value)
//  - allowCustom = true : a text field with suggestions; you can pick one OR type something new
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { inputStyle } from './modalStyles';

export interface ComboOption {
    value: string;   // what is stored when picked
    label: string;   // what the user sees
    hint?: string;   // small text on the right (e.g. unit of measurement)
    disabled?: boolean;
}

interface ComboboxProps {
    value: string;
    onChange: (value: string) => void;
    options: ComboOption[];
    placeholder?: string;
    allowCustom?: boolean;
    invalid?: boolean;
    maxLength?: number;
    style?: CSSProperties; // style of the outer wrapper (e.g. { flex: 3 })
}

export default function Combobox({
    value,
    onChange,
    options,
    placeholder,
    allowCustom = false,
    invalid = false,
    maxLength,
    style,
}: ComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // In "type or pick" mode the list is filtered by what was typed
    const visible = useMemo(() => {
        if (!allowCustom) return options;
        const q = value.trim().toLowerCase();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    }, [options, value, allowCustom]);

    const selected = options.find((o) => o.value === value);

    const open = () => {
        if (wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect());
        setIsOpen(true);
        setActiveIndex(-1);
    };

    const close = () => setIsOpen(false);

    const pick = (option: ComboOption) => {
        if (option.disabled) return;
        onChange(option.value);
        close();
    };

    // Close when clicking elsewhere, scrolling the page/list behind, or resizing
    useEffect(() => {
        if (!isOpen) return;

        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (wrapperRef.current?.contains(target) || listRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        const onScroll = (e: Event) => {
            if (listRef.current?.contains(e.target as Node)) return; // scrolling the list itself is fine
            setIsOpen(false);
        };
        const onResize = () => setIsOpen(false);

        document.addEventListener('mousedown', onMouseDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [isOpen]);

    const move = (direction: 1 | -1) => {
        if (visible.length === 0) return;
        let i = activeIndex === -1 && direction === -1 ? 0 : activeIndex;
        for (let n = 0; n < visible.length; n++) {
            i = (i + direction + visible.length) % visible.length;
            if (!visible[i].disabled) {
                setActiveIndex(i);
                return;
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) open();
            else move(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) open();
            else move(-1);
        } else if (e.key === 'Enter' && isOpen && activeIndex >= 0 && visible[activeIndex]) {
            e.preventDefault(); // pick the highlighted option instead of submitting the form
            pick(visible[activeIndex]);
        } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    };

    const borderColor = invalid ? '#f87171' : 'rgba(20, 184, 166, 0.4)';

    // Where to draw the list: right under the field, or above it when there is no room below
    let listStyle: CSSProperties | null = null;
    if (isOpen && rect && visible.length > 0) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < 200 && rect.top > spaceBelow;
        listStyle = {
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            zIndex: 1000,
            maxHeight: '180px',
            overflowY: 'auto',
            background: '#1e293b',
            border: '1px solid rgba(20, 184, 166, 0.5)',
            borderRadius: '4px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
            fontFamily: 'monospace',
            ...(openUp ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
        };
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', minWidth: 0, ...style }}>
            {allowCustom ? (
                <input
                    type="text"
                    value={value}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    autoComplete="off"
                    onChange={(e) => {
                        onChange(e.target.value);
                        if (!isOpen) open();
                        setActiveIndex(-1);
                    }}
                    onFocus={() => !isOpen && open()}
                    onClick={() => !isOpen && open()}
                    onKeyDown={handleKeyDown}
                    style={{ ...inputStyle, borderColor }}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => (isOpen ? close() : open())}
                    onKeyDown={handleKeyDown}
                    style={{
                        ...inputStyle,
                        borderColor,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left',
                        cursor: 'pointer',
                    }}
                >
                    <span
                        style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: selected ? '#f8fafc' : '#64748b',
                        }}
                    >
                        {selected ? selected.label : placeholder}
                    </span>
                    <span style={{ color: '#2dd4bf', marginLeft: '8px' }}>▾</span>
                </button>
            )}

            {listStyle &&
                createPortal(
                    <div ref={listRef} style={listStyle}>
                        {visible.map((o, i) => (
                            <div
                                key={o.value}
                                onMouseDown={(e) => e.preventDefault()} // keep focus in the field
                                onMouseEnter={() => !o.disabled && setActiveIndex(i)}
                                onClick={() => pick(o)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '8px 10px',
                                    fontSize: '14px',
                                    cursor: o.disabled ? 'not-allowed' : 'pointer',
                                    color: o.disabled ? '#475569' : o.value === value ? '#2dd4bf' : '#f8fafc',
                                    background:
                                        i === activeIndex && !o.disabled ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                                }}
                            >
                                <span>{o.label}</span>
                                {o.hint && <span style={{ color: '#64748b' }}>{o.hint}</span>}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}
