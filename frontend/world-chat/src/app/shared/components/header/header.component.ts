import { Component, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService, UserStatus } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { CookieService } from 'ngx-cookie-service';

interface User {
  id: string;
  username: string;
  type: string;
  status?: UserStatus;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  userAvatarColor: string = '';
  showStatusMenu = false;
  availableStatuses: UserStatus[] = ['online', 'busy', 'away'];

  @Output() sidebarToggle = new EventEmitter<boolean>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private cookieService: CookieService
  ) {
    console.log('[HeaderComponent] Initialized');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showStatusMenu) {
      this.showStatusMenu = false;
    }
  }

  ngOnInit(): void {
    console.log('[HeaderComponent] Starting initialization');

    const id = localStorage.getItem('id');
    const username = localStorage.getItem('username');
    const type = localStorage.getItem('type');

    console.log('[HeaderComponent] Retrieved from localStorage:', { id, username, type });

    if (id && username && type) {
      this.currentUser = { id, username, type };
      console.log('[HeaderComponent] Current user set:', this.currentUser);

      this.userAvatarColor = this.cookieService.get('userColor') || '';
    console.log('[HeaderComponent] User avatar color:', this.userAvatarColor);

      console.log('[HeaderComponent] Subscribing to status updates');
      this.userService.userStatus$.subscribe(statuses => {
        if (this.currentUser) {
          const newStatus = statuses.get(this.currentUser.id) || 'online';
          console.log('[HeaderComponent] Received status update:', {
            userId: this.currentUser.id,
            oldStatus: this.currentUser.status,
            newStatus: newStatus
          });
          this.currentUser.status = newStatus;
        }
      });
    } else {
      console.warn('[HeaderComponent] Missing user information in localStorage');
    }
  }

  toggleSidebar(): void {
    console.log('[HeaderComponent] Toggling sidebar');
    this.sidebarToggle.emit(true);
  }

  getInitials(name: string): string {
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    // console.log('[HeaderComponent] Generated initials for', name, ':', initials);
    return initials;
  }

  toggleStatusMenu(event: Event): void {
    event.stopPropagation();
    this.showStatusMenu = !this.showStatusMenu;
    console.log('[HeaderComponent] Status menu toggled:', this.showStatusMenu);
  }

  setStatus(status: UserStatus, event: Event): void {
    event.stopPropagation();
    console.log('[HeaderComponent] Attempting to set status:', status);

    if (this.currentUser) {
      console.log('[HeaderComponent] Updating status for user:', this.currentUser.id);
      this.userService.updateUserStatus(this.currentUser.id, status);
    } else {
      console.warn('[HeaderComponent] Cannot update status: No current user');
    }

    this.showStatusMenu = false;
    console.log('[HeaderComponent] Status menu closed');
  }

  getStatusColor(status: UserStatus): string {
    const color = this.userService.getStatusColor(status);
    // console.log('[HeaderComponent] Status color for', status, ':', color);
    return color;
  }

  getStatusText(status: UserStatus): string {
    const text = status.charAt(0).toUpperCase() + status.slice(1);
    console.log('[HeaderComponent] Status text for', status, ':', text);
    return text;
  }

  logout(): void {
    console.log('[HeaderComponent] Logging out');
    this.authService.logout();
  }
}