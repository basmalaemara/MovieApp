// src/core/services/movie.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Category } from '../../app/enums/category.enum';
import { Rating } from '../../app/enums/rating.enum';

export interface Movie {
  id: string;
  title: string;
  description: string;
  releaseYear: number;
  category: Category;   // enum
  rating: Rating;       // enum
  duration?: number;
  director?: string;
  cast?: string[];
  imdbRating?: number;
  posterUrl?: string;
  dateAdded: Date;
  isWatched: boolean;
}

export type CreateMovieDto = Omit<Movie, 'id' | 'dateAdded' | 'isWatched'>;
export type UpdateMovieDto = Partial<Omit<Movie, 'id' | 'dateAdded'>>;

const NO_IMAGE = 'https://placehold.co/400x600?text=No+Image';
const STORAGE_KEY = 'movies';
const MIGRATE_FLAG = 'movies_proxy_migrated_v1';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private moviesSubject = new BehaviorSubject<Movie[]>([]);
  public movies$ = this.moviesSubject.asObservable();

  constructor() {
    this.loadFromStorage();
    this.seedIfEmpty();
    this.migratePostersToProxyOnce(); // <-- ensure old data is rewritten to proxy form
  }

  /** === Read === */
  getMovies(): Observable<Movie[]> {
    return this.movies$;
  }

  getAll(): Observable<Movie[]> {
    return this.movies$;
  }

  getMovieById(id: string | number): Observable<Movie | undefined> {
    const sid = String(id);
    const m = this.moviesSubject.value.find(x => x.id === sid);
    return of(m ? this.withPosterFallback(m) : undefined);
  }

  /** === Create === */
  createMovie(dto: CreateMovieDto): Observable<Movie> {
    return new Observable(observer => {
      try {
        const newMovie: Movie = this.withPosterFallback({
          id: this.generateId(),
          ...dto,
          dateAdded: new Date(),
          isWatched: false,
        });
        const updated = [...this.moviesSubject.value, newMovie];
        this.moviesSubject.next(updated);
        this.saveToStorage(updated);
        observer.next(newMovie);
        observer.complete();
      } catch (e) {
        observer.error(e as any);
      }
    });
  }

  /** === Update === */
  updateMovie(id: string | number, updateDto: UpdateMovieDto): Observable<Movie> {
    return new Observable(observer => {
      try {
        const sid = String(id);
        const current = this.moviesSubject.value;
        const idx = current.findIndex(m => m.id === sid);
        if (idx === -1) {
          observer.error(new Error(`Movie with ID ${sid} not found`));
          return;
        }
        const merged = this.withPosterFallback({ ...current[idx], ...updateDto });
        const updated = [...current];
        updated[idx] = merged;
        this.moviesSubject.next(updated);
        this.saveToStorage(updated);
        observer.next(merged);
        observer.complete();
      } catch (e) {
        observer.error(e as any);
      }
    });
  }

  /** === Delete === */
  deleteMovie(id: string | number): Observable<boolean> {
    return new Observable(observer => {
      try {
        const sid = String(id);
        const current = this.moviesSubject.value;
        if (!current.some(m => m.id === sid)) {
          observer.error(new Error(`Movie with ID ${sid} not found`));
          return;
        }
        const updated = current.filter(m => m.id !== sid);
        this.moviesSubject.next(updated);
        this.saveToStorage(updated);
        observer.next(true);
        observer.complete();
      } catch (e) {
        observer.error(e as any);
      }
    });
  }

  /** === Helpers === */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /**
   * Normalize any incoming URL to absolute https:// and then route through
   * a reliable image proxy to bypass hotlink/CORS/referrer/CSP quirks.
   */
  private normalizePoster(url?: string): string | undefined {
    if (!url) return url;
    let u = url.trim();

    // Make absolute https
    if (/^\/\//.test(u)) u = 'https:' + u;                      // //host/path → https://host/path
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, ''); // host/path → https://host/path

    // Route via images.weserv.nl proxy
    try {
      const parsed = new URL(u);
      const hostPath = `${parsed.host}${parsed.pathname}${parsed.search || ''}`;
      // Optionally add sizing params like &w=500&h=750&fit=cover
      return `https://images.weserv.nl/?url=${encodeURIComponent(hostPath)}`;
    } catch {
      return u; // if parsing fails, return original; fallback will handle if broken
    }
  }

  // Always apply normalization + fallback before storing/returning
  private withPosterFallback<T extends Partial<Movie>>(m: T): T {
    const poster = this.normalizePoster(m.posterUrl);
    return {
      ...m,
      posterUrl: poster || NO_IMAGE,
    };
  }

  private saveToStorage(movies: Movie[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    } catch (e) {
      console.error('Failed to save movies:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const normalized: Movie[] = parsed.map((m: any) =>
        this.withPosterFallback({
          ...m,
          dateAdded: m?.dateAdded ? new Date(m.dateAdded) : new Date(),
        })
      );
      this.moviesSubject.next(normalized);
    } catch (e) {
      console.error('Failed to load movies:', e);
    }
  }

  // One-time rewrite of any existing posters to the proxy form
  private migratePostersToProxyOnce(): void {
    if (localStorage.getItem(MIGRATE_FLAG)) return;

    const updated = this.moviesSubject.value.map(m => ({
      ...m,
      posterUrl: this.normalizePoster(m.posterUrl),
    }));

    this.moviesSubject.next(updated);
    this.saveToStorage(updated);
    localStorage.setItem(MIGRATE_FLAG, '1');
  }

  // Seed ONCE in a single batch
  private seedIfEmpty(): void {
    if (this.moviesSubject.value.length > 0) return;

    const seed: CreateMovieDto[] = [
      {
        title: 'The Matrix',
        description:
          'Neo, a disillusioned hacker, discovers that his world is a simulated prison designed to subdue humanity. Guided by Morpheus and Trinity, he must learn to bend the rules of reality and confront the intelligent machines that control it, embracing a destiny that challenges the nature of truth, choice, and freedom.',
        releaseYear: 1999,
        category: Category.SciFi,
        rating: Rating.R,
        duration: 136,
        director: 'The Wachowskis',
        cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
        imdbRating: 8.7,
        posterUrl: 'https://th.bing.com/th/id/R.f481ebb82183b07b0fea1570bc6c85b9?rik=JWyXrAh0k%2f4V9Q&riu=http%3a%2f%2fsparkviews.com%2fwp-content%2fuploads%2f2017%2f09%2fThe-Matrix-1999.jpg&ehk=DMlSNMig7crkWBUtA5qo7mrLwqF4mX9Uoq%2bHRYO9Vgs%3d&risl=&pid=ImgRaw&r=0',
      },
      {
        title: 'Inception',
        description:
          'Dom Cobb is a thief who infiltrates the subconscious during the dream state to steal secrets. When offered a chance to erase his criminal history, he must attempt the near-impossible: inception—planting an idea into a target’s mind—while navigating collapsing dream layers and the ghosts of his past.',
        releaseYear: 2010,
        category: Category.SciFi,
        rating: Rating.PG13,
        duration: 148,
        director: 'Christopher Nolan',
        cast: ['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
        imdbRating: 8.8,
        posterUrl: 'https://tse3.mm.bing.net/th/id/OIP.ZFII9D-wnbPdcWdzFeuEiAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        title: 'Dune: Part Two',
        description:
          'Paul Atreides unites with the Fremen on Arrakis to wage war against the conspirators who destroyed his family. As he embraces visions of the future and his growing power, Paul faces a wrenching choice between the love of his life and the fate of the known universe.',
        releaseYear: 2024,
        category: Category.SciFi,
        rating: Rating.PG13,
        duration: 166,
        director: 'Denis Villeneuve',
        cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
        imdbRating: 8.6,
        posterUrl: 'image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      },
      {
        title: 'Oppenheimer',
        description:
          'A portrait of J. Robert Oppenheimer, the brilliant physicist whose leadership of the Manhattan Project ushered in the atomic age. The film explores the moral and political fallout of scientific discovery as Oppenheimer grapples with the consequences of unleashing unprecedented destructive power.',
        releaseYear: 2023,
        category: Category.BIOGRAPHY,
        rating: Rating.R,
        duration: 180,
        director: 'Christopher Nolan',
        cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon'],
        imdbRating: 8.9,
        posterUrl: 'https://tse2.mm.bing.net/th/id/OIP.fZoBEzk6so-Pj033wxwmNwHaLH?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        title: 'The Dark Knight',
        description:
          'When the Joker plunges Gotham into chaos, Batman faces his most formidable adversary—one who seeks to prove that anyone can fall. As the Caped Crusader pushes his own moral boundaries, alliances are tested and the true cost of heroism becomes painfully clear.',
        releaseYear: 2008,
        category: Category.Action,
        rating: Rating.PG13,
        duration: 152,
        director: 'Christopher Nolan',
        cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
        imdbRating: 9.0,
        posterUrl: 'https://tse4.mm.bing.net/th/id/OIP.NN9rKH-vZbFgtH4FuoW7OwHaLH?rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        title: 'Superbad',
        description:
          'Best friends Seth and Evan embark on one last chaotic night before graduation, hoping to leave their awkward high school years with a bang. Between fake IDs, police run-ins, and heartfelt confessions, they discover what their friendship really means as they prepare to grow up.',
        releaseYear: 2007,
        category: Category.Comedy,
        rating: Rating.R,
        duration: 113,
        director: 'Greg Mottola',
        cast: ['Jonah Hill', 'Michael Cera', 'Christopher Mintz-Plasse'],
        imdbRating: 7.6,
        posterUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8b/Superbad_Poster.png',
      },
      {
        title: 'The Shawshank Redemption',
        description:
          'Wrongly convicted banker Andy Dufresne forms an unlikely friendship with lifer Red within the oppressive walls of Shawshank State Penitentiary. Over decades, hope becomes their quiet rebellion as Andy engineers a path to redemption that inspires everyone around him.',
        releaseYear: 1994,
        category: Category.Drama,
        rating: Rating.R,
        duration: 142,
        director: 'Frank Darabont',
        cast: ['Tim Robbins', 'Morgan Freeman'],
        imdbRating: 9.3,
        posterUrl: 'upload.wikimedia.org/wikipedia/en/8/81/ShawshankRedemptionMoviePoster.jpg',
      },
      {
        title: 'The Conjuring',
        description:
          'Paranormal investigators Ed and Lorraine Warren confront a malevolent presence terrorizing a family in their secluded farmhouse. Based on a real case, the Warrens face escalating horrors as the entity tightens its grip on the home and its inhabitants.',
        releaseYear: 2013,
        category: Category.Horror,
        rating: Rating.R,
        duration: 112,
        director: 'James Wan',
        cast: ['Vera Farmiga', 'Patrick Wilson', 'Lili Taylor'],
        imdbRating: 7.5,
        posterUrl: 'https://th.bing.com/th/id/OIP.G2TywyeaWaTsKz1le9T_aAAAAA?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3',
      },
      {
        title: 'How to Lose a Guy in 10 Days',
        description:
          'Magazine writer Andie Anderson sets out to deliberately drive away a man in ten days for an article, while advertising executive Benjamin Barry bets he can make any woman fall in love with him in the same time. Their clashing agendas ignite a battle of wits that turns unexpectedly heartfelt.',
        releaseYear: 2003,
        category: Category.Romance,
        rating: Rating.PG13,
        duration: 116,
        director: 'Donald Petrie',
        cast: ['Kate Hudson', 'Matthew McConaughey'],
        imdbRating: 6.5,
        posterUrl: 'https://th.bing.com/th/id/R.af793875a5a6398d7f8841f842670240?rik=x4WkGfQrykIfng&riu=http%3a%2f%2fimages.moviepostershop.com%2fhow-to-lose-a-guy-in-10-days-movie-poster-2003-1020201634.jpg&ehk=AlG4Xfp1J1M59jqGV1F2jBFA5xeKV3JL0TyB3CVa%2bAo%3d&risl=&pid=ImgRaw&r=0'},
      {
        title: 'Se7en',
        description:
          'Veteran detective Somerset and his impulsive new partner Mills hunt a serial killer who uses the seven deadly sins as meticulous inspiration for murder. Their pursuit descends into a grim moral labyrinth culminating in an unforgettable reckoning.',
        releaseYear: 1995,
        category: Category.Thriller,
        rating: Rating.R,
        duration: 127,
        director: 'David Fincher',
        cast: ['Brad Pitt', 'Morgan Freeman', 'Kevin Spacey'],
        imdbRating: 8.6,
        posterUrl: 'https://th.bing.com/th/id/OIP.ds9lA_mUC3OS5YwW71yg2gHaKu?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3'
      },
      {
        title: 'Free Solo',
        description:
          'Climber Alex Honnold attempts to scale Yosemite’s El Capitan without ropes, confronting not only a sheer granite monolith but also the limits of human focus, fear, and discipline. This documentary captures a rare blend of athleticism, obsession, and vulnerability.',
        releaseYear: 2018,
        category: Category.Documentary,
        rating: Rating.PG13,
        duration: 100,
        director: 'Elizabeth Chai Vasarhelyi, Jimmy Chin',
        cast: ['Alex Honnold'],
        imdbRating: 8.2,
        posterUrl: 'https://media0084.elcinema.com/uploads/_320x_bcc37436b534db4ebba4a735e0afe6489c19c8d58b1930d8e828056fc179c12c.jpg',
      },
      {
        title: 'Toy Story',
        description:
          'When a flashy new space ranger upends the bedroom hierarchy, cowboy doll Woody must confront jealousy and change. As Woody and Buzz are thrust into a larger world, they discover the power of friendship and the courage to accept new beginnings.',
        releaseYear: 1995,
        category: Category.Animation,
        rating: Rating.G,
        duration: 81,
        director: 'John Lasseter',
        cast: ['Tom Hanks', 'Tim Allen'],
        imdbRating: 8.3,
        posterUrl: 'upload.wikimedia.org/wikipedia/en/1/13/Toy_Story.jpg',
      },
      {
        title: 'The Lord of the Rings: The Fellowship of the Ring',
        description:
          'A humble hobbit inherits a ring of unimaginable power and joins a fellowship tasked with its destruction. Their perilous journey across Middle-earth forges bonds, tests resolve, and sets the stage for a battle against encroaching darkness.',
        releaseYear: 2001,
        category: Category.Adventure,
        rating: Rating.PG13,
        duration: 178,
        director: 'Peter Jackson',
        cast: ['Elijah Wood', 'Ian McKellen', 'Viggo Mortensen'],
        imdbRating: 8.8,
        posterUrl: 'https://upload.wikimedia.org/wikipedia/en/f/fb/Lord_Rings_Fellowship_Ring.jpg',
      },
    ];

    const now = Date.now();
    const seeded: Movie[] = seed.map((dto, i) =>
      this.withPosterFallback({
        id: this.generateId(),
        ...dto,
        dateAdded: new Date(now + i),
        isWatched: false,
      })
    );

    this.moviesSubject.next(seeded);
    this.saveToStorage(seeded);
  }

  /** Utility to reset & reseed (optional for DevTools) */
  public clearAndReseed(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MIGRATE_FLAG);
    this.moviesSubject.next([]);
    this.seedIfEmpty();
    this.migratePostersToProxyOnce();
  }
}
