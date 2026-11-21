// src/features/shared/Combobox.tsx
// One dropdown used by all forms, styled with the app theme.
//  - allowCustom = false: a normal "pick one" dropdown (value = the picked option's value)
//  - allowCustom = true : a text field with suggestions; you can pick one OR type something new
//  - searchable  = true : a text field that filters a long list as you type, but only a picked option
//                         sets the value (it shows the option's label). clearable adds a ✕ that sets ''.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { inputStyle } from './ModalStyles';
import { c, alpha } from '../../theme/themes';

// Lower-case and without accents, so "acai" finds "Açaí"
const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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
    searchable?: boolean;
    clearable?: boolean; // searchable only: show a ✕ to clear the picked option
    clearTitle?: string;
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
    searchable = false,
    clearable = false,
    clearTitle,
    invalid = false,
    maxLength,
    style,
}: ComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [query, setQuery] = useState(''); // what was typed in searchable mode
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const justOpenedOnFocus = useRef(false);

    // Filter options by typed query (searchable) or typed value (allowCustom)
    const visible = useMemo(() => {
        if (searchable) {
            const q = normalize(query);
            return q ? options.filter((o) => normalize(`${o.label} ${o.hint ?? ''}`).includes(q)) : options;
        }
        if (!allowCustom) return options;
        const q = value.trim().toLowerCase();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    }, [options, value, allowCustom, searchable, query]);

    const selected = options.find((o) => o.value === value);

    const open = () => {
        if (wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect());
        setIsOpen(true);
        setActiveIndex(-1);
        setQuery(''); // a searchable list always opens complete
    };

    const close = () => {
        setIsOpen(false);
        setQuery('');
    };

    const pick = (option: ComboOption) => {
        if (option.disabled) return;
        onChange(option.value);
        close();
    };

    const handleInputFocus = () => {
        if (!isOpen) {
            justOpenedOnFocus.current = true;
            open();
        }
    };

    const handleInputClick = () => {
        if (justOpenedOnFocus.current) {
            justOpenedOnFocus.current = false;
            return;
        }
        if (isOpen) {
            close();
        } else {
            open();
        }
    };

    // Close when clicking elsewhere, scrolling the page/list behind, or resizing
    useEffect(() => {
        if (!isOpen) return;

        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (wrapperRef.current?.contains(target) || listRef.current?.contains(target)) return;
            close();
        };
        const onScroll = (e: Event) => {
            if (listRef.current?.contains(e.target as Node)) return; // scrolling the list itself is fine
            close();
        };
        const onResize = () => close();

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
        } else if (e.key === 'Enter' && searchable && isOpen) {
            e.preventDefault(); // never submit the form from the search box; a single match is picked
            if (visible.length === 1) pick(visible[0]);
        } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    };

    const borderColor = invalid ? c.danger : alpha('accent', 0.4);

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
            scrollbarWidth: 'thin',
            scrollbarColor: `${alpha('accent', 0.5)} ${c.bgApp}`, // dark theme scrollbar
            background: c.bgSurface,
            border: `1px solid ${alpha('accent', 0.5)}`,
            borderRadius: '4px',
            boxShadow: `0 6px 16px ${alpha('overlay', 0.5)}`,
            fontFamily: 'monospace',
            ...(openUp ? { bottom: window.innerHeight - rect.top + 2 } : { top: rect.bottom + 2 }),
        };
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', minWidth: 0, ...style }}>
            {searchable ? (
                <>
                    <input
                        type="text"
                        value={isOpen ? query : selected?.label ?? ''}
                        placeholder={selected ? selected.label : placeholder}
                        autoComplete="off"
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!isOpen) open();
                            setActiveIndex(-1);
                        }}
                        onFocus={handleInputFocus}
                        onClick={handleInputClick}
                        onKeyDown={handleKeyDown}
                        style={{ ...inputStyle, borderColor, paddingRight: '32px', textOverflow: 'ellipsis' }}
                    />
                    {selected && clearable ? (
                        <button
                            type="button"
                            title={clearTitle}
                            aria-label={clearTitle}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onChange('');
                                close();
                            }}
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '22px',
                                height: '22px',
                                padding: 0,
                                border: 'none',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: c.textMuted,
                                cursor: 'pointer',
                            }}
                        >
                            ✕
                        </button>
                    ) : (
                        <span
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: c.accentBright,
                                pointerEvents: 'none',
                            }}
                        >
                            ▾
                        </span>
                    )}
                </>
            ) : allowCustom ? (
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
                    onFocus={handleInputFocus}
                    onClick={handleInputClick}
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
                            color: selected ? c.text : c.textMuted,
                        }}
                    >
                        {selected ? selected.label : placeholder}
                    </span>
                    <span aria-hidden="true" style={{ color: c.accentBright, marginLeft: '8px' }}>
                        ▾
                    </span>
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
                                    color: o.disabled ? c.border : o.value === value ? c.accentBright : c.text,
                                    background:
                                        i === activeIndex && !o.disabled ? alpha('accent', 0.15) : 'transparent',
                                }}
                            >
                                <span>{o.label}</span>
                                {o.hint && <span style={{ color: c.textMuted }}>{o.hint}</span>}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}
