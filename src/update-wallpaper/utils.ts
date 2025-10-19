export async function getHttpContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Bing API sometimes returns JSON, sometimes not, so we handle both
    const text = await response.text();
    try {
      // Try to parse as JSON, if it fails, return the text
      JSON.parse(text);
      return text; // It's valid JSON, return as string
    } catch (e) {
      return text; // Not JSON, return as is
    }
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
