
import { useState, useCallback, useRef } from 'react';

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

// 点検・製図用の高度なキーワード辞書
const KEYWORDS = {
    locations: ['キッチン', '台所', '和室', 'リビング', '居間', '浴室', '風呂', '洗面', 'トイレ', '玄関', '廊下', '脱衣', 'ホール', 'ポーチ', '階段', '納戸', 'クローゼット', '押入れ', '床下', '洋室'],
    directions: ['北', '南', '東', '西', '中央', '隅', '右', '左', '南東', '南西', '北東', '北西'],
    orientations: ['横', '縦', 'よこ', 'たて', '水平', '垂直'],
    status: ['白蟻', 'シロアリ', '腐朽', 'カビ', '水漏れ', '漏水', '異常なし', '点検完了', 'シロアリあり', '被害あり', '湿気', 'ひび割れ'],
    units: ['畳', '帖', '平米', 'メートル']
};

const MAX_BACKOFF = 10000;

export const useVoiceInteraction = (config: {
    onInspectionResult: (data: { location: string, direction: string, status: string }) => void;
    onDraftingResult: (data: { roomName: string, width: number, height: number }) => void;
    onError: (msg: string) => void;
}) => {
    const [isActive, setIsActive] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const modeRef = useRef<'inspection' | 'drafting'>('inspection');
    const autoRestartRef = useRef(false);
    const isStartingRef = useRef(false);
    const errorCountRef = useRef(0);
    const lastStartTimeRef = useRef(0); // 最後に開始した時間
    const restartTimeoutRef = useRef<number | null>(null);

    const calculateGridSize = (size: number, isVertical: boolean) => {
        let w = 0;
        let h = 0;
        switch (size) {
            case 3: w = 3; h = 2; break;
            case 4: w = 4; h = 2; break;
            case 4.5: w = 3; h = 3; break;
            case 6: w = 4; h = 3; break;
            case 8: w = 4; h = 4; break;
            case 10: w = 5; h = 4; break;
            case 12: w = 6; h = 4; break;
            default:
                w = Math.ceil(Math.sqrt(size * 2 * 1.3));
                h = Math.ceil((size * 2) / w);
        }
        if (isVertical) return { width: h, height: w };
        return { width: w, height: h };
    };

    const parseText = (text: string) => {
        if (modeRef.current === 'inspection') {
            const foundLocation = KEYWORDS.locations.find(k => text.includes(k));
            const foundDirection = KEYWORDS.directions.find(k => text.includes(k)) || '中央';
            const foundStatus = KEYWORDS.status.find(k => text.includes(k));
            if (foundLocation || foundStatus) {
                config.onInspectionResult({
                    location: foundLocation || '点検箇所',
                    direction: foundDirection,
                    status: foundStatus || '状況確認'
                });
                return true;
            }
        } else {
            const foundRoom = KEYWORDS.locations.find(k => text.includes(k));
            const numMatch = text.match(/(\d+\.?\d*|一|二|三|四|五|六|七|八|九|十)/);
            const isVertical = text.includes('縦') || text.includes('たて') || text.includes('垂直');
            if (foundRoom) {
                let size = 6;
                if (numMatch) {
                    const n = numMatch[0];
                    const numMap: Record<string, number> = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
                    size = numMap[n] || parseFloat(n);
                }
                const dimensions = calculateGridSize(size, isVertical);
                config.onDraftingResult({
                    roomName: foundRoom,
                    width: dimensions.width,
                    height: dimensions.height
                });
                return true;
            }
        }
        return false;
    };

    const stopVoice = useCallback(() => {
        autoRestartRef.current = false;
        
        if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null; 
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.stop();
            } catch (e) {
                console.warn("Recognition stop failed:", e);
            }
            recognitionRef.current = null;
        }
        
        setIsActive(false);
        isStartingRef.current = false;
        setTranscript('');
    }, []);

    const startVoice = useCallback((mode: 'inspection' | 'drafting') => {
        // 多重起動防止
        if (isActive || isStartingRef.current) return;

        const SpeechRecognitionClass = (window as unknown as { SpeechRecognition: new () => SpeechRecognition, webkitSpeechRecognition: new () => SpeechRecognition }).SpeechRecognition || (window as unknown as { SpeechRecognition: new () => SpeechRecognition, webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
            config.onError("このブラウザは音声認識に対応していません");
            return;
        }

        modeRef.current = mode;
        autoRestartRef.current = true;
        isStartingRef.current = true;
        
        const recognition: SpeechRecognition = new SpeechRecognitionClass();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
            setIsActive(true);
            isStartingRef.current = false;
            lastStartTimeRef.current = Date.now();
            setTranscript('');
            errorCountRef.current = 0;
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcriptPart;
                } else {
                    interim += transcriptPart;
                }
            }
            const displayTranscript = final || interim;
            setTranscript(displayTranscript);
            if (final) {
                const matched = parseText(final);
                if (matched) {
                    setTimeout(() => setTranscript(''), 800);
                }
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            const error = event.error;

            if (error === 'no-speech') {
                setTranscript('(音声が検出されませんでした)');
                setTimeout(() => setTranscript(''), 2000);
                return;
            }

            if (error === 'aborted') {
                isStartingRef.current = false;
                return;
            }

            if (error === 'not-allowed' || error === 'service-not-allowed') {
                autoRestartRef.current = false;
                config.onError("マイクの使用が許可されていません");
                stopVoice();
                return;
            }

            errorCountRef.current++;
            console.error("Speech Recognition Error:", error);
        };

        recognition.onend = () => {
            setIsActive(false);
            isStartingRef.current = false;

            if (autoRestartRef.current) {
                // 連続エラーが一定数を超えたら停止
                if (errorCountRef.current > 5) {
                    autoRestartRef.current = false;
                    config.onError("音声認識が連続して失敗したため停止しました。環境を確認してください。");
                    setIsActive(false);
                    return;
                }

                const sessionDuration = Date.now() - lastStartTimeRef.current;
                
                // 通常時もモバイルChromeの通知音ループを避けるため最低1.5秒は空ける
                // エラー回数に応じて待機時間を増やす（バックオフ）
                const baseWait = sessionDuration < 2000 ? 2500 : 1500;
                const waitTime = Math.min(
                    baseWait + (errorCountRef.current * 2000),
                    MAX_BACKOFF
                );
                
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
                
                restartTimeoutRef.current = setTimeout(() => {
                    // 待機中に stopVoice が呼ばれていないか再確認
                    if (autoRestartRef.current && !isActive && !isStartingRef.current) {
                        try { 
                            recognition.start(); 
                            isStartingRef.current = true;
                        } catch(e) { 
                            isStartingRef.current = false;
                        }
                    }
                }, waitTime);
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            isStartingRef.current = false;
        }
    }, [config, isActive, stopVoice]);

    return { isActive, startVoice, stopVoice, transcript };
};
