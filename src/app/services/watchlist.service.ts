import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const KEY = 'watchlist';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private set = new Set<string>();
  private subject = new BehaviorSubject<Set<string>>(new Set());
  readonly watchlist$ = this.subject.asObservable();

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      (raw ? JSON.parse(raw) : []).forEach((id: string) => this.set.add(String(id)));
    } catch {}
    this.emit();
  }

  has(id: string | number)       { return this.set.has(String(id)); }
  add(id: string | number)       { const s = String(id); if (!this.set.has(s)) { this.set.add(s); this.persist(); } }
  remove(id: string | number)    { if (this.set.delete(String(id))) this.persist(); }
  toggle(id: string | number)    { this.has(id) ? this.remove(id) : this.add(id); }
  clear()                        { if (this.set.size) { this.set.clear(); this.persist(); } }

  private persist() { localStorage.setItem(KEY, JSON.stringify([...this.set])); this.emit(); }
  private emit()    { this.subject.next(new Set(this.set)); }
}
