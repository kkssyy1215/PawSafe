import type { AppError } from '@/src/api/errors';
import type { Place, RouteAnalysisRequest, RouteAnalysisResponse, WalkMode } from '@/src/api/contracts';
import type { WalkConditionFormState } from '@/src/features/walk/utils/validation';

export type { WalkConditionFormState };

export type WalkFlowState =
  | { status: 'input'; form: WalkConditionFormState }
  | { status: 'submitting'; request: RouteAnalysisRequest }
  | { status: 'segmentReview'; request: RouteAnalysisRequest; result: RouteAnalysisResponse; selectedSegmentId: string | null; selectedRoute: 'shortest' | 'pawsafe' }
  | { status: 'comparison'; request: RouteAnalysisRequest; result: RouteAnalysisResponse; selectedRoute: 'shortest' | 'pawsafe' }
  | { status: 'error'; request?: RouteAnalysisRequest; error: AppError };

export type WalkFlowAction =
  | { type: 'SET_PLACE'; field: 'origin' | 'destination'; place: Place | null }
  | { type: 'SET_WALK_MODE'; value: WalkMode }
  | { type: 'BEGIN_SUBMIT'; request: RouteAnalysisRequest }
  | { type: 'SUBMIT_SUCCESS'; result: RouteAnalysisResponse }
  | { type: 'SELECT_SEGMENT'; id: string | null }
  | { type: 'SELECT_ROUTE'; route: 'shortest' | 'pawsafe' }
  | { type: 'SHOW_COMPARISON' }
  | { type: 'SHOW_SEGMENTS' }
  | { type: 'FAIL'; error: AppError }
  | { type: 'RETRY' }
  | { type: 'RESET' };
