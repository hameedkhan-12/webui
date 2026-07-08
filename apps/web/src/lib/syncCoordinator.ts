export class SyncCoordinator {
  private applying = false;
  private lastWrittenHash = new Map<string, number>();

  startApplying(): void {
    this.applying = true;
  }

  stopApplying(): void {
    this.applying = false;
  }

  isApplying(): boolean {
    return this.applying;
  }

  recordWrite(path: string, content: string): void {
    this.lastWrittenHash.set(path, this.hashString(content));
  }

  isOwnWrite(path: string, content: string): boolean {
    const currentHash = this.hashString(content);
    return this.lastWrittenHash.get(path) === currentHash;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

export const syncCoordinator = new SyncCoordinator();
