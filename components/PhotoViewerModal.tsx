
import React from 'react';
import { Photo, Marker } from '../types';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from './icons';
import { MarkerDisplay } from './Marker';

interface PhotoViewerModalProps {
    isOpen: boolean;
    photos: Photo[];
    markers: Marker[];
    activeIndex: number;
    floorPlanImage: Photo | null;
    floorPlanAspectRatio: number | null;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
    isOpen, photos, markers, activeIndex, floorPlanImage, floorPlanAspectRatio,
    onClose, onNext, onPrev
}) => {
    if (!isOpen || photos.length === 0) return null;

    const currentPhoto = photos[activeIndex];
    const currentMarker = markers.find(m => m.photoId === currentPhoto.id);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = currentPhoto.dataUrl;
        // ファイル名をラベル（例: "1 キッチン 東"）から生成。半角スペースをアンダースコアに置換して安全に。
        const fileName = currentPhoto.label.replace(/\s+/g, '_') + '.jpg';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col md:flex-row animate-fade-in overflow-hidden" onClick={onClose}>
            
            {/* Main Photo Area */}
            <div className="flex-1 relative flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                <img 
                    src={currentPhoto.dataUrl} 
                    alt={currentPhoto.label}
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-gray-800"
                />
                
                {/* Navigation Overlay */}
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="p-4 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full pointer-events-auto transition-all"
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="p-4 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full pointer-events-auto transition-all"
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* Photo Info Bottom */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <div className="bg-black bg-opacity-60 text-white px-6 py-3 rounded-full border border-white border-opacity-20 font-black tracking-wider text-sm shadow-xl backdrop-blur-sm">
                        {currentPhoto.label}
                    </div>
                    <button 
                        onClick={handleDownload}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl transition-all active:scale-90 border border-indigo-400 group"
                        title="この写真をラベル名で保存"
                    >
                        <DownloadIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Sidebar / Minimap Area */}
            <div 
                className="w-full md:w-80 bg-gray-900 border-l border-gray-800 p-6 flex flex-col gap-6 relative z-10"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white font-black text-lg">点検箇所確認</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
                        <XMarkIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* Minimap (Small Floorplan) */}
                <div className="flex-1 flex flex-col">
                    <span className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">現在地 (Minimap)</span>
                    <div 
                        className="bg-white rounded-lg shadow-inner relative overflow-hidden border border-gray-700"
                        style={{ aspectRatio: floorPlanAspectRatio || 1 }}
                    >
                        {floorPlanImage && (
                            <img 
                                src={floorPlanImage.dataUrl} 
                                className="absolute inset-0 w-full h-full object-contain opacity-40 grayscale" 
                                alt="map"
                            />
                        )}
                        
                        {/* Current Marker Blinking */}
                        {currentMarker && (
                            <div 
                                className="absolute z-20 transition-all"
                                style={{ 
                                    left: `${currentMarker.x * 100}%`, 
                                    top: `${currentMarker.y * 100}%`,
                                    transform: 'translate(-50%, -50%)' 
                                }}
                            >
                                <div className="animate-ping absolute inset-0 rounded-full bg-red-500 opacity-75"></div>
                                <div className="relative">
                                    <MarkerDisplay marker={currentMarker} containerWidth={80} />
                                </div>
                            </div>
                        )}
                        
                        {/* Other Markers (Dimmed) */}
                        {markers.filter(m => m.type === 'photo' && m.id !== currentMarker?.id).map(m => (
                            <div 
                                key={m.id}
                                className="absolute opacity-20 scale-75"
                                style={{ 
                                    left: `${m.x * 100}%`, 
                                    top: `${m.y * 100}%`,
                                    transform: 'translate(-50%, -50%)' 
                                }}
                            >
                                <MarkerDisplay marker={m} containerWidth={80} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Photo Count */}
                <div className="text-center py-4 bg-gray-800 rounded-xl border border-gray-700">
                    <span className="text-indigo-400 text-3xl font-black">{activeIndex + 1}</span>
                    <span className="text-gray-500 text-lg mx-2">/</span>
                    <span className="text-gray-400 text-lg font-bold">{photos.length}</span>
                </div>
            </div>
        </div>
    );
};
