import axios from 'axios';

async function getThumbnailBuffer(url: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

export { getThumbnailBuffer };
