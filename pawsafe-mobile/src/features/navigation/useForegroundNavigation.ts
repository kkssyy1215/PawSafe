import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import type { Place, RouteStats } from '@/src/api/contracts';
import {
  getNextNavigationStep,
  distanceMeters,
  instructionWithDistance,
  matchPositionToRoute,
  prepareNavigationRoute,
  type NavigationStep,
} from './navigationEngine';

const OFF_ROUTE_THRESHOLD_M = 25;
const BACK_ON_ROUTE_THRESHOLD_M = 15;
const ARRIVAL_THRESHOLD_M = 10;

export type NavigationStatus = 'idle' | 'requesting' | 'active' | 'paused' | 'arrived' | 'error';

interface UseForegroundNavigationOptions {
  route: RouteStats | null;
  destination: Place | null;
  voiceEnabled: boolean;
}

export function useForegroundNavigation({ route, destination, voiceEnabled }: UseForegroundNavigationOptions) {
  const preparedRoute = useMemo(
    () => prepareNavigationRoute(route?.geometry.coordinates ?? []),
    [route?.geometry.coordinates],
  );
  const [status, setStatus] = useState<NavigationStatus>('idle');
  const [currentLocation, setCurrentLocation] = useState<Place | null>(null);
  const [currentInstruction, setCurrentInstruction] = useState('산책길 안내를 시작하면 현재 위치를 확인해요.');
  const [remainingDistanceM, setRemainingDistanceM] = useState(route?.distance_m ?? 0);
  const [remainingDurationMin, setRemainingDurationMin] = useState(route?.duration_min ?? 0);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const webUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const webSpeechStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webSpeechRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webSpeechGenerationRef = useRef(0);
  const watchGenerationRef = useRef(0);
  const statusRef = useRef<NavigationStatus>('idle');
  const voiceEnabledRef = useRef(voiceEnabled);
  const progressRef = useRef(0);
  const announcementStageRef = useRef<Record<string, number>>({});
  const offRouteCountRef = useRef(0);
  const offRouteAnnouncedRef = useRef(false);
  const isOffRouteRef = useRef(false);
  const lastInstructionRef = useRef('경로를 따라 출발하세요.');

  const updateStatus = useCallback((nextStatus: NavigationStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      webSpeechGenerationRef.current += 1;
      if (webSpeechStartTimerRef.current) clearTimeout(webSpeechStartTimerRef.current);
      if (webSpeechRetryTimerRef.current) clearTimeout(webSpeechRetryTimerRef.current);
      webSpeechStartTimerRef.current = null;
      webSpeechRetryTimerRef.current = null;
      window.speechSynthesis.cancel();
      webUtteranceRef.current = null;
      return;
    }
    void Speech.stop();
  }, []);

  const speak = useCallback((message: string, force = false) => {
    if (!voiceEnabledRef.current && !force) return;
    if (
      Platform.OS === 'web'
      && typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof SpeechSynthesisUtterance !== 'undefined'
    ) {
      const speechSynthesis = window.speechSynthesis;
      const generation = webSpeechGenerationRef.current + 1;
      webSpeechGenerationRef.current = generation;
      if (webSpeechStartTimerRef.current) clearTimeout(webSpeechStartTimerRef.current);
      if (webSpeechRetryTimerRef.current) clearTimeout(webSpeechRetryTimerRef.current);
      webSpeechStartTimerRef.current = null;
      webSpeechRetryTimerRef.current = null;

      const reportFailure = () => {
        if (webSpeechGenerationRef.current !== generation) return;
        setErrorMessage('브라우저에서 음성 안내가 시작되지 않았어요. 기기 음량과 브라우저의 사이트 소리 허용 상태를 확인한 뒤 안내 다시 듣기를 눌러 주세요.');
      };

      const runAttempt = (attempt: number) => {
        if (webSpeechGenerationRef.current !== generation) return;
        speechSynthesis.resume();
        let didStart = false;
        const utterance = new SpeechSynthesisUtterance(message);
        const voices = speechSynthesis.getVoices();
        const koreanVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ko'));
        if (koreanVoice) utterance.voice = koreanVoice;
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onstart = () => {
          if (webSpeechGenerationRef.current !== generation) return;
          didStart = true;
          if (webSpeechStartTimerRef.current) clearTimeout(webSpeechStartTimerRef.current);
          webSpeechStartTimerRef.current = null;
          setErrorMessage(null);
        };
        utterance.onend = () => {
          if (webSpeechGenerationRef.current !== generation) return;
          if (webSpeechStartTimerRef.current) clearTimeout(webSpeechStartTimerRef.current);
          webSpeechStartTimerRef.current = null;
          if (webUtteranceRef.current === utterance) webUtteranceRef.current = null;
        };
        utterance.onerror = (event) => {
          if (webSpeechGenerationRef.current !== generation) return;
          if (webSpeechStartTimerRef.current) clearTimeout(webSpeechStartTimerRef.current);
          webSpeechStartTimerRef.current = null;
          if (webUtteranceRef.current === utterance) webUtteranceRef.current = null;
          if (event.error === 'canceled' || event.error === 'interrupted') return;
          if (!didStart && attempt < 2) {
            webSpeechRetryTimerRef.current = setTimeout(() => runAttempt(attempt + 1), 120);
            return;
          }
          reportFailure();
        };
        webUtteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
        webSpeechStartTimerRef.current = setTimeout(() => {
          if (webSpeechGenerationRef.current !== generation || didStart) return;
          utterance.onerror = null;
          speechSynthesis.cancel();
          webUtteranceRef.current = null;
          if (attempt < 2) {
            webSpeechRetryTimerRef.current = setTimeout(() => runAttempt(attempt + 1), 120);
          } else {
            reportFailure();
          }
        }, attempt === 1 ? 900 : 1_400);
      };

      // Calling cancel() while the engine is already idle can swallow the next
      // utterance in Chromium/WebKit. Only clear a genuinely active queue.
      const hasActiveSpeech = speechSynthesis.speaking || speechSynthesis.pending || Boolean(webUtteranceRef.current);
      if (hasActiveSpeech) {
        speechSynthesis.cancel();
        webSpeechRetryTimerRef.current = setTimeout(() => runAttempt(1), 120);
      } else {
        runAttempt(1);
      }
      return;
    }
    void Speech.stop();
    Speech.speak(message, { language: 'ko-KR', rate: 0.9, pitch: 1 });
  }, []);

  const vibrateForStep = useCallback((step: NavigationStep) => {
    if (step.type === 'left' || step.type === 'slight_left') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }
    if (step.type === 'right' || step.type === 'slight_right') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, 220);
      return;
    }
    if (step.type === 'uturn') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const finishNavigation = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    updateStatus('arrived');
    setRemainingDistanceM(0);
    setRemainingDurationMin(0);
    setCurrentInstruction('목적지에 도착했습니다.');
    lastInstructionRef.current = '목적지에 도착했습니다.';
    speak('목적지에 도착했습니다. 안전한 산책을 마쳤어요.');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [speak, updateStatus]);

  const handleLocation = useCallback((location: Location.LocationObject) => {
    if (!route || preparedRoute.totalDistanceM <= 0 || statusRef.current !== 'active') return;
    const position = { lat: location.coords.latitude, lng: location.coords.longitude };
    const reportedAccuracy = location.coords.accuracy;
    setAccuracyM(reportedAccuracy);
    setCurrentLocation({
      id: 'live-current-location',
      name: '현재 위치',
      address: 'GPS로 확인한 현재 위치',
      ...position,
    });

    const match = matchPositionToRoute(preparedRoute, position);
    if (!match) return;

    const trustworthyForRouteCheck = reportedAccuracy === null || reportedAccuracy <= 35;
    if (trustworthyForRouteCheck && match.distanceToRouteM > OFF_ROUTE_THRESHOLD_M) {
      offRouteCountRef.current += 1;
      if (offRouteCountRef.current >= 3 && !offRouteAnnouncedRef.current) {
        offRouteAnnouncedRef.current = true;
        isOffRouteRef.current = true;
        setIsOffRoute(true);
        const message = '경로에서 벗어났습니다. 지도에서 경로를 다시 확인해 주세요.';
        setCurrentInstruction(message);
        lastInstructionRef.current = message;
        speak(message);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else if (match.distanceToRouteM <= BACK_ON_ROUTE_THRESHOLD_M) {
      offRouteCountRef.current = 0;
      if (offRouteAnnouncedRef.current) speak('안내 경로로 돌아왔습니다.');
      offRouteAnnouncedRef.current = false;
      isOffRouteRef.current = false;
      setIsOffRoute(false);
    }

    const positionIsOnRoute = !trustworthyForRouteCheck || match.distanceToRouteM <= OFF_ROUTE_THRESHOLD_M;
    if (positionIsOnRoute) progressRef.current = Math.max(progressRef.current, match.distanceAlongRouteM);
    const geometryProgress = progressRef.current;
    const geometryRemaining = Math.max(0, preparedRoute.totalDistanceM - geometryProgress);
    const routeRatio = preparedRoute.totalDistanceM > 0 ? geometryRemaining / preparedRoute.totalDistanceM : 0;
    setRemainingDistanceM(route.distance_m * routeRatio);
    setRemainingDurationMin(Math.max(0, route.duration_min * routeRatio));

    const distanceToDestination = distanceMeters(position, { lat: destination?.lat ?? position.lat, lng: destination?.lng ?? position.lng });
    if (distanceToDestination <= ARRIVAL_THRESHOLD_M || (positionIsOnRoute && geometryRemaining <= ARRIVAL_THRESHOLD_M)) {
      finishNavigation();
      return;
    }

    const nextStep = getNextNavigationStep(preparedRoute, geometryProgress);
    if (!nextStep) return;
    const distanceToStep = Math.max(0, nextStep.distanceFromStartM - geometryProgress);
    const instruction = instructionWithDistance(nextStep, distanceToStep);
    if (!isOffRouteRef.current) {
      setCurrentInstruction(instruction);
      lastInstructionRef.current = instruction;
    }

    const announcedStage = announcementStageRef.current[nextStep.id] ?? 0;
    const nextStage = distanceToStep <= 6 ? 3 : distanceToStep <= 15 ? 2 : distanceToStep <= 40 ? 1 : 0;
    if (nextStage > announcedStage) {
      announcementStageRef.current[nextStep.id] = nextStage;
      speak(instruction);
      if (nextStage === 3) vibrateForStep(nextStep);
    }
  }, [destination, finishNavigation, preparedRoute, route, speak, vibrateForStep]);

  const beginWatching = useCallback(async () => {
    if (!route || preparedRoute.coordinates.length < 2 || !destination) {
      setErrorMessage('안내할 경로 좌표를 찾지 못했습니다.');
      updateStatus('error');
      return;
    }
    const watchGeneration = watchGenerationRef.current + 1;
    watchGenerationRef.current = watchGeneration;
    try {
      const wasPaused = statusRef.current === 'paused';
      if (statusRef.current === 'arrived') {
        progressRef.current = 0;
        announcementStageRef.current = {};
        setRemainingDistanceM(route.distance_m);
        setRemainingDurationMin(route.duration_min);
      }
      updateStatus('requesting');
      setErrorMessage(null);
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (watchGenerationRef.current !== watchGeneration) return;
      if (!servicesEnabled) throw new Error('기기의 위치 서비스를 켜 주세요.');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (watchGenerationRef.current !== watchGeneration) return;
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error('실시간 안내를 사용하려면 위치 권한을 허용해 주세요.');
      }
      subscriptionRef.current?.remove();
      updateStatus('active');
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1_000 },
        handleLocation,
      );
      if (watchGenerationRef.current !== watchGeneration) {
        subscription.remove();
        return;
      }
      subscriptionRef.current = subscription;
      const startMessage = wasPaused
        ? '음성 경로 안내를 계속합니다.'
        : '음성 경로 안내를 시작합니다. 경로를 따라 출발하세요.';
      setCurrentInstruction('경로를 따라 출발하세요.');
      lastInstructionRef.current = '경로를 따라 출발하세요.';
      speak(startMessage);
    } catch (error) {
      if (watchGenerationRef.current !== watchGeneration) return;
      const message = error instanceof Error ? error.message : '현재 위치를 확인하지 못했습니다.';
      setErrorMessage(message);
      setCurrentInstruction(message);
      updateStatus('error');
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [destination, handleLocation, preparedRoute, route, speak, updateStatus]);

  const pause = useCallback(() => {
    watchGenerationRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    stopSpeaking();
    updateStatus('paused');
    setCurrentInstruction('산책길 안내가 일시정지되었습니다.');
  }, [stopSpeaking, updateStatus]);

  const stop = useCallback(() => {
    watchGenerationRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    stopSpeaking();
    progressRef.current = 0;
    announcementStageRef.current = {};
    offRouteCountRef.current = 0;
    offRouteAnnouncedRef.current = false;
    isOffRouteRef.current = false;
    setIsOffRoute(false);
    updateStatus('idle');
  }, [stopSpeaking, updateStatus]);

  const repeatInstruction = useCallback(() => {
    speak(lastInstructionRef.current);
  }, [speak]);

  useEffect(() => {
    const wasEnabled = voiceEnabledRef.current;
    voiceEnabledRef.current = voiceEnabled;
    if (!voiceEnabled) stopSpeaking();
    else if (!wasEnabled && statusRef.current === 'active') {
      speak(`음성 안내를 켰습니다. ${lastInstructionRef.current}`, true);
    }
  }, [speak, stopSpeaking, voiceEnabled]);

  useEffect(() => {
    setRemainingDistanceM(route?.distance_m ?? 0);
    setRemainingDurationMin(route?.duration_min ?? 0);
  }, [route?.distance_m, route?.duration_min]);

  useEffect(() => () => {
    watchGenerationRef.current += 1;
    subscriptionRef.current?.remove();
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    status,
    currentLocation,
    currentInstruction,
    remainingDistanceM,
    remainingDurationMin,
    accuracyM,
    isOffRoute,
    voiceEnabled,
    errorMessage,
    start: beginWatching,
    resume: beginWatching,
    pause,
    stop,
    repeatInstruction,
  };
}
