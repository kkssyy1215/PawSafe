import { createDefaultDeparture } from '@/src/features/walk/utils/dateTime';
import type { WalkFlowAction, WalkFlowState } from './walkFlowTypes';

export function createInitialWalkFlowState(): WalkFlowState {
  return {
    status: 'input',
    form: { origin: null, destination: null, departureAt: createDefaultDeparture(), walkMode: 'balanced' },
  };
}

export function walkFlowReducer(state: WalkFlowState, action: WalkFlowAction): WalkFlowState {
  switch (action.type) {
    case 'SET_PLACE':
      return state.status === 'input' ? { ...state, form: { ...state.form, [action.field]: action.place } } : state;
    case 'SET_DEPARTURE':
      return state.status === 'input' ? { ...state, form: { ...state.form, departureAt: action.value } } : state;
    case 'SET_WALK_MODE':
      return state.status === 'input' ? { ...state, form: { ...state.form, walkMode: action.value } } : state;
    case 'BEGIN_SUBMIT':
      return { status: 'submitting', request: action.request };
    case 'SUBMIT_SUCCESS':
      return state.status === 'submitting'
        ? { status: 'segmentReview', request: state.request, result: action.result, selectedSegmentId: null }
        : state;
    case 'SELECT_SEGMENT':
      return state.status === 'segmentReview' ? { ...state, selectedSegmentId: action.id } : state;
    case 'SHOW_COMPARISON':
      return state.status === 'segmentReview'
        ? { status: 'comparison', request: state.request, result: state.result }
        : state;
    case 'SHOW_SEGMENTS':
      return state.status === 'comparison'
        ? { status: 'segmentReview', request: state.request, result: state.result, selectedSegmentId: null }
        : state;
    case 'FAIL':
      return { status: 'error', request: 'request' in state ? state.request : undefined, error: action.error };
    case 'RETRY':
      return state.status === 'error' && state.request ? { status: 'submitting', request: state.request } : state;
    case 'RESET':
      return createInitialWalkFlowState();
    default:
      return state;
  }
}
