
import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, RefreshIcon, SparklesIcon, MicrophoneIcon } from './icons';

// --- Tutorial Overlay ---
export const TutorialOverlay: React.FC<{ step: string, onNext: () => void }> = ({ step, onNext }) => {
    const getContent = () => {
        switch(step) {
            case 'welcome': return { title: 'ようこそ！練習を始めましょう', text: 'まずは図面に「部屋」を置いてみましょう。左側の「施工」タブから部屋を選べます。', btn: '了解！' };
            case 'place_room': return { title: '部屋を配置しましょう', text: '図面上の好きな場所をタップして、部屋を設置してください。', btn: 'やってみる' };
            case 'place_access': return { title: '侵入口を決めましょう', text: '次に床下に潜る場所（点検口）を置きます。「点検」タブから侵入口を選んでください。', btn: '次へ' };
            case 'underfloor_photo': return { title: '床下で撮影！', text: '最後は床下での撮影です。カメラアイコンをタップして、被害状況を記録しましょう。', btn: '了解' };
            case 'finish': return { title: 'チュートリアル完了！', text: 'おめでとうございます！これで一通りの流れがわかりました。本番でも頑張りましょう！', btn: '終了して戻る' };
            default: return null;
        }
    };
    const content = getContent();
    if (!content) return null;
    return (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 max-sm w-full shadow-2xl animate-bounce-in text-center border-4 border-yellow-400">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <SparklesIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-4">{content.title}</h3>
                <p className="text-gray-600 font-bold mb-8 leading-relaxed">{content.text}</p>
                <button onClick={onNext} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">
                    {content.btn}
                </button>
            </div>
        </div>
    );
};

// --- Image Preview / Rotation Modal ---
export const ImagePreviewModal: React.FC<{ 
    dataUrl: string, 
    onConfirm: (rotation: number) => void, 
    onCancel: () => void 
}> = ({ dataUrl, onConfirm, onCancel }) => {
    const [rotation, setRotation] = useState(0);
    return (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="absolute top-6 right-6">
                <button onClick={onCancel} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <XMarkIcon className="w-8 h-8" />
                </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center w-full p-4 overflow-hidden">
                <div className="relative transition-transform duration-300 ease-in-out shadow-2xl border-4 border-white/20 rounded-lg overflow-hidden" 
                     style={{ transform: `rotate(${rotation}deg)`, maxWidth: '90%', maxHeight: '80%' }}>
                    <img src={dataUrl} alt="Preview" className="max-w-full max-h-full block object-contain" />
                </div>
            </div>
            
            <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 flex flex-col gap-6 items-center">
                <div className="text-center">
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tighter">図面の向きを調整</h3>
                    <p className="text-white/60 text-sm font-bold">図面が正しく表示されるように回転させてください</p>
                </div>
                
                <div className="flex gap-4 w-full">
                    <button 
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
                    >
                        <RefreshIcon className="w-6 h-6" />
                        右に90度回転
                    </button>
                </div>
                
                <button 
                    onClick={() => onConfirm(rotation)}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    <CheckIcon className="w-6 h-6" />
                    この向きで編集を開始
                </button>
            </div>
        </div>
    );
};

// --- Confirm Transition Modal ---
export const ConfirmTransitionModal: React.FC<{ onConfirm: () => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center border-4 border-indigo-500 animate-bounce-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">床上製図を保存しました</h3>
            <p className="text-gray-500 font-bold mb-8">このままの図面を床下調査に使用しますか？</p>
            <div className="flex flex-col gap-3">
                <button onClick={onConfirm} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">床下モードへ移行</button>
                <button onClick={onCancel} className="w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm">まだ修正する</button>
            </div>
        </div>
    </div>
);

// --- Voice Input Feedback ---
export const VoiceTranscriptOverlay: React.FC<{ transcript: string }> = ({ transcript }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (transcript) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [transcript]);

    if (!visible) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] w-[90%] max-w-lg pointer-events-none animate-bounce-in">
            <div className="bg-indigo-600/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-2 border-white/20 flex flex-col gap-2">
                <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-2">
                    <div className="bg-white p-1 rounded-full"><MicrophoneIcon className="w-5 h-5 text-indigo-600 animate-pulse" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">音声認識中...</span>
                </div>
                <div className="text-white text-xl font-black leading-tight">
                    {transcript || "キーワードを話してください..."}
                </div>
                {transcript.match(/(キッチン|和室|リビング|浴室|洗面|トイレ|玄関|点検完了|シロアリ|被害|畳|帖)/) && (
                    <div className="mt-2 text-green-300 text-[10px] font-black animate-pulse">
                        キーワードを検知しました
                    </div>
                )}
            </div>
        </div>
    );
};
