import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener';

export async function openUrl(url: string): Promise<void> {
  try {
    await tauriOpenUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}
