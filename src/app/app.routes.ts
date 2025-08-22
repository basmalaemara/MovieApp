import { Routes } from '@angular/router';
import { LayoutComponent } from '../movies/layout/layout.component';
import { authGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  // public login route (outside the shell)
  {
    path: 'login',
    loadComponent: () => import('../auth/login/login.component').then(m => m.LoginComponent),
  },

  // protected shell + children
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard], // ⬅ protect everything under the shell
    children: [
      { path: '', redirectTo: 'movies/list', pathMatch: 'full' },
      {
        path: 'movies/list',
        loadComponent: () => import('../movies/list/list.component').then(m => m.ListComponent),
      },
      {
        path: 'movies/add',
        loadComponent: () => import('../movies/add/add.component').then(m => m.AddComponent),
      },
      {
        path: 'movies/:id',
        loadComponent: () => import('../movies/detail/detail.component').then(m => m.DetailComponent),
      },
      {
        path: 'watchlist',
        loadComponent: () => import('./watchlist/watchlist.component').then(m => m.WatchlistComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
