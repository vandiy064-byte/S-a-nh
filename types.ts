
export interface EditorState {
  originalImage: string | null;
  maskData: string | null;
  resultImage: string | null;
  subjectImage: string | null;
  subjectMaskData: string | null; // Mask cho ảnh vật thể cần ghép
  isProcessing: boolean;
  prompt: string;
  brushSize: number;
  history: string[];
  historyIndex: number;
  editMode: 'PAINT' | 'ERASE';
  zoomSpeed: number;
  panSensitivity: number;
}

export enum EditMode {
  PAINT = 'PAINT',
  ERASE = 'ERASE',
}
