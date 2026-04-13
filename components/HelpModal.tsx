
import React from 'react';
import { PencilIcon, HandIcon, XMarkIcon, QuestionMarkCircleIcon, BoltIcon } from './icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-bounce-in" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-800 p-2.5 rounded-2xl shadow-lg">
                            <QuestionMarkCircleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">操作ガイド</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operation Manual</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <XMarkIcon className="w-8 h-8 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="space-y-10">
                        <section>
                            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                                基本操作
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md"><PencilIcon className="w-5 h-5"/></div>
                                        <span className="font-black text-gray-800">描画モード</span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-bold leading-relaxed">
                                        マーカーを配置・描画します。画面をなぞると線が引け、タップするとアイコンが置かれます。
                                    </p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-gray-800 text-white rounded-xl shadow-md"><HandIcon className="w-5 h-5"/></div>
                                        <span className="font-black text-gray-800">移動・選択モード</span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-bold leading-relaxed">
                                        図面の移動や、配置済みマーカーの選択・修正・削除を行います。
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                                自動トリミング機能
                            </h3>
                            <div className="bg-gray-50 border-2 border-gray-200 p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 items-center">
                                <div className="bg-white p-4 rounded-3xl shadow-sm">
                                    <BoltIcon className="w-12 h-12 text-gray-700" />
                                </div>
                                <div className="space-y-2 text-center md:text-left">
                                    <p className="font-black text-gray-900 text-lg">最適な範囲を自動設定</p>
                                    <p className="text-sm text-gray-600 font-bold leading-relaxed">
                                        保存ボタンを押すと、マーカーが配置されている範囲を自動で計算し、
                                        余白をカットしたA4サイズのJPEG画像を生成します。
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end items-center">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 font-black text-sm shadow-xl transition-all active:scale-95">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
