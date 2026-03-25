import mammoth from 'mammoth'

export async function extractWordText(file: File): Promise<string> {
  const ab = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer: ab })
  return value.trim()
}
