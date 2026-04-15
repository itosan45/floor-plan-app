
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Photo } from '../types';
import { generateUniqueId } from '../utils/common';
import { XMarkIcon, CameraIcon } from './icons';
import { blobToDataUrl } from '../utils/imageProcessing';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (photo: Photo) => void;
    photoCount: number;
    isUnderfloorMode?: boolean;
    isManualCameraMode?: boolean;
    initialData?: { x: number; y: number; rotation: number; length: number } | null;
}

export const CameraModal: React.FC<CameraModalProps> = ({
    isOpen,
    onClose,
    onCapture,
    photoCount
}) => {
    const isNativePlatform = Capacitor.isNativePlatform();
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const buildCapturedPhoto = useCallback(async (source: { dataUrl?: string; webPath?: string; path?: string }) => {
        if (source.dataUrl) {
            const blob = await fetch(source.dataUrl).then(response => response.blob());
            return { blob, dataUrl: source.dataUrl };
        }

        const assetUrl = source.webPath ?? source.path;
        if (!assetUrl) {
            throw new Error('撮影結果の保存先が取得できませんでした');
        }

        const response = await fetch(assetUrl);
        if (!response.ok) {
            throw new Error('撮影画像の読み込みに失敗しました');
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return { blob, dataUrl };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', 
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 } 
                },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            alert("カメラの起動に失敗しました。ブラウザの設定で許可されているか確認してください。");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhotoNative = useCallback(async () => {
        if (isCapturing) return;
        setIsCapturing(true);

        try {
            await Camera.requestPermissions({ permissions: ['camera'] });

            const result = await Camera.takePhoto({
                quality: 80,
                saveToGallery: false,
                correctOrientation: true,
                editable: 'no',
            });

            const { blob, dataUrl } = await buildCapturedPhoto(result);
            const label = `${photoCount + 1} 点検箇所`;

            onCapture({
                id: generateUniqueId(),
                blob,
                dataUrl,
                label,
                timestamp: new Date().toLocaleString('ja-JP'),
            });
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (!/cancel/i.test(message)) {
                console.error('Native camera capture error:', err);
                alert('カメラの起動に失敗しました。端末の権限設定を確認してください。');
            }
            onClose();
        } finally {
            setIsCapturing(false);
        }
    }, [buildCapturedPhoto, isCapturing, onCapture, onClose, photoCount]);

    useEffect(() => {
        if (isOpen) {
            if (isNativePlatform) {
                void capturePhotoNative();
            } else {
                void startCamera();
            }
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [capturePhotoNative, isOpen, isNativePlatform]);

    const capturePhoto = useCallback(() => {
        if (isNativePlatform) {
            void capturePhotoNative();
            return;
        }

        if (!videoRef.current || !canvasRef.current || isCapturing) return;
        setIsCapturing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const maxSize = 1600; 
        let w = video.videoWidth;
        let h = video.videoHeight;
        
        if (w > h) {
            if (w > maxSize) { h *= maxSize / w; w = maxSize; }
        } else {
            if (h > maxSize) { w *= maxSize / h; h = maxSize; }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsCapturing(false);
            return;
        }

        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        canvas.toBlob((blob) => {
            if (!blob) {
                setIsCapturing(false);
                return;
            }
            const label = `${photoCount + 1} 点検箇所`;

            const newPhoto: Photo = {
                id: generateUniqueId(),
                blob: blob,
                dataUrl,
                label: label,
                timestamp: new Date().toLocaleString('ja-JP'),
            };

            onCapture(newPhoto);
            
            setIsCapturing(false);
        }, 'image/jpeg', 0.8);

    }, [capturePhotoNative, isCapturing, isNativePlatform, onCapture, photoCount]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-fade-in overflow-hidden">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-20 pointer-events-none">
                <div className="bg-black/60 backdrop-blur px-5 py-2 rounded-2xl border border-white/10 shadow-xl pointer-events-auto">
                    <span className="text-white text-base font-black tracking-tight flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        撮影箇所: {photoCount + 1}
                    </span>
                </div>
                <button onClick={onClose} className="p-4 bg-black/60 backdrop-blur rounded-2xl text-white shadow-xl pointer-events-auto active:scale-90 transition-transform">
                    <XMarkIcon className="w-8 h-8" />
                </button>
            </div>

            {/* Video Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-gray-900">
                {isNativePlatform ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center text-white">
                        <div className="rounded-full bg-white/10 p-6">
                            {isCapturing
                                ? <div className="h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent" />
                                : <CameraIcon className="h-16 w-16 text-white" />}
                        </div>
                        <div className="space-y-2">
                            <p className="text-2xl font-black tracking-tight">システムカメラを起動中</p>
                            <p className="text-sm font-bold text-white/70">
                                撮影後にチェックを押すと、この図面へ自動で戻って記録します。
                            </p>
                        </div>
                    </div>
                ) : (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className="w-full h-full object-cover"
                    />
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Visual Guide Overlay */}
                {!isNativePlatform && (
                    <div className="absolute inset-0 border-[60px] border-black/20 pointer-events-none">
                        <div className="w-full h-full border-2 border-white/20 rounded-lg" />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-40 bg-black flex justify-center items-center relative z-20 px-10">
                <div className="flex-1" />
                {isNativePlatform ? (
                    <button
                        onClick={() => void capturePhotoNative()}
                        disabled={isCapturing}
                        className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isCapturing ? 'カメラ起動中...' : 'もう一度カメラを開く'}
                    </button>
                ) : (
                    <button 
                        onClick={capturePhoto} 
                        disabled={isCapturing}
                        className={`w-24 h-24 rounded-full border-8 transition-all active:scale-90 disabled:opacity-50 ${isCapturing ? 'border-gray-600' : 'border-white'}`}
                    >
                        <div className="w-full h-full rounded-full bg-red-600 flex items-center justify-center border-4 border-black">
                            {isCapturing ? <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" /> : <CameraIcon className="w-10 h-10 text-white" />}
                        </div>
                    </button>
                )}
                <div className="flex-1" />
            </div>
        </div>
    );
};
