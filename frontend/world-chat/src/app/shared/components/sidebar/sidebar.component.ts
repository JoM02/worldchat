import { Component, OnInit, Output, EventEmitter, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ContactService } from '../../../core/services/contact.service';

interface MenuItem {
  label: string;
  link: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() isOpen = true;
  @Output() sidebarStateChange = new EventEmitter<boolean>();

  isUserOnline = true;
  isMuted = false;
  userStatus = 'Online';
  isMobile = window.innerWidth <= 768;

  menuItems: MenuItem[] = [
    { label: 'Dashboard', link: '/dashboard', icon: 'fas fa-home' }
    // { label: 'Messages', link: '/messages', icon: 'fas fa-comments', badge: 3 },
    // { label: 'Profile', link: '/profile', icon: 'fas fa-user' }
  ];

  numberOfContacts = 0;

  contactItems: MenuItem[] = [
    { label: 'All Contacts', link: '/contacts', icon: 'fas fa-users', badge: 2 }
    // { label: 'Add Contact', link: '/contacts/add', icon: 'fas fa-user-plus' },
    // { label: 'Pending', link: '/contacts/pending', icon: 'fas fa-user-clock', badge: 1 }
  ];

  // settingsItems: MenuItem[] = [
  //   { label: 'General', link: '/settings/general', icon: 'fas fa-cog' },
  //   { label: 'Security', link: '/settings/security', icon: 'fas fa-shield-alt' },
  //   { label: 'Profile', link: '/settings/profile', icon: 'fas fa-user-circle' },
  //   { label: 'Notifications', link: '/settings/notifications', icon: 'fas fa-bell' }
  // ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private contactService: ContactService
  ) {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const wasIsMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    // Close sidebar automatically on mobile when transitioning from desktop
    if (!wasIsMobile && this.isMobile) {
      this.isOpen = false;
      this.sidebarStateChange.emit(false);
    }
  }

  ngOnInit(): void {
    // Initialize with closed sidebar on mobile
    if (this.isMobile) {
      this.isOpen = false;
      this.sidebarStateChange.emit(false);
    }
    this.loadContacts();
  }

  private loadContacts(): void {
    this.contactService.getAllContacts().subscribe(contacts => {
      this.numberOfContacts = contacts.length;
      this.contactItems[0].badge = this.numberOfContacts;
    });
  }

  onMenuItemClick(item: MenuItem): void {
    // Close sidebar on mobile after navigation
    if (this.isMobile) {
      this.isOpen = false;
      this.sidebarStateChange.emit(false);
    }
    this.router.navigate([item.link]);
  }

  onAddContact(): void {
    this.router.navigate(['/contacts/add']);
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    // TODO: Implement mute functionality
  }

  toggleSettings(): void {
    this.router.navigate(['/settings']);
  }

  setUserStatus(status: string): void {
    this.userStatus = status;
    this.isUserOnline = status === 'Online';
    // TODO: Implement status update functionality
  }
}