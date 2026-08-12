import { createContext, useContext, useMemo, useReducer, type PropsWithChildren } from 'react';
import { createInitialWalkFlowState, walkFlowReducer } from './walkFlowReducer';
import type { WalkFlowAction, WalkFlowState } from './walkFlowTypes';

interface WalkFlowContextValue { state: WalkFlowState; dispatch: React.Dispatch<WalkFlowAction> }
const WalkFlowContext = createContext<WalkFlowContextValue | null>(null);

export function WalkFlowProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(walkFlowReducer, undefined, createInitialWalkFlowState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <WalkFlowContext.Provider value={value}>{children}</WalkFlowContext.Provider>;
}

export function useWalkFlow(): WalkFlowContextValue {
  const value = useContext(WalkFlowContext);
  if (!value) throw new Error('useWalkFlow must be used inside WalkFlowProvider');
  return value;
}
