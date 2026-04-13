
import { Marker, MarkerType } from '../types';
import { MARKER_DEFINITIONS, BASE_CONTAINER_WIDTH } from '../constants';

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * 全マーカーを包含する最小の境界ボックスを計算する
 * 画像アップロード時は画像全体(0-1)を基準とし、方眼紙モードは描画範囲のみを基準とします。
 */
export const calculateMarkersBoundingBox = (
    markers: Marker[],
    canvasWidth: number,
    floorPlanAspectRatio: number | null,
    gridSize: number,
    isGridMode: boolean,
    padding: number = 0.05
): Rect => {
    const canvasHeight = canvasWidth / (floorPlanAspectRatio || 1);
    
    // 方眼紙モード（画像なし）の場合は描画パーツのみにフィットさせるため Infinity で開始
    // 画像がある場合は 0-1 の範囲をベースとする
    let minX = isGridMode ? Infinity : 0;
    let minY = isGridMode ? Infinity : 0;
    let maxX = isGridMode ? -Infinity : 1;
    let maxY = isGridMode ? -Infinity : 1;

    if (markers.length === 0) {
        return { x: 0, y: 0, w: 1, h: 1 };
    }

    markers.forEach(m => {
        const def = MARKER_DEFINITIONS[m.type];
        let points: {x: number, y: number}[] = [{ x: m.x, y: m.y }];

        if (m.type === 'room' && m.gridW && m.gridH) {
            const rw = (m.gridW * gridSize) / canvasWidth;
            const rh = (m.gridH * gridSize) / canvasHeight;
            points.push({ x: m.x + rw, y: m.y + rh });
        } else if (def.interaction === 'area' && m.width && m.height) {
            points.push({ x: m.x + m.width, y: m.y + m.height });
        } else if (def.interaction === 'line' && m.length != null && m.rotation != null) {
            const angleRad = (m.rotation * Math.PI) / 180;
            const renderScale = canvasWidth / BASE_CONTAINER_WIDTH;
            const distPx = isGridMode ? (m.length * gridSize) : (m.length * 60 * renderScale);
            const dx = (Math.cos(angleRad) * distPx) / canvasWidth;
            const dy = (Math.sin(angleRad) * distPx) / canvasHeight;
            points.push({ x: m.x + dx, y: m.y + dy });
        } else if (m.type === 'photo' && m.length != null && m.rotation != null) {
            const angleRad = (m.rotation * Math.PI) / 180;
            const distPx = isGridMode && gridSize ? gridSize : 30 * (canvasWidth / BASE_CONTAINER_WIDTH);
            const dx = (Math.cos(angleRad) * distPx * m.length) / canvasWidth;
            const dy = (Math.sin(angleRad) * distPx * m.length) / canvasHeight;
            points.push({ x: m.x + dx, y: m.y + dy });
            const buf = 0.03;
            points.push({ x: m.x - buf, y: m.y - buf });
            points.push({ x: m.x + buf, y: m.y + buf });
        } else {
            const pSize = 0.04; 
            points.push({ x: m.x - pSize, y: m.y - pSize });
            points.push({ x: m.x + pSize, y: m.y + pSize });
        }

        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    });

    let finalX, finalY, finalMaxX, finalMaxY;

    if (isGridMode) {
        // 方眼紙モードは描画物に余白をつけて切り抜く
        finalX = minX - padding;
        finalY = minY - padding;
        finalMaxX = maxX + padding;
        finalMaxY = maxY + padding;
    } else {
        // 画像モードは 0-1 (画像範囲) を優先し、マーカーがはみ出した時だけ広げる
        // マーカーが画像内にある場合は 0-1 で固定し、不必要な余白を作らない
        finalX = (minX < 0) ? minX - padding : 0;
        finalY = (minY < 0) ? minY - padding : 0;
        finalMaxX = (maxX > 1) ? maxX + padding : 1;
        finalMaxY = (maxY > 1) ? maxY + padding : 1;
    }

    const w = finalMaxX - finalX;
    const h = finalMaxY - finalY;

    return { x: finalX, y: finalY, w: Math.max(0.05, w), h: Math.max(0.05, h) };
};

/**
 * 表示枠に合わせてフィット＆センターの座標を計算する
 */
export const calculateFitAndCenter = (
    cropBox: Rect,
    containerWidth: number,
    containerHeight: number,
    contentWidth: number,
    contentHeight: number
) => {
    // クロップエリアの実際のピクセルサイズ
    const targetW = cropBox.w * contentWidth;
    const targetH = cropBox.h * contentHeight;

    // コンテナに収めるための倍率
    const zoom = Math.min(containerWidth / targetW, containerHeight / targetH);

    // 全体の描画サイズ
    const renderedWidth = targetW * zoom;
    const renderedHeight = targetH * zoom;

    // クロップエリアの左上(cropBox.x, cropBox.y)をコンテナの中央に持ってくるためのオフセット
    const offsetX = ((containerWidth - renderedWidth) / 2) - (cropBox.x * contentWidth * zoom);
    const offsetY = ((containerHeight - renderedHeight) / 2) - (cropBox.y * contentHeight * zoom);

    return { zoom, offsetX, offsetY };
};
