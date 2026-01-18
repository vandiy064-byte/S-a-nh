
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';

interface CanvasEditorProps {
  imageSrc: string;
  brushSize: number;
  onMaskChange: (maskBase64: string) => void;
  isProcessing: boolean;
  mode: 'PAINT' | 'ERASE';
  zoomSpeed: number;
  panSensitivity: number;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  imageSrc, 
  brushSize, 
  onMaskChange, 
  isProcessing, 
  mode,
  zoomSpeed,
  panSensitivity
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [containerHeight, setContainerHeight] = useState<number | string>('auto');

  // Initialize canvases and adjust container height to match image aspect ratio
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const imgCanvas = imageCanvasRef.current;
      const mskCanvas = maskCanvasRef.current;
      if (!imgCanvas || !mskCanvas || !viewportRef.current) return;

      const containerWidth = viewportRef.current.clientWidth;
      const aspectRatio = img.height / img.width;
      const calculatedHeight = containerWidth * aspectRatio;

      // Set internal canvas dimensions to match the display scale for perfect quality
      imgCanvas.width = img.width;
      imgCanvas.height = img.height;
      mskCanvas.width = img.width;
      mskCanvas.height = img.height;

      const ctx = imgCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0);
      }

      const mskCtx = mskCanvas.getContext('2d');
      if (mskCtx) {
        mskCtx.lineCap = 'round';
        mskCtx.lineJoin = 'round';
      }
      
      setContainerHeight(calculatedHeight);
      setTransform({ x: 0, y: 0, scale: 1 });
    };
  }, [imageSrc]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
    const mskCanvas = maskCanvasRef.current;
    if (!mskCanvas) return { x: 0, y: 0 };
    const rect = mskCanvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    // Convert screen coordinates to canvas-internal coordinates
    // We account for the actual scale factor between display and internal resolution
    const scaleX = mskCanvas.width / rect.width;
    const scaleY = mskCanvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  }, []);

  const updateCursor = (e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
    if (!cursorRef.current || !viewportRef.current) return;
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Use current scale to size the cursor visually relative to the viewport
    cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
    cursorRef.current.style.width = `${brushSize * (rect.width / (maskCanvasRef.current?.width || 1))}px`;
    cursorRef.current.style.height = `${brushSize * (rect.height / (maskCanvasRef.current?.height || 1))}px`;
    cursorRef.current.style.marginLeft = `-${(parseFloat(cursorRef.current.style.width) || 0) / 2}px`;
    cursorRef.current.style.marginTop = `-${(parseFloat(cursorRef.current.style.height) || 0) / 2}px`;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isProcessing) return;
    e.preventDefault();
    const speedFactor = zoomSpeed * 0.0005; 
    const delta = -e.deltaY;
    const newScale = Math.min(Math.max(transform.scale + delta * speedFactor, 0.1), 20);
    
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const ratio = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * ratio;
    const newY = mouseY - (mouseY - transform.y) * ratio;

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (isProcessing) return;
    
    const isMiddleClick = 'button' in e && (e as React.MouseEvent).button === 1;
    const isSpaceDown = (window as any).isSpacePressed;

    if (isMiddleClick || isSpaceDown) {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    setIsDrawing(true);
    const mskCanvas = maskCanvasRef.current;
    if (!mskCanvas) return;
    const ctx = mskCanvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.globalCompositeOperation = mode === 'ERASE' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#FF0000';
    ctx.fillStyle = '#FF0000';

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    updateCursor(e);
  };

  const stopInteraction = () => {
    setIsPanning(false);
    if (isDrawing) {
      setIsDrawing(false);
      const mskCanvas = maskCanvasRef.current;
      if (mskCanvas) {
        onMaskChange(mskCanvas.toDataURL('image/png'));
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    updateCursor(e);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    if (isPanning) {
      const factor = panSensitivity / 5;
      const dx = (clientX - lastMousePos.x) * factor;
      const dy = (clientY - lastMousePos.y) * factor;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    if (!isDrawing || isProcessing) return;
    const mskCanvas = maskCanvasRef.current;
    if (!mskCanvas) return;
    const ctx = mskCanvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });

  const clearMask = () => {
    const mskCanvas = maskCanvasRef.current;
    if (mskCanvas) {
      const ctx = mskCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, mskCanvas.width, mskCanvas.height);
        onMaskChange(mskCanvas.toDataURL('image/png'));
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        (window as any).isSpacePressed = true;
        if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        (window as any).isSpacePressed = false;
        if (viewportRef.current) viewportRef.current.style.cursor = 'none';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center w-full max-w-4xl mx-auto group">
      <div 
        ref={viewportRef}
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-950 cursor-none transition-[height] duration-300"
        style={{ 
          touchAction: 'none',
          height: containerHeight 
        }}
        onWheel={handleWheel}
        onMouseEnter={() => cursorRef.current && (cursorRef.current.style.opacity = '1')}
        onMouseLeave={() => cursorRef.current && (cursorRef.current.style.opacity = '0')}
      >
        <div 
          className="relative w-full h-full origin-top-left"
          style={{ 
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {/* Canvases are sized to internal image dimensions and styled to fill container frame perfectly */}
          <canvas ref={imageCanvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          <canvas 
            ref={maskCanvasRef} 
            className="relative z-10 w-full h-full object-contain transition-opacity duration-300 opacity-70"
            onMouseDown={startInteraction}
            onMouseMove={handleMouseMove}
            onMouseUp={stopInteraction}
            onMouseOut={stopInteraction}
            onTouchStart={startInteraction}
            onTouchMove={handleMouseMove}
            onTouchEnd={stopInteraction}
          />
        </div>

        {/* Viewport UI Overlays */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 p-1 shadow-lg">
            <button onClick={() => setTransform(t => ({...t, scale: Math.min(t.scale + 0.5, 20)}))} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ZoomIn className="w-4 h-4"/></button>
            <button onClick={() => setTransform(t => ({...t, scale: Math.max(t.scale - 0.5, 0.1)}))} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ZoomOut className="w-4 h-4"/></button>
            <button onClick={resetZoom} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><RotateCcw className="w-4 h-4"/></button>
          </div>
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black font-mono text-indigo-400">
            {Math.round(transform.scale * 100)}%
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Move className="w-3 h-3 text-indigo-500" />
            Space + Kéo để di chuyển
          </div>
        </div>

        <div 
          ref={cursorRef}
          className={`pointer-events-none absolute top-0 left-0 border-2 rounded-full z-20 transition-[opacity] duration-75 ease-out opacity-0 ${mode === 'ERASE' ? 'border-white bg-red-500/10' : 'border-white bg-white/20'}`}
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }}
        />
      </div>

      <div className="mt-4 flex gap-4 w-full justify-between items-center bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-3">
           <div className={`w-4 h-4 rounded-full ${mode === 'PAINT' ? 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.5)]' : 'bg-slate-400'}`}></div>
           <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
             {mode === 'PAINT' ? 'Chế độ: Vẽ Mask' : 'Chế độ: Xóa Mask'}
           </span>
        </div>
        <button 
          onClick={clearMask}
          className="px-4 py-2 bg-slate-700 hover:bg-red-900/40 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-600 hover:border-red-500/50 flex items-center gap-2 shadow-sm active:scale-95"
        >
          Xóa Toàn Bộ
        </button>
      </div>
    </div>
  );
};

export default CanvasEditor;
