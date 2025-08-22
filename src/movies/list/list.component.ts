// src/movies/list/list.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MovieService, Movie } from '../../core/services/movie.service';
import { Category } from '../../app/enums/category.enum';
import { WatchlistService } from '../../app/services/watchlist.service';

type MovieId = Movie['id'];

// Module-level constant (safe to reuse anywhere in this file)
const FALLBACK = 'https://placehold.co/400x600?text=No+Image';


@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './list.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ListComponent {
  // expose for template usage if needed
  readonly FALLBACK = FALLBACK;

  categories: (Category | 'All')[] = ['All', ...Object.values(Category)];

  private _selectedCategory: Category | 'All' = 'All';
  get selectedCategory(): Category | 'All' {
    return this._selectedCategory;
  }
  set selectedCategory(val: Category | 'All') {
    this._selectedCategory = val;
    this.applyFilter();
  }

  movies: Movie[] = [];
  filteredMovies: Movie[] = [];

  constructor(
    private moviesService: MovieService,
    public watchlist: WatchlistService // public so template can call has()
  ) {
    this.moviesService.getMovies().subscribe((ms) => {
      this.movies = ms ?? [];
      this.applyFilter();
    });
  }

  applyFilter(): void {
    const sel = this._selectedCategory;
    this.filteredMovies =
      sel === 'All' ? this.movies.slice() : this.movies.filter((m) => m.category === sel);
  }

  add(id: MovieId): void {
    this.watchlist.add(String(id));
    this.filteredMovies = [...this.filteredMovies];
  }

  toggleWatchlist(id: MovieId): void {
    this.watchlist.toggle(String(id));
    this.filteredMovies = [...this.filteredMovies];
  }

  isIn(id: MovieId): boolean {
    return this.watchlist.has(String(id));
  }

  trackById(_: number, m: Movie) {
    return m.id;
  }

  // --- IMAGE HELPERS (inside the class) ---

  private normalizePoster(url?: string): string {
    if (!url) return FALLBACK;
    let u = url.trim();

    // prepend protocol if starts with '//' or missing protocol
    if (/^\/\//.test(u)) u = 'https:' + u;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');

    return u;
  }

  // Use this for [src] binding
  getPoster(m: { posterUrl?: string }): string {
    return this.normalizePoster(m.posterUrl) || FALLBACK;
  }

onImgError(ev: Event): void {
  const img = ev.target as HTMLImageElement | null;
  if (!img) return;

  if (img.getAttribute('data-fallback-applied') === '1') return;

  img.src = FALLBACK;
  img.setAttribute('data-fallback-applied', '1');
}


}
