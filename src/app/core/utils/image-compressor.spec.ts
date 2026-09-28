import { describe, expect, it } from 'vitest';
import { compressImageToBlob, blobToDataUrl } from './image-compressor';

describe('image-compressor utils', () => {
  it('should reject when file is not an image', async () => {
    const invalidFile = new File(['hello world'], 'doc.txt', { type: 'text/plain' });
    await expect(compressImageToBlob(invalidFile)).rejects.toThrow(
      'O arquivo selecionado não é uma imagem válida.'
    );
  });

  it('should convert blob to dataUrl correctly', async () => {
    const blob = new Blob(['test-data'], { type: 'text/plain' });
    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl).toContain('data:text/plain;base64,');
  });
});
