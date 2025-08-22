import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MovieService, Movie } from '../../core/services/movie.service';

const FALLBACK = 'https://placehold.co/400x600?text=No+Image';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.component.html',
})
export class DetailComponent implements OnDestroy {
  movie?: Movie;
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movies: MovieService,
  ) {
    this.sub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.movies.getMovieById(id).subscribe(m => (this.movie = m));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  back(): void {
    this.router.navigate(['/movies/list']);
  }

  onImgError(ev: Event): void {
    const img = ev.target as HTMLImageElement;
    img.src = FALLBACK;
  }
}
