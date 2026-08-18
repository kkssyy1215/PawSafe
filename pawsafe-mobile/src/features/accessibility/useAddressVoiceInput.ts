import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

export type AddressField = 'origin' | 'destination';

interface UseAddressVoiceInputOptions {
  enabled: boolean;
  onTranscript: (field: AddressField, transcript: string, isFinal: boolean) => void;
}

interface VoiceInputError {
  field: AddressField;
  message: string;
}

export function useAddressVoiceInput({ enabled, onTranscript }: UseAddressVoiceInputOptions) {
  const [activeField, setActiveField] = useState<AddressField | null>(null);
  const [error, setError] = useState<VoiceInputError | null>(null);
  const activeFieldRef = useRef<AddressField | null>(null);
  const receivedTranscriptRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  onTranscriptRef.current = onTranscript;

  const clearActiveField = useCallback(() => {
    activeFieldRef.current = null;
    setActiveField(null);
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const field = activeFieldRef.current;
    const transcript = event.results[0]?.transcript.trim();
    if (!field || !transcript) return;
    receivedTranscriptRef.current = true;
    onTranscriptRef.current(field, transcript, event.isFinal);
    if (event.isFinal) {
      // Continuous mode avoids an iOS 18+ session ending before the user has
      // time to speak. Once a final address is available, end it immediately.
      ExpoSpeechRecognitionModule.abort();
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    const field = activeFieldRef.current;
    clearStopTimer();
    if (event.error === 'aborted') {
      clearActiveField();
      return;
    }
    if (field) setError({ field, message: errorMessage(event.error) });
    clearActiveField();
  });

  useSpeechRecognitionEvent('nomatch', () => {
    const field = activeFieldRef.current;
    if (field) setError({ field, message: '주소를 인식하지 못했습니다. 마이크를 누르고 다시 말씀해 주세요.' });
  });

  useSpeechRecognitionEvent('end', () => {
    clearStopTimer();
    const field = activeFieldRef.current;
    if (field && !receivedTranscriptRef.current) {
      setError({ field, message: '음성을 인식하지 못했습니다. 마이크를 누르고 주소를 다시 말씀해 주세요.' });
    }
    clearActiveField();
  });

  const stop = useCallback(() => {
    clearStopTimer();
    if (activeFieldRef.current) ExpoSpeechRecognitionModule.stop();
  }, [clearStopTimer]);

  const start = useCallback(async (field: AddressField) => {
    if (!enabled) return;
    if (activeFieldRef.current === field) {
      stop();
      return;
    }
    if (activeFieldRef.current) return;
    receivedTranscriptRef.current = false;
    activeFieldRef.current = field;
    setActiveField(field);
    setError(null);
    try {
      // Wait until text-to-speech releases the iOS audio session before opening
      // the microphone. Calling both at once can make recognition end instantly.
      await Speech.stop();
      await delay(180);
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        throw new Error('이 기기에서 음성 인식을 사용할 수 없습니다.');
      }
      const currentPermission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (activeFieldRef.current !== field) return;
      if (!permission.granted) throw new Error('음성 입력을 사용하려면 마이크와 음성 인식 권한을 허용해 주세요.');
      if (!currentPermission.granted) await delay(350);
      ExpoSpeechRecognitionModule.start({
        lang: 'ko-KR',
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        // Prefer Apple's local Korean model when the device provides it. This
        // keeps address dictation working even when the Speech server is not
        // reachable, including the iOS simulator used during local development.
        requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
        addsPunctuation: false,
        // Full street addresses are dictation, not short search commands. On
        // recent iOS simulators the search hint can also trigger an Assistant
        // speech asset that closes the recording session immediately.
        iosTaskHint: 'dictation',
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'measurement',
        },
      });
      clearStopTimer();
      stopTimerRef.current = setTimeout(() => {
        if (activeFieldRef.current === field) ExpoSpeechRecognitionModule.stop();
      }, 12_000);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '음성을 인식하지 못했습니다. 다시 시도해 주세요.';
      setError({ field, message });
      clearActiveField();
    }
  }, [clearActiveField, clearStopTimer, enabled, stop]);

  useEffect(() => {
    if (enabled || !activeFieldRef.current) return;
    ExpoSpeechRecognitionModule.abort();
    clearActiveField();
  }, [clearActiveField, enabled]);

  useEffect(() => () => {
    clearStopTimer();
    if (activeFieldRef.current) ExpoSpeechRecognitionModule.abort();
  }, [clearStopTimer]);

  return { activeField, error, start, stop };
}

function errorMessage(code: ExpoSpeechRecognitionErrorCode) {
  switch (code) {
    case 'not-allowed': return '음성 입력을 사용하려면 마이크와 음성 인식 권한을 허용해 주세요.';
    case 'no-speech':
    case 'speech-timeout': return '들린 음성이 없습니다. 마이크를 누르고 주소를 다시 말해 주세요.';
    case 'network': return '음성 인식 서비스에 연결하지 못했습니다. 네트워크를 확인해 주세요.';
    case 'language-not-supported': return '이 기기에서 한국어 음성 인식을 지원하지 않습니다.';
    case 'service-not-allowed': return '현재 기기의 음성 인식 서비스를 사용할 수 없습니다. 실제 휴대폰에서 다시 시도해 주세요.';
    case 'audio-capture': return '마이크 입력을 시작하지 못했습니다. 다른 음성 앱을 닫고 다시 시도해 주세요.';
    case 'interrupted': return '전화나 다른 오디오로 음성 입력이 중단되었습니다. 다시 시도해 주세요.';
    case 'busy': return '음성 인식기가 사용 중입니다. 잠시 후 다시 시도해 주세요.';
    default: return '음성을 인식하지 못했습니다. 다시 시도해 주세요.';
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
