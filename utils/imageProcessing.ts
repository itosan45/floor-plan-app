
// Helper to load html2canvas library
let html2canvasPromise: Promise<void> | null = null;

export const loadHtml2Canvas = (): Promise<void> => {
    if (html2canvasPromise) return html2canvasPromise;
    
    html2canvasPromise = new Promise((resolve, reject) => {
        const src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        if ((window as unknown as { html2canvas: unknown }).html2canvas) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => {
            html2canvasPromise = null;
            reject(new Error('Failed to load html2canvas'));
        };
        document.body.appendChild(script);
    });
    return html2canvasPromise;
};

/**
 * 画像ファイルをリサイズ・圧縮してメモリ負荷を軽減する
 */
export const resizeImage = (file: File): Promise<{ dataUrl: string, blob: Blob }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const canvas = document.createElement('canvas');
      const maxSize = 1280; 
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low'; 
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Blob conversion failed'));
        canvas.width = 0;
        canvas.height = 0;
        img.src = "";
        resolve({ dataUrl, blob });
      }, 'image/jpeg', 0.5); 
    };
    
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    
    img.src = objectUrl;
  });
};

/**
 * html2canvasでキャプチャし、Blobとして保存する
 */
export const captureAndGenerateA4 = async (
    element: HTMLElement,
    cropRect: { x: number; y: number; w: number; h: number }
): Promise<void> => {
    const captureWidth = element.scrollWidth;
    const captureHeight = element.scrollHeight;
    
    const cropX = Math.round(cropRect.x * captureWidth);
    const cropY = Math.round(cropRect.y * captureHeight);
    const cropWidth = Math.round(cropRect.w * captureWidth);
    const cropHeight = Math.round(cropRect.h * captureHeight);

    // スケールを2.0に設定し、レンダリング精度を確保
    const sourceCanvas = await (window as unknown as { html2canvas: (element: HTMLElement, options: unknown) => Promise<HTMLCanvasElement> }).html2canvas(element, {
        scale: 2.0, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
        windowWidth: captureWidth, 
        windowHeight: captureHeight
    });

    const a4Width = 3508;
    const a4Height = 2480;
    const destinationCanvas = document.createElement('canvas');
    destinationCanvas.width = a4Width;
    destinationCanvas.height = a4Height;
    const ctx = destinationCanvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get context');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, a4Width, a4Height);
    
    const sourceRatio = sourceCanvas.width / sourceCanvas.height;
    const targetRatio = a4Width / a4Height;
    
    let drawWidth, drawHeight;
    if (sourceRatio > targetRatio) {
        drawWidth = a4Width;
        drawHeight = a4Width / sourceRatio;
    } else {
        drawHeight = a4Height;
        drawWidth = a4Height * sourceRatio;
    }
    
    const drawX = (a4Width - drawWidth) / 2;
    const drawY = (a4Height - drawHeight) / 2;
    
    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, drawX, drawY, drawWidth, drawHeight);

    await new Promise<void>((resolve, reject) => {
        destinationCanvas.toBlob((blob) => {
            try {
                if (!blob) {
                    reject(new Error('JPEG generation failed'));
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `floor_plan_A4_${Date.now()}.jpeg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                resolve();
            } finally {
                sourceCanvas.width = 0;
                sourceCanvas.height = 0;
                destinationCanvas.width = 0;
                destinationCanvas.height = 0;
            }
        }, 'image/jpeg', 0.6);
    });
};
