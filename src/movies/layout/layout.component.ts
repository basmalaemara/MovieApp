import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  mobileOpen = false;
  constructor(private auth: AuthService) {}

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }

  logout() {
    this.auth.logout(); // clears storage + navigates to /login
  }
}
