import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

const AUTH_KEY = 'currentUser';
const TOKEN_KEY = 'authToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router) {}

  // very simple demo auth — replace with real API when ready
  login(username: string, password: string): boolean {
    const ok = (username === 'admin' && password === '12345678'); // demo creds
    if (ok) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ username }));
      localStorage.setItem(TOKEN_KEY, 'demo-token');
    }
    return ok;
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    // navigate to /login (no returnUrl here — explicitly go to login)
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}
