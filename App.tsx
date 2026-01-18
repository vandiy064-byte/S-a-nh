
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, Download, Trash2, Sliders, Image as ImageIcon, Loader2, Check, X, Plus, Layers, ArrowRight, Undo2, Redo2, Paintbrush, Eraser, Eye, MousePointer2, Move, Focus } from 'lucide-react';
import { EditorState } from './types';
import CanvasEditor from './components/CanvasEditor';
import { editImage } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<EditorState>({
    originalImage: null,
    maskData: null,
    resultImage: null,
    subjectImage: null,
    subjectMaskData: null,
    isProcessing: false,
    prompt: '',
    brushSize: 40,
    history: [],
    historyIndex: -1,
    editMode: 'PAINT',
    zoomSpeed: 5,
    panSensitivity: 5,
  });

  const [activeTab, setActiveTab] = useState<'MAIN' | 'SUBJECT'>('MAIN');
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'original' | 'subject') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        if (type === 'original') {
          setState(prev => ({
            ...prev,
            originalImage: data,
            resultImage: null,
            maskData: null,
            history: [data],
            historyIndex: 0,
          }));
          setActiveTab('MAIN');
        } else {
          setState(prev => ({
            ...prev,
            subjectImage: data,
            subjectMaskData: null
          }));
          setActiveTab('SUBJECT'); // Chuyển sang tô ảnh ghép ngay khi upload
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!state.originalImage || !state.prompt) return;

    setState(prev => ({ ...prev, isProcessing: true }));
    setError(null);

    try {
      const editedBase64 = await editImage(
        state.originalImage,
        state.prompt,
        state.maskData,
        state.subjectImage,
        state.subjectMaskData
      );

      if (editedBase64) {
        setState(prev => ({
          ...prev,
          resultImage: editedBase64,
          isProcessing: false,
        }));
      } else {
        throw new Error("Gemini AI không thể ghép ảnh. Thử tô vùng chọn rõ hơn.");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi xử lý ảnh.");
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const applyResult = () => {
    if (!state.resultImage) return;
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(state.resultImage);
    
    setState(prev => ({
      ...prev,
      originalImage: state.resultImage,
      resultImage: null,
      maskData: null,
      subjectMaskData: null,
      prompt: '',
      history: newHistory,
      historyIndex: newHistory.length - 1
    }));
    setShowOriginal(false);
    setActiveTab('MAIN');
  };

  const undo = () => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      setState(prev => ({
        ...prev,
        originalImage: state.history[newIndex],
        historyIndex: newIndex,
        resultImage: null,
        maskData: null,
        subjectMaskData: null
      }));
    }
  };

  const redo = () => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      setState(prev => ({
        ...prev,
        originalImage: state.history[newIndex],
        historyIndex: newIndex,
        resultImage: null,
        maskData: null,
        subjectMaskData: null
      }));
    }
  };

  const deleteResult = () => {
    setState(prev => ({ ...prev, resultImage: null }));
    setShowOriginal(false);
  };

  const downloadResult = () => {
    const target = state.resultImage || state.originalImage;
    if (!target) return;
    const link = document.createElement('a');
    link.href = target;
    link.download = `magic-edit-${Date.now()}.png`;
    link.click();
  };

  const resetAll = () => {
    setState({
      originalImage: null,
      maskData: null,
      resultImage: null,
      subjectImage: null,
      subjectMaskData: null,
      isProcessing: false,
      prompt: '',
      brushSize: 40,
      history: [],
      historyIndex: -1,
      editMode: 'PAINT',
      zoomSpeed: 5,
      panSensitivity: 5,
    });
    setError(null);
    setActiveTab('MAIN');
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans p-4 md:p-8 selection:bg-indigo-500/30">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-[22px] shadow-2xl shadow-indigo-500/40 border border-white/10">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-indigo-400">
              Magic Edit AI
            </h1>
            <p className="text-indigo-400/80 text-xs font-black uppercase tracking-[0.3em] mt-1">Ghép ảnh & Chỉnh sửa chính xác</p>
          </div>
        </div>
        
        {state.originalImage && (
          <div className="flex items-center gap-4 bg-slate-900/40 p-2 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
            <div className="flex gap-1 p-1 bg-black/40 rounded-2xl border border-slate-800">
              <button onClick={undo} disabled={state.historyIndex <= 0} className="p-2.5 hover:bg-slate-800 disabled:opacity-20 rounded-xl transition-all text-slate-300"><Undo2 className="w-5 h-5" /></button>
              <button onClick={redo} disabled={state.historyIndex >= state.history.length - 1} className="p-2.5 hover:bg-slate-800 disabled:opacity-20 rounded-xl transition-all text-slate-300"><Redo2 className="w-5 h-5" /></button>
            </div>
            <button onClick={resetAll} className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-2xl transition-all text-red-400 font-bold text-sm"><Trash2 className="w-4 h-4" /> Reset</button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto">
        {!state.originalImage ? (
          <div className="flex flex-col items-center justify-center h-[70vh] border-2 border-dashed border-indigo-500/20 rounded-[50px] bg-slate-900/10 backdrop-blur-3xl group hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'original')} />
            <div className="relative p-10 bg-indigo-600/10 rounded-full mb-8 group-hover:scale-110 transition-transform duration-700 shadow-inner">
              <Upload className="w-14 h-14 text-indigo-400" />
              <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20" />
            </div>
            <h2 className="text-3xl font-black mb-3">Tải ảnh nền để bắt đầu</h2>
            <p className="text-slate-500 text-xl font-medium tracking-tight">Kéo thả ảnh vào đây hoặc nhấp chuột</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Editor Container */}
            <div className="lg:col-span-8 space-y-6">
              {/* Tab Switcher */}
              <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-[24px] border border-slate-800/50 w-fit">
                <button 
                  onClick={() => setActiveTab('MAIN')}
                  className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'MAIN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Tô vùng trên Ảnh Nền
                </button>
                {state.subjectImage && (
                  <button 
                    onClick={() => setActiveTab('SUBJECT')}
                    className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'SUBJECT' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Focus className="w-3.5 h-3.5" /> Tô vùng trên Ảnh Ghép
                  </button>
                )}
              </div>

              <div className="bg-[#0c111d] border border-slate-800/80 p-4 rounded-[40px] shadow-3xl relative overflow-hidden">
                {state.resultImage ? (
                  <div className="relative animate-in fade-in zoom-in duration-700">
                    <img src={showOriginal ? state.originalImage! : state.resultImage} alt="Preview" className="w-full h-auto rounded-3xl border-4 border-slate-900 shadow-2xl transition-opacity duration-300" />
                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       {showOriginal ? "Ảnh Gốc" : "Kết Quả Mới"}
                    </div>
                    <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-6 duration-500">
                      <div className="flex gap-4 p-2 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-3xl">
                        <button onMouseDown={() => setShowOriginal(true)} onMouseUp={() => setShowOriginal(false)} onMouseLeave={() => setShowOriginal(false)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-[20px] font-black flex items-center gap-3 transition-all active:scale-95">
                          <Eye className="w-5 h-5" /> SO SÁNH
                        </button>
                        <button onClick={applyResult} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] font-black flex items-center gap-3 shadow-2xl transition-all active:scale-95">
                          <Check className="w-5 h-5" /> CHẤP NHẬN
                        </button>
                        <button onClick={deleteResult} className="px-8 py-4 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-[20px] font-black flex items-center gap-3 transition-all active:scale-95 border border-red-500/20">
                          <X className="w-5 h-5" /> XÓA
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'MAIN' ? (
                      <CanvasEditor 
                        key="main-editor"
                        imageSrc={state.originalImage!}
                        brushSize={state.brushSize}
                        onMaskChange={(mask) => setState(prev => ({ ...prev, maskData: mask }))}
                        isProcessing={state.isProcessing}
                        mode={state.editMode}
                        zoomSpeed={state.zoomSpeed}
                        panSensitivity={state.panSensitivity}
                      />
                    ) : (
                      <CanvasEditor 
                        key="subject-editor"
                        imageSrc={state.subjectImage!}
                        brushSize={state.brushSize}
                        onMaskChange={(mask) => setState(prev => ({ ...prev, subjectMaskData: mask }))}
                        isProcessing={state.isProcessing}
                        mode={state.editMode}
                        zoomSpeed={state.zoomSpeed}
                        panSensitivity={state.panSensitivity}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Config Sidebar */}
            <div className="lg:col-span-4 space-y-8 sticky top-8">
              <div className="bg-[#0c111d] border border-slate-800/80 rounded-[40px] p-8 shadow-2xl space-y-8 backdrop-blur-xl">
                
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">CÁCH THỨC SỬA ĐỔI</label>
                  <textarea
                    value={state.prompt}
                    onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Ví dụ: 'Ghép chú chó này vào sân cỏ', 'Chỉnh độ sáng vùng đã tô'..."
                    className="w-full h-28 bg-[#050810] border border-slate-800/80 rounded-3xl p-6 text-slate-100 placeholder:text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-medium"
                  />
                </div>

                {/* Subject Asset Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">ẢNH MUỐN GHÉP VÀO</label>
                  </div>
                  {state.subjectImage ? (
                    <div className="relative rounded-3xl overflow-hidden group border-2 border-indigo-500/30 bg-[#050810] shadow-2xl">
                      <img src={state.subjectImage} alt="Reference" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => subjectInputRef.current?.click()} className="p-3 bg-indigo-600 rounded-2xl hover:bg-indigo-500 transition-all active:scale-90"><Upload className="w-5 h-5" /></button>
                        <button onClick={() => setState(prev => ({ ...prev, subjectImage: null, subjectMaskData: null }))} className="p-3 bg-red-600 rounded-2xl hover:bg-red-500 transition-all active:scale-90"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => subjectInputRef.current?.click()} className="w-full h-20 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all text-slate-600 group">
                      <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Chọn ảnh vật thể</span>
                    </button>
                  )}
                  <input type="file" ref={subjectInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'subject')} />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">CHẾ ĐỘ TÔ MÀU</label>
                  <div className="grid grid-cols-2 gap-3 bg-black/40 p-2 rounded-3xl border border-slate-800/80 shadow-inner">
                    <button onClick={() => setState(prev => ({ ...prev, editMode: 'PAINT' }))} className={`flex items-center justify-center gap-3 py-3 rounded-2xl font-black text-[10px] transition-all tracking-widest ${state.editMode === 'PAINT' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-800/50'}`}>
                      <Paintbrush className="w-3.5 h-3.5" /> VẼ VÙNG
                    </button>
                    <button onClick={() => setState(prev => ({ ...prev, editMode: 'ERASE' }))} className={`flex items-center justify-center gap-3 py-3 rounded-2xl font-black text-[10px] transition-all tracking-widest ${state.editMode === 'ERASE' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-800/50'}`}>
                      <Eraser className="w-3.5 h-3.5" /> XÓA VÙNG
                    </button>
                  </div>
                </div>

                <div className="space-y-6 pt-2 border-t border-slate-800/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">CỠ CỌ: {state.brushSize}PX</label>
                    </div>
                    <input type="range" min="5" max="200" value={state.brushSize} onChange={(e) => setState(prev => ({ ...prev, brushSize: parseInt(e.target.value) }))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[10px] font-bold flex items-center gap-3">
                    <X className="w-4 h-4 shrink-0" /> <p>{error}</p>
                  </div>
                )}

                <div className="pt-2">
                  {!state.resultImage ? (
                    <button
                      onClick={handleEdit}
                      disabled={state.isProcessing || !state.prompt}
                      className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:text-slate-600 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 group relative overflow-hidden"
                    >
                      {state.isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> ĐANG XỬ LÝ...</> : <><Sparkles className="w-5 h-5" /> BẮT ĐẦU GHÉP/SỬA</>}
                    </button>
                  ) : (
                    <button onClick={downloadResult} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95">
                      <Download className="w-5 h-5" /> TẢI ẢNH KẾT QUẢ
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto mt-24 pt-10 border-t border-slate-900/50 text-center text-slate-700 text-[10px] font-black uppercase tracking-[0.5em] pb-16">
        PRECISE AI MANIPULATION • GEMINI 2.5 FLASH • MAGIC EDIT AI
      </footer>
    </div>
  );
};

export default App;
