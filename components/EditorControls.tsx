
import React from 'react';
import { EditorState, EditorActions } from '../hooks/useEditorState';
import { 
    MaximizeIcon, PencilIcon, HandIcon, 
    ZoomInIcon, ZoomOutIcon, RefreshIcon, CameraIcon, PhotoIcon, 
    QuestionMarkCircleIcon, UndoIcon, SparklesIcon, HammerIcon
} from './icons';
import { APP_INFO } from '../constants';

// --- Orientation Warning ---
interface OrientationWarningProps {
    onForceLandscape?: () => void;
}

export const OrientationWarning: React.FC<OrientationWarningProps> = ({ onForceLandscape }) => (
    <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in">
        <div className="mb-10 transform rotate-90 scale-150">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-indigo-400 animate-pulse">
                <path d="M10.5 18.75a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" />
                <path fillRule="evenodd" d="M8.625.75A3.375 3.375 0 005.25 4.125v15.75a3.375 3.375 0 003.375 3.375h6.75a3.375 3.375 0 003.375-3.375V4.125A3.375 3.375 0 0015.375.75h-6.75zM7.5 4.125C7.5 3.504 8.004 3 8.625 3h6.75c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 017.5 19.875V4.125z" clipRule="evenodd" />
            </svg>
        </div>
        <h2 className="text-2xl font-black mb-4 tracking-tighter">画面を横にしてください</h2>
        <button onClick={onForceLandscape} className="px-6 py-3 bg-indigo-600 rounded-full text-xs font-bold shadow-xl">強制解除</button>
    </div>
);

// --- Welcome Screen ---
interface WelcomeScreenProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onStartWithGrid: () => void;
    onStartTutorial: () => void;
    toggleFullscreen: () => void;
    isFullscreen: boolean;
    onOpenHelp: () => void;
    state: EditorState;
    actions: EditorActions;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    onFileChange, onStartWithGrid, onStartTutorial, toggleFullscreen, isFullscreen, onOpenHelp, state, actions
}) => {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
            <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center relative border border-gray-800 select-none">
                <button onClick={onOpenHelp} className="absolute top-6 right-6 text-gray-500 hover:text-indigo-400 transition-colors">
                    <QuestionMarkCircleIcon className="w-7 h-7" />
                </button>

                <div className="mb-6 mt-4">
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic">FLOOR PLAN<br/>EDITOR</h1>
                    <p className="text-gray-500 text-sm font-medium">住宅点検・床下調査報告システム {APP_INFO.VERSION}</p>
                </div>

                <div className="bg-black/30 p-2 rounded-2xl flex gap-2 mb-8 border border-gray-800">
                    <button 
                        onClick={() => actions.setUiMode('office')}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${state.uiMode === 'office' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}
                    >
                        <HammerIcon className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">事務所・製図</span>
                        <span className="text-[8px] opacity-60">PC/大画面推奨</span>
                    </button>
                    <button 
                        onClick={() => actions.setUiMode('field')}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${state.uiMode === 'field' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}
                    >
                        <CameraIcon className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">現場・調査</span>
                        <span className="text-[8px] opacity-60">スマホ/音声推奨</span>
                    </button>
                </div>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={onStartTutorial}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl p-5 flex items-center justify-center gap-4 active:scale-95 shadow-xl transition-all hover:brightness-110"
                    >
                        <SparklesIcon className="w-7 h-7" />
                        <span className="font-black text-base italic tracking-tighter uppercase">練習モードを開始</span>
                    </button>

                    <label className="block w-full cursor-pointer">
                        <div className="bg-white text-gray-900 rounded-2xl p-5 flex items-center justify-center gap-4 active:scale-95 shadow-xl transition-all hover:bg-gray-50">
                            <CameraIcon className="w-7 h-7 text-red-600" />
                            <span className="font-black text-base text-left leading-tight">
                                図面を撮影して<br/><span className="text-xs text-gray-500">点検モードを開始</span>
                            </span>
                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={onFileChange} />
                        </div>
                    </label>

                    <label className="block w-full cursor-pointer">
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 active:bg-gray-750 flex items-center justify-center gap-4 transition-all hover:border-gray-600">
                            <PhotoIcon className="w-6 h-6 text-indigo-400" />
                            <span className="text-gray-300 font-bold text-base text-left leading-tight">
                                データを読み込む<br/><span className="text-xs text-gray-500">JSON / 画像ファイル</span>
                            </span>
                            <input type="file" className="hidden" accept="image/*,.json" onChange={onFileChange} />
                        </div>
                    </label>

                    <button 
                        onClick={onStartWithGrid} 
                        className="w-full py-5 text-indigo-400 hover:text-indigo-300 rounded-2xl font-black text-lg tracking-tight transition-all active:scale-95 border-2 border-dashed border-gray-800 hover:border-indigo-900 bg-gray-900/50"
                    >
                        白紙から製図を始める
                    </button>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                    <span>{APP_INFO.UPDATED_AT}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                    <button onClick={toggleFullscreen} className="hover:text-white">{isFullscreen ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN'}</button>
                </div>
            </div>
        </div>
    );
};

// --- Single Vertical Floating Toolbar ---
interface FloatingToolbarProps {
    state: EditorState;
    actions: EditorActions;
    handleZoom: (delta: number) => void;
    resetView: () => void;
    stopEventPropagation: (e: React.BaseSyntheticEvent) => void;
    removeLastMarker: () => void;
    hasMarkers: boolean;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
    state, actions, handleZoom, resetView, stopEventPropagation, removeLastMarker, hasMarkers
}) => {
    const { appMode, isGridPanelOpen, gridSize, currentLineThickness, selectedMarkerId, isGridMode, markers, uiMode } = state;
    const { setAppMode, setIsGridPanelOpen, setGridSize, setCurrentLineThickness, updateMarker } = actions;
    
    const selectedMarker = markers.find(m => m.id === selectedMarkerId);
    const isField = uiMode === 'field';

    return (
        <div 
            className="absolute top-8 right-2 z-40 flex flex-row-reverse items-start gap-4 pointer-events-auto"
            onPointerDown={stopEventPropagation}
        >
            <div className={`bg-gray-950/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-gray-800 flex flex-col gap-2 items-center flex-shrink-0 ${isField ? 'w-16' : 'w-12'}`}>
                <button 
                    onClick={() => setAppMode('draw')} 
                    className={`rounded-xl flex items-center justify-center transition-all ${appMode === 'draw' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 active:bg-gray-800'} ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}
                >
                    <PencilIcon className={isField ? "w-6 h-6" : "w-5 h-5"} />
                </button>
                <button 
                    onClick={() => setAppMode('pan')} 
                    className={`rounded-xl flex items-center justify-center transition-all ${appMode === 'pan' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 active:bg-gray-800'} ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}
                >
                    <HandIcon className={isField ? "w-6 h-6" : "w-5 h-5"} />
                </button>

                <div className="w-6 border-t border-gray-800" />

                <button 
                    onClick={removeLastMarker} 
                    disabled={!hasMarkers}
                    className={`flex items-center justify-center text-indigo-400 rounded-xl disabled:opacity-20 active:bg-indigo-600 active:text-white transition-all ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}
                >
                    <UndoIcon className={isField ? "w-6 h-6" : "w-5 h-5"} />
                </button>

                <div className="w-6 border-t border-gray-800" />

                <button onClick={() => handleZoom(0.3)} className={`text-gray-500 flex items-center justify-center active:bg-gray-800 rounded-xl transition-all ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}><ZoomInIcon className={isField ? "w-6 h-6" : "w-5 h-5"} /></button>
                <button onClick={() => handleZoom(-0.3)} className={`text-gray-500 flex items-center justify-center active:bg-gray-800 rounded-xl transition-all ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}><ZoomOutIcon className={isField ? "w-6 h-6" : "w-5 h-5"} /></button>
                <button onClick={resetView} className={`text-gray-500 flex items-center justify-center active:bg-gray-800 rounded-xl transition-all ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}><MaximizeIcon className={isField ? "w-6 h-6" : "w-5 h-5"} /></button>

                <div className="w-6 border-t border-gray-800" />

                <button 
                    onClick={() => setIsGridPanelOpen(!isGridPanelOpen)} 
                    className={`rounded-xl flex items-center justify-center transition-all ${isGridPanelOpen ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 active:bg-gray-800'} ${isField ? 'w-12 h-12' : 'w-9 h-9'}`}
                >
                    <RefreshIcon className={`${isField ? "w-6 h-6" : "w-5 h-5"} rotate-90`} />
                </button>
            </div>

            {isGridPanelOpen && (
                <div className="bg-gray-950/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-800 w-48 animate-fade-in flex flex-col gap-5 overflow-y-auto custom-scrollbar max-h-[calc(100vh-6rem)]">
                    {selectedMarkerId && (
                        <div className="flex flex-col gap-3 pb-3 border-b border-gray-800">
                             {['photo', 'foundation_line', 'crack_line', 'blower_fan', 'spray_arrow', 'access_point'].includes(selectedMarker?.type || '') && (
                                <div>
                                    <label className="text-[9px] font-black text-blue-400 uppercase block mb-2 tracking-widest">サイズ / 長さ: {selectedMarker?.length?.toFixed(1)}</label>
                                    <input 
                                        type="range" min="0.2" max="20.0" step="0.1" 
                                        value={selectedMarker?.length || 1} 
                                        onChange={(e) => updateMarker(selectedMarkerId, { length: parseFloat(e.target.value) })} 
                                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                    />
                                </div>
                            )}
                             {['photo', 'foundation_line', 'crack_line', 'blower_fan', 'spray_arrow', 'access_point', 'text_toilet', 'text_washroom', 'text_tiled_bath', 'text_ub', 'text_laundry', 'text_laundry_room', 'text_nando', 'text_western', 'text_free_room', 'text_butsu', 'text_toko', 'text_lcl', 'text_den', 'text_changing', 'text_wash_change', 'text_entrance', 'text_hall', 'text_corridor', 'text_stairs', 'text_ldk', 'text_ld', 'text_living', 'text_dining', 'text_kitchen', 'text_japanese', 'text_closet', 'text_wcl', 'text_shoes'].includes(selectedMarker?.type || '') && (
                                <div className="pt-3 border-t border-gray-800">
                                    <label className="text-[9px] font-black text-blue-400 uppercase block mb-2 tracking-widest">回転: {selectedMarker?.rotation || 0}°</label>
                                    <input 
                                        type="range" min="0" max="359" step="1" 
                                        value={selectedMarker?.rotation || 0} 
                                        onChange={(e) => updateMarker(selectedMarkerId, { rotation: parseInt(e.target.value) })} 
                                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-2 tracking-widest">描画の太さ: {currentLineThickness}</label>
                        <input 
                            type="range" min="1" max="25" value={currentLineThickness} 
                            onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 setCurrentLineThickness(val);
                                 if (selectedMarkerId) updateMarker(selectedMarkerId, { lineThickness: val });
                            }} 
                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                        />
                    </div>
                    {isGridMode && (
                        <div className="pt-2 border-t border-gray-800">
                            <label className="text-[9px] font-black text-gray-400 uppercase block mb-2 tracking-widest">グリッド間隔: {gridSize}</label>
                            <input 
                                type="range" min="20" max="120" step="5" value={gridSize} 
                                onChange={(e) => setGridSize(Number(e.target.value))} 
                                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
