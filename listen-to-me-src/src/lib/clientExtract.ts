/** 仅在「浏览器内解析」且后端不可用时按需加载，减小首屏 JS */

export async function extractDocumentText(file: File): Promise<string> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
    throw new Error('暂不支持旧版 .doc，请在 Word 中另存为 .docx 后上传')
  }
  if (lower.endsWith('.pdf')) {
    const { extractPdfText } = await import('./extractPdfText')
    return extractPdfText(file)
  }
  if (lower.endsWith('.docx')) {
    const { extractWordText } = await import('./extractWordText')
    return extractWordText(file)
  }
  throw new Error('仅支持 PDF 或 Word（.docx）')
}
