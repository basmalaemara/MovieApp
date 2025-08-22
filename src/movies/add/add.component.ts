import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MovieService } from '../../core/services/movie.service';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add.component.html',
})
export class AddComponent {
  categories = ['SCI_FI', 'BIOGRAPHY', 'ACTION', 'DRAMA', 'COMEDY'];
  ratings = ['G', 'PG', 'PG13', 'R', 'NR'];

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    releaseYear: [null, [Validators.required, Validators.min(1888)]],
    category: ['SCI_FI', Validators.required],  // strings (no enums)
    rating: ['PG13', Validators.required],      // strings (no enums)
    duration: [null],
    director: [''],
    cast: [''],
    imdbRating: [null],
    posterUrl: [''],
  });

  submitting = false;

  constructor(private fb: FormBuilder, private movies: MovieService, private router: Router) {}

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;

    // Transform cast string -> array
    const value = this.form.value;
    const payload = {
      ...value,
      cast: (value.cast || '')
        .toString()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    };

    this.movies.createMovie(payload as any).subscribe({
      next: (created) => {
        this.submitting = false;
        // Navigate to detail or list – your choice:
        this.router.navigate(['/movies', created.id]);
      },
      error: (err: unknown) => {
        console.error(err);
        this.submitting = false;
        alert('Failed to add movie. Check console for details.');
      }
    });
  }
}
