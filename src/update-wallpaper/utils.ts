import axios from 'axios';

export async function getHttpContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
      }
    });
    if (typeof response.data === 'object') {
      return JSON.stringify(response.data);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching http content:', error);
    return '';
  }
}

export function log(msg: string, ...args: any[]) {
  if (args.length > 0) {
    console.log(msg, ...args);
  } else {
    console.log(msg);
  }
}
