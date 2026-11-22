// src/components/useAdvisor.ts
import { useEffect, useId, useSyncExternalStore } from 'react';
import { advisorBus, type AdvisorKind } from './advisorBus';

/** For the advisor: the warning/error that is on the board right now (or null). */
export function useAdvisorAlert() {
    return useSyncExternalStore(advisorBus.subscribe, advisorBus.getSnapshot, () => null);
}

/**
 * For a window (modal): "the advisor should repeat this text while it is true".
 * Pass null/'' when there is nothing to say. The message is withdrawn automatically when the text
 * becomes null, and when the window unmounts.
 *
 *   useAdvisorMessage(isOpen ? firstProblem : null, 'warning');
 */
export function useAdvisorMessage(text: string | null | undefined, kind: AdvisorKind = 'warning') {
    const id = useId();

    useEffect(() => {
        if (text) advisorBus.publish(id, { text, kind });
        else advisorBus.retract(id);
        return () => advisorBus.retract(id);
    }, [id, text, kind]);
}
