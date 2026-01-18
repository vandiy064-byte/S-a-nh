
import { GoogleGenAI } from "@google/genai";

export const editImage = async (
  originalBase64: string, 
  prompt: string, 
  maskBase64?: string | null,
  subjectBase64?: string | null,
  subjectMaskBase64?: string | null
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];

  // 1. Ảnh nền (Image 1)
  const cleanOriginal = originalBase64.split(',')[1] || originalBase64;
  parts.push({
    inlineData: {
      data: cleanOriginal,
      mimeType: 'image/png',
    },
  });

  // 2. Mask của ảnh nền (Vị trí đặt - Image 2)
  if (maskBase64) {
    const cleanMask = maskBase64.split(',')[1] || maskBase64;
    parts.push({
      inlineData: {
        data: cleanMask,
        mimeType: 'image/png',
      },
    });
  }

  // 3. Ảnh vật thể cần ghép (Image 3)
  if (subjectBase64) {
    const cleanSubject = subjectBase64.split(',')[1] || subjectBase64;
    parts.push({
      inlineData: {
        data: cleanSubject,
        mimeType: 'image/png',
      },
    });
  }

  // 4. Mask của ảnh vật thể (Vùng cần lấy - Image 4)
  if (subjectMaskBase64) {
    const cleanSubMask = subjectMaskBase64.split(',')[1] || subjectMaskBase64;
    parts.push({
      inlineData: {
        data: cleanSubMask,
        mimeType: 'image/png',
      },
    });
  }

  let fullPrompt = `NHIỆM VỤ: GHÉP VẬT THỂ TỪ ẢNH PHỤ VÀO ẢNH NỀN VỚI ĐỘ CHÍNH XÁC CAO.

DỮ LIỆU ĐẦU VÀO:
- ẢNH 1: Ảnh bối cảnh/nền.
- ẢNH 2: MASK ĐỎ TRÊN NỀN. Xác định VỊ TRÍ và KÍCH THƯỚC vật thể sẽ được đặt vào.
- ẢNH 3: Ảnh chứa vật thể muốn lấy.
${subjectMaskBase64 ? "- ẢNH 4: MASK ĐỎ TRÊN VẬT THỂ. Chỉ lấy phần nội dung được tô đỏ ở Ảnh 3 để ghép." : "- Nếu không có Ảnh 4, hãy tự động tách vật thể chính ở Ảnh 3."}

HƯỚNG DẪN GHÉP:
1. TRÍCH XUẤT: Cắt phần nội dung nằm trong vùng mask đỏ của Ảnh 3 (hoặc vật thể chính).
2. CHÈN: Đặt phần nội dung đó vào ĐÚNG vùng mask đỏ của Ảnh 1.
3. HÒA TRỘN: Điều chỉnh ánh sáng, màu sắc, bóng đổ và phối cảnh của vật thể sao cho tiệp hoàn toàn với Ảnh 1.
4. MÔ TẢ: "${prompt}". Thực hiện các điều chỉnh bổ sung dựa trên yêu cầu này.
5. BẢO TOÀN: Tuyệt đối không thay đổi bất kỳ pixel nào nằm ngoài vùng mask đỏ của Ảnh 1.

KẾT QUẢ: Trả về ảnh đã ghép hoàn chỉnh, mượt mà, không bị bóp méo hình dạng vật thể.`;

  parts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
