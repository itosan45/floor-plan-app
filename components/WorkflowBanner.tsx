
import React from 'react';
import { WorkflowStep } from '../types';
import { CheckIcon, SparklesIcon, BoltIcon, ChevronRightIcon } from './icons';
import { useEditorContext } from '../contexts/EditorContext';

interface WorkflowBannerProps {
    step: WorkflowStep;
    onNext: () => void;
    canNext: boolean;
    isTutorial?: boolean;
    onExport: () => void;
}

export const WorkflowBanner: React.FC<WorkflowBannerProps> = ({ step, onNext, canNext, isTutorial, onExport }) => {
    const { actions } = useEditorContext();
    const steps: { key: WorkflowStep; label: string; instruction: string }[] = [
        { key: 'preparation', label: '図面', instruction: '平面図読み込み or 方眼紙' },
        { key: 'floor_drafting', label: '製図', instruction: '間取り完成 & メモ記入' },
        { key: 'entry_setup', label: '進入口', instruction: '点検口を配置' },
        { key: 'underfloor', label: '床下', instruction: '被害の記録 & 撮影' },
        { key: 'completion', label: '完了', instruction: '撮り逃し確認 & 出力' },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);
    const currentStepData = steps[currentIndex];

    const handleStepClick = (targetStep: WorkflowStep) => {
        actions.setWorkflowStep(targetStep);
    };

    return (
        <div className="absolute top-0 left-14 right-16 z-40 p-2 pointer-events-none">
            <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl flex items-center justify-between px-3 py-2 pointer-events-auto max-w-2xl mx-auto overflow-hidden">
                {/* Progress Nav - Clickable */}
                <div className="flex items-center gap-1 sm:gap-1.5 mr-2 overflow-x-auto custom-scrollbar no-scrollbar py-1">
                    {steps.map((s, i) => {
                        const isPast = i < currentIndex;
                        const isCurrent = i === currentIndex;
                        return (
                            <React.Fragment key={s.key}>
                                <button 
                                    onClick={() => handleStepClick(s.key)}
                                    className={`flex items-center gap-1 transition-all active:scale-95 ${isCurrent ? 'text-white' : isPast ? 'text-green-400' : 'text-gray-600'}`}
                                >
                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-colors ${isPast ? 'bg-green-600 border-green-600' : (isCurrent ? 'bg-indigo-600 border-indigo-600' : 'border-gray-700 bg-gray-800')}`}>
                                        {isPast ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
                                    </div>
                                    <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tighter whitespace-nowrap hidden sm:inline ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                                        {s.label}
                                    </span>
                                </button>
                                {i < steps.length - 1 && <div className={`w-1.5 h-0.5 rounded-full flex-shrink-0 ${i < currentIndex ? 'bg-green-600' : 'bg-gray-800'}`} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Next Action Button */}
                <button 
                    onClick={onNext}
                    disabled={!canNext}
                    className={`ml-auto px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-black text-[11px] shadow-lg active:scale-95 whitespace-nowrap ${canNext ? 'bg-indigo-600 text-white hover:bg-indigo-500 ' + (isTutorial ? 'animate-bounce' : '') : 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed'}`}
                >
                    <span className="hidden xs:inline">
                        {step === 'floor_drafting' && !isTutorial ? '床下へ' : (currentIndex === steps.length - 1 ? '完了' : '次へ')}
                    </span>
                    <ChevronRightIcon className="w-4 h-4" />
                </button>

                {/* Quick Export Button */}
                <button 
                    onClick={onExport}
                    className="ml-2 w-10 h-10 bg-indigo-600/20 text-indigo-400 border border-indigo-400/30 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-90"
                    title="現在の状態で保存・出力"
                >
                    <BoltIcon className="w-5 h-5 font-black" />
                </button>
            </div>
        </div>
    );
};
