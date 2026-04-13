
import React from 'react';
import { XMarkIcon, CheckIcon } from './icons';

interface PreviewModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
    onDownload: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, imageUrl, onClose, onDownload }) => {
    if (!isOpen || !imageUrl) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <span>出力プレビュー</span>
                        <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">A4 Landscape</span>
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* Image Container */}
                <div className="flex-1 overflow-auto bg-gray-200 p-4 flex items-center justify-center">
                    <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain shadow-lg border border-gray-300 bg-white" 
                    />
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition-colors"
                    >
                        閉じる
                    </button>
                    <button 
                        onClick={() => {
                            onDownload();
                            onClose();
                        }} 
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                        <CheckIcon className="w-5 h-5" />
                        この画像で保存
                    </button>
                </div>
            </div>
        </div>
    );
};
