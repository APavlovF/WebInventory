// src/components/advisorBus.ts
// A tiny message board between the windows (modals) and the advisor.
// A window publishes its current warning/error here; the advisor shows the most important one.
// It is plain module code (no React context), so nothing has to be wired into MainFrame.
export type AdvisorKind = 'error' | 'warning' | 'info';

export interface AdvisorAlert {
    text: string;
    kind: AdvisorKind;
}

const PRIORITY: Record<AdvisorKind, number> = { error: 3, warning: 2, info: 1 };

const entries = new Map<string, AdvisorAlert>(); // one entry per publisher, in order of publication
const listeners = new Set<() => void>();
let snapshot: AdvisorAlert | null = null; // changes only when what the advisor must say changes

function recompute() {
    let best: AdvisorAlert | null = null;
    for (const alert of entries.values()) {
        // higher priority wins; on a tie the most recent one wins
        if (!best || PRIORITY[alert.kind] >= PRIORITY[best.kind]) best = alert;
    }
    if (best?.text !== snapshot?.text || best?.kind !== snapshot?.kind) {
        snapshot = best;
        listeners.forEach((listener) => listener());
    }
}

export const advisorBus = {
    publish(id: string, alert: AdvisorAlert) {
        entries.delete(id); // re-adding moves it to the end = "most recent"
        entries.set(id, alert);
        recompute();
    },
    retract(id: string) {
        if (entries.delete(id)) recompute();
    },
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    getSnapshot: (): AdvisorAlert | null => snapshot,
};
