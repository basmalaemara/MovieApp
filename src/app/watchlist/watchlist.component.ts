import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { MovieService, Movie } from '../../core/services/movie.service';
import { WatchlistService } from '../services/watchlist.service';
import { Category } from '../enums/category.enum';

const FALLBACK = 'https://placehold.co/400x600?text=No+Image';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], // needed for [(ngModel)]
  templateUrl: './watchlist.component.html',
})
export class WatchlistComponent {
  FALLBACK = FALLBACK;

  // Category enum in UI (plus 'All')
  categories: (Category | 'All')[] = ['All', ...Object.values(Category)];
  selectedCategory: Category | 'All' = 'All';

  // Rendered list
  filteredMovies: Movie[] = [];

  // Internal source = movies ∩ watchlist
  private inWatchlistMovies: Movie[] = [];

  constructor(
    private movies: MovieService,
    public watchlist: WatchlistService
  ) {
    combineLatest([this.movies.getMovies(), this.watchlist.watchlist$]).subscribe(
      ([all, ids]) => {
        this.inWatchlistMovies = all.filter(m => ids.has(String(m.id)));
        this.applyFilter();
      }
    );
  }

  // Called by (change) on <select>
  applyFilter(): void {
    const sel = this.selectedCategory;
    this.filteredMovies =
      sel === 'All'
        ? this.inWatchlistMovies
        : this.inWatchlistMovies.filter(m => m.category === sel);
  }

  // Buttons
  toggleWatchlist(id: string): void {
    this.watchlist.toggle(id);
    // list refreshes via subscription
  }

  isIn(id: string): boolean {
    return this.watchlist.has(id);
  }

  trackById(_: number, m: Movie) { return m.id; }

  onImgError(ev: Event): void {
    (ev.target as HTMLImageElement).src = FALLBACK;
  }
}
