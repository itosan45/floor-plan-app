
import React, { useState, useRef, useEffect } from 'react';
import { EditorState, EditorActions } from '../hooks/useEditorState';
import { XMarkIcon, SparklesIcon, MicrophoneIcon, DownloadIcon, CheckIcon, TrashIcon } from './icons';
import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeRawPcm } from '../utils/audio';
import { MARKER_DEFINITIONS } from '../constants';

interface NarrationModalProps {
    isOpen: boolean;
    state: EditorState;
    actions: EditorActions;
    onClose: () => void;
}

export const NarrationModal: React.FC<NarrationModalProps> = ({ isOpen, state, actions, onClose }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentNarrationSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const { markers, narration } = state;

    useEffect(() => {
        if (!bgmAudioRef.current) {
            bgmAudioRef.current = new Audio();
            bgmAudioRef.current.loop = true;
        }
        if (narration.bgmUrl) {
            bgmAudioRef.current.src = narration.bgmUrl;
        }
        bgmAudioRef.current.volume = narration.bgmVolume;
    }, [narration.bgmUrl, narration.bgmVolume]);

    const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        actions.setNarrationSettings({ bgmUrl: url, bgmFileName: file.name });
    };

    const stopAudio = () => {
        if (currentNarrationSourceRef.current) {
            currentNarrationSourceRef.current.stop();
            currentNarrationSourceRef.current = null;
        }
        if (bgmAudioRef.current) {
            bgmAudioRef.current.pause();
        }
    };

    const generateNarration = async () => {
        setIsGenerating(true);
        stopAudio();
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Build report summary prompt
            const reportSummary = markers.map(m => {
                const def = MARKER_DEFINITIONS[m.type as keyof typeof MARKER_DEFINITIONS];
                return `- ${def?.label || m.type}: ${m.text || ''} ${m.comment || ''}`;
            }).join('\n');

            const personaVoiceMap: Record<'male' | 'female' | 'child', string> = {
                male: 'Charon', // Strong professional male
                female: 'Kore', // Friendly clear female
                child: 'Puck'   // Cheerful child
            };

            const systemInstruction = `
                You are a professional home inspector presenting a field report.
                Summarize the following inspection findings in a clear, professional, yet helpful tone for the client.
                Use Japanese. Speak at a speed of ${narration.speed}x.
                Persona: ${narration.persona}.
            `;

            const prompt = `以下の点検レポートを要約して、現場の状況をナレーション風に読み上げてください:\n${reportSummary}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    systemInstruction,
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: personaVoiceMap[narration.persona] },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("Audio generation failed");

            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            }
            
            const audioData = decodeBase64(base64Audio);
            const audioBuffer = await decodeRawPcm(audioData, audioContextRef.current, 24000, 1);
            
            // Play BGM
            if (narration.bgmUrl && bgmAudioRef.current) {
                bgmAudioRef.current.play();
            }

            // Play Narration
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = narration.speed;
            source.connect(audioContextRef.current.destination);
            source.start();
            currentNarrationSourceRef.current = source;

            source.onended = () => {
                if (bgmAudioRef.current) bgmAudioRef.current.pause();
                setIsGenerating(false);
            };

        } catch (err) {
            console.error("Narration generation failed:", err);
            actions.showStatus("ナレーション生成に失敗しました", "error");
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-bounce-in flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
                            <MicrophoneIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">AIナレーション・BGM</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XMarkIcon className="w-8 h-8 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Persona Selection */}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">ナレーション・ペルソナ</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['female', 'male', 'child'] as const).map(p => (
                                <button 
                                    key={p}
                                    onClick={() => actions.setNarrationSettings({ persona: p })}
                                    className={`py-3 px-2 rounded-2xl border-2 transition-all font-bold text-xs ${narration.persona === p ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-100 text-gray-500'}`}
                                >
                                    {p === 'female' ? '女性' : p === 'male' ? '男性' : '子供'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Speed Selector */}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">話す速度: {narration.speed}x</label>
                        <input 
                            type="range" min="0.5" max="2.0" step="0.1"
                            value={narration.speed}
                            onChange={(e) => actions.setNarrationSettings({ speed: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    {/* BGM Settings */}
                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">背景BGM</label>
                            {narration.bgmFileName && (
                                <button onClick={() => actions.setNarrationSettings({ bgmUrl: null, bgmFileName: null })} className="text-red-500 hover:text-red-600">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        {!narration.bgmUrl ? (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-indigo-400 transition-colors bg-white">
                                <DownloadIcon className="w-6 h-6 text-indigo-400 mb-2" />
                                <span className="text-xs font-bold text-gray-500">MP3ファイルをアップロード</span>
                                <input type="file" accept="audio/mpeg" onChange={handleBgmUpload} className="hidden" />
                            </label>
                        ) : (
                            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                                <CheckIcon className="w-5 h-5 text-green-500" />
                                <span className="text-xs font-black text-gray-700 truncate flex-1">{narration.bgmFileName}</span>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">BGM音量: {Math.round(narration.bgmVolume * 100)}%</label>
                            <input 
                                type="range" min="0" max="1" step="0.05"
                                value={narration.bgmVolume}
                                onChange={(e) => actions.setNarrationSettings({ bgmVolume: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-2">
                    <button 
                        onClick={stopAudio}
                        className="flex-1 py-4 border-2 border-gray-200 text-gray-600 rounded-3xl font-black shadow-sm active:scale-95 transition-all"
                    >
                        停止
                    </button>
                    <button 
                        onClick={generateNarration}
                        disabled={isGenerating}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                ナレーションを生成・再生
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
