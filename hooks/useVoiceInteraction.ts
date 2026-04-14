import { useState, useCallback, useRef } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition as NativeSpeechRecognition } from '@capacitor-community/speech-recognition';

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        length: number;
        [index: number]: {
            isFinal: boolean;
            [index: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

const KEYWORDS = {
    locations: ['キッチン', '台所', '和室', 'リビング', '居間', '浴室', '風呂', '洗面', 'トイレ', '玄関', '廊下', '脱衣', 'ホール', 'ポーチ', '階段', '納戸', 'クローゼット', '押入れ', '床下', '洋室'],
    directions: ['北', '南', '東', '西', '中央', '隅', '右', '左', '南東', '南西', '北東', '北西'],
    status: ['白蟻', 'シロアリ', '腐朽', 'カビ', '水漏れ', '漏水', '異常なし', '点検完了', 'シロアリあり', '被害あり', '湿気', 'ひび割れ'],
};

export const useVoiceInteraction = (config: {
    onInspectionResult: (data: { location: string, direction: string, status: string }) => void;
    onError: (msg: string) => void;
}) => {
    const useNativeRecognition = Capacitor.isNativePlatform();
    const [isActive, setIsActive] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const autoRestartRef = useRef(false);
    const isStartingRef = useRef(false);
    const isActiveRef = useRef(false);
    const errorCountRef = useRef(0);
    const lastStartTimeRef = useRef(0);
    const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastProcessedTranscriptRef = useRef('');
    const nativePartialListenerRef = useRef<PluginListenerHandle | null>(null);
    const nativeListeningStateListenerRef = useRef<PluginListenerHandle | null>(null);

    const updateActiveState = (value: boolean) => {
        isActiveRef.current = value;
        setIsActive(value);
    };

    const clearRestartTimeout = () => {
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }
    };

    const parseText = (text: string) => {
        const foundLocation = KEYWORDS.locations.find(keyword => text.includes(keyword));
        const foundDirection = KEYWORDS.directions.find(keyword => text.includes(keyword)) || '中央';
        const foundStatus = KEYWORDS.status.find(keyword => text.includes(keyword));

        if (foundLocation || foundStatus) {
            config.onInspectionResult({
                location: foundLocation || '点検箇所',
                direction: foundDirection,
                status: foundStatus || '状況確認',
            });
            return true;
        }
        return false;
    };

    const handleRecognizedText = (text: string) => {
        const normalized = text.trim();
        setTranscript(normalized);

        if (!normalized || normalized === lastProcessedTranscriptRef.current) {
            return;
        }

        const matched = parseText(normalized);
        if (matched) {
            lastProcessedTranscriptRef.current = normalized;
            setTimeout(() => setTranscript(''), 800);
        }
    };

    const stopVoice = useCallback(async () => {
        autoRestartRef.current = false;
        clearRestartTimeout();

        if (useNativeRecognition) {
            try {
                await NativeSpeechRecognition.stop();
            } catch {
                console.warn('Native speech recognition stop failed');
            }

            if (nativePartialListenerRef.current) {
                await nativePartialListenerRef.current.remove();
                nativePartialListenerRef.current = null;
            }

            if (nativeListeningStateListenerRef.current) {
                await nativeListeningStateListenerRef.current.remove();
                nativeListeningStateListenerRef.current = null;
            }

            try {
                await NativeSpeechRecognition.removeAllListeners();
            } catch {
                console.warn('Native speech recognition listener cleanup failed');
            }
        } else if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.stop();
            } catch {
                console.warn('Recognition stop failed');
            }
            recognitionRef.current = null;
        }

        updateActiveState(false);
        isStartingRef.current = false;
        lastProcessedTranscriptRef.current = '';
        setTranscript('');
    }, [useNativeRecognition]);

    const scheduleRestart = useCallback((restart: () => Promise<void>) => {
        const sessionDuration = Date.now() - lastStartTimeRef.current;
        const baseWait = sessionDuration < 2000 ? 2500 : 1500;
        const waitTime = baseWait + (errorCountRef.current * 1000);

        clearRestartTimeout();

        restartTimeoutRef.current = setTimeout(() => {
            if (!autoRestartRef.current || isActiveRef.current || isStartingRef.current) {
                return;
            }

            isStartingRef.current = true;
            void restart().catch(() => {
                isStartingRef.current = false;
            });
        }, waitTime);
    }, []);

    const startNativeRecognition = useCallback(async () => {
        const availability = await NativeSpeechRecognition.available();
        if (!availability.available) {
            throw new Error('この端末は音声認識に対応していません');
        }

        const permissions = await NativeSpeechRecognition.requestPermissions();
        if (permissions.speechRecognition !== 'granted') {
            throw new Error('マイクの使用が許可されていません');
        }

        if (nativePartialListenerRef.current) {
            await nativePartialListenerRef.current.remove();
        }
        if (nativeListeningStateListenerRef.current) {
            await nativeListeningStateListenerRef.current.remove();
        }

        nativePartialListenerRef.current = await NativeSpeechRecognition.addListener('partialResults', ({ matches }) => {
            const latestTranscript = matches[matches.length - 1] || '';
            handleRecognizedText(latestTranscript);
        });

        nativeListeningStateListenerRef.current = await NativeSpeechRecognition.addListener('listeningState', ({ status }) => {
            if (status === 'started') {
                updateActiveState(true);
                isStartingRef.current = false;
                lastStartTimeRef.current = Date.now();
                errorCountRef.current = 0;
                lastProcessedTranscriptRef.current = '';
                return;
            }

            updateActiveState(false);
            isStartingRef.current = false;

            if (autoRestartRef.current) {
                scheduleRestart(async () => {
                    await NativeSpeechRecognition.start({
                        language: 'ja-JP',
                        maxResults: 3,
                        partialResults: true,
                        popup: false,
                        prompt: '点検内容を話してください',
                    });
                });
            }
        });

        await NativeSpeechRecognition.start({
            language: 'ja-JP',
            maxResults: 3,
            partialResults: true,
            popup: false,
            prompt: '点検内容を話してください',
        });
    }, [scheduleRestart]);

    const startWebRecognition = useCallback(async () => {
        const SpeechRecognitionClass =
            (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
            (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            throw new Error('このブラウザは音声認識に対応していません');
        }

        const recognition: SpeechRecognition = new SpeechRecognitionClass();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
            updateActiveState(true);
            isStartingRef.current = false;
            lastStartTimeRef.current = Date.now();
            errorCountRef.current = 0;
            lastProcessedTranscriptRef.current = '';
            setTranscript('');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let index = event.resultIndex; index < event.results.length; ++index) {
                const transcriptPart = event.results[index][0].transcript;
                if (event.results[index].isFinal) {
                    final += transcriptPart;
                } else {
                    interim += transcriptPart;
                }
            }

            handleRecognizedText(final || interim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            const error = event.error;

            if (error === 'no-speech') return;
            if (error === 'aborted') {
                isStartingRef.current = false;
                return;
            }

            if (error === 'not-allowed' || error === 'service-not-allowed') {
                autoRestartRef.current = false;
                void stopVoice();
                config.onError('マイクの使用が許可されていません');
                return;
            }

            errorCountRef.current++;
            console.error('Speech Recognition Error:', error);
        };

        recognition.onend = () => {
            updateActiveState(false);
            isStartingRef.current = false;

            if (autoRestartRef.current) {
                scheduleRestart(async () => {
                    recognition.start();
                });
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [config, scheduleRestart, stopVoice]);

    const startVoice = useCallback(async (_mode: 'inspection' = 'inspection') => {
        if (isActiveRef.current || isStartingRef.current) return;

        autoRestartRef.current = true;
        isStartingRef.current = true;
        lastProcessedTranscriptRef.current = '';

        try {
            if (useNativeRecognition) {
                await startNativeRecognition();
            } else {
                await startWebRecognition();
            }
        } catch (err) {
            isStartingRef.current = false;
            updateActiveState(false);
            const message = err instanceof Error ? err.message : '音声認識の開始に失敗しました';
            config.onError(message);
            console.error('Voice start failed:', err);
        }
    }, [config, startNativeRecognition, startWebRecognition, useNativeRecognition]);

    return { isActive, startVoice, stopVoice, transcript };
};
