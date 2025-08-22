import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: string;
  username: string;
  type: string;
  status?: string;
  avatarColor?: string;
  email?: string;
  ip?: string;
  languages: string;
}

export type UserStatus = 'online' | 'offline' | 'busy' | 'away' | 'Busy' | 'Active';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:80/api/users';
  private socket: Socket | null = null;
  private userStatusSubject = new BehaviorSubject<Map<string, UserStatus>>(new Map());
  public userStatus$ = this.userStatusSubject.asObservable();
  private isBrowser: boolean;
  private manuallySetStatuses = new Set<string>(); // Track users with manually set statuses

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('[UserService] Initialized, isBrowser:', this.isBrowser);

    if (this.isBrowser) {
      this.socket = io('http://localhost:3000');
      this.setupSocketListeners();
      this.initializeUserStatus();
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket || !this.isBrowser) return;

    console.log('[UserService] Setting up socket listeners');

    // Listen for user status updates from server
    this.socket.on('userStatusUpdate', (data: { userId: string; status: UserStatus; isManual?: boolean }) => {
      console.log('[UserService] Received status update via socket:', data);
      this.handleStatusUpdate(data.userId, data.status, data.isManual);
    });

    // Listen for initial status list when connecting
    this.socket.on('userStatusList', (statuses: { userId: string; status: UserStatus; isManual?: boolean }[]) => {
      console.log('[UserService] Received initial status list:', statuses);
      const statusMap = new Map<string, UserStatus>();
      statuses.forEach(({ userId, status, isManual }) => {
        if (isManual) {
          this.manuallySetStatuses.add(userId);
        }
        statusMap.set(userId, status);
      });
      this.userStatusSubject.next(statusMap);
    });

    // Handle reconnection
    this.socket.on('connect', () => {
      console.log('[UserService] Socket connected, requesting status list');
      this.socket!.emit('requestStatusList');

      // Set current user as online after reconnection only if status wasn't manually set
      const currentUser = this.getCurrentUser();
      if (currentUser && !this.manuallySetStatuses.has(currentUser.id)) {
        this.updateUserStatus(currentUser.id, 'online', false);
      }
    });

    // Handle disconnection
    this.socket.on('disconnect', () => {
      console.log('[UserService] Socket disconnected');
    });
  }

  private handleStatusUpdate(userId: string, status: UserStatus, isManual: boolean = false): void {
    // If the status is being set to online automatically but the user has a manual status, ignore it
    if (!isManual && this.manuallySetStatuses.has(userId)) {
      console.log('[UserService] Ignoring automatic status update for user with manual status:', userId);
      return;
    }

    // Update manual status tracking
    if (isManual) {
      if (status === 'busy' || status === 'away') {
        this.manuallySetStatuses.add(userId);
      } else {
        this.manuallySetStatuses.delete(userId);
      }
    }

    // Update the status
    const currentStatuses = this.userStatusSubject.value;
    currentStatuses.set(userId, status);
    this.userStatusSubject.next(currentStatuses);
  }

  private initializeUserStatus(): void {
    if (!this.isBrowser) return;

    console.log('[UserService] Initializing user status');
    const currentUser = this.getCurrentUser();
    if (currentUser && !this.manuallySetStatuses.has(currentUser.id)) {
      console.log('[UserService] Setting initial online status for user:', currentUser.id);
      this.updateUserStatus(currentUser.id, 'online', false);
    } else {
      console.log('[UserService] No current user found or user has manual status');
    }
  }

  registerUser(userData: any): Observable<any> {
    console.log('[UserService] Registering new user:', userData);
    return this.http.post<any>(`${this.apiUrl}`, userData);
  }

  getAllUsers(): Observable<User[]> {
    console.log('[UserService] Fetching all users');
    return this.http.get<User[]>(`${this.apiUrl}`).pipe(
      map(users => {
        const currentStatuses = this.userStatusSubject.value;
        return users.map(user => ({
          ...user,
          status: currentStatuses.get(user.id) || 'offline'
        }));
      })
    );
  }

  getUserById(id: string): Observable<User> {
    console.log('[UserService] Fetching user by ID:', id);
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      map(user => {
        const currentStatus = this.userStatusSubject.value.get(user.id);
        console.log('[UserService] User data received:', {
          userId: user.id,
          currentStatus: currentStatus || user.status || 'offline'
        });
        return { ...user, status: currentStatus || user.status || 'offline' };
      })
    );
  }

  updateUser(id: string, userData: any): Observable<User> {
    console.log('[UserService] Updating user:', { id, userData });
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData);
  }

  deleteUser(id: string): Observable<any> {
    console.log('[UserService] Deleting user:', id);
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  findUsersByLanguage(language: string): Observable<User[]> {
    console.log('[UserService] Finding users by language:', language);
    return this.http.get<User[]>(`${this.apiUrl}/language/${language}`).pipe(
      map(users => {
        const currentStatuses = this.userStatusSubject.value;
        return users.map(user => ({
          ...user,
          status: currentStatuses.get(user.id) || 'offline'
        }));
      })
    );
  }

  updateUserStatus(userId: string, status: UserStatus, isManual: boolean = true): void {
    if (!this.isBrowser || !this.socket) return;

    console.log('[UserService] Updating user status:', { userId, status, isManual });

    // Emit status change through socket with manual flag
    this.socket.emit('updateStatus', { userId, status, isManual });

    // Update local state
    this.handleStatusUpdate(userId, status, isManual);

    // Update status in backend
    console.log('[UserService] Sending status update to backend');
    this.http.put(`${this.apiUrl}/${userId}/status`, { status, isManual }).subscribe({
      next: () => console.log('[UserService] Status update successful'),
      error: (error) => console.error('[UserService] Error updating status:', error)
    });
  }

  getCurrentUser(): User | null {
    if (!this.isBrowser) return null;

    console.log('[UserService] Getting current user');
    const id = localStorage.getItem('id');
    const username = localStorage.getItem('username');
    const type = localStorage.getItem('type');
    const avatarColor = localStorage.getItem(`avatar_color_${id}`);

    if (!id || !username || !type) {
      console.log('[UserService] Missing user information in localStorage');
      return null;
    }

    const languages = localStorage.getItem('languages') || '';
    const user = {
      id,
      username,
      type,
      status: this.userStatusSubject.value.get(id) || 'online',
      avatarColor: avatarColor || undefined,
      languages
    };
    console.log('[UserService] Current user:', user);
    return user;
  }

  getStatusColor(status: UserStatus): string {
    const color = (() => {
      switch (status?.toLowerCase()) {
        case 'online':
        case 'active':
          return '#43B581';
        case 'busy':
          return '#F04747';
        case 'away':
          return '#FAA61A';
        case 'offline':
        default:
          return '#747F8D';
      }
    })();
    // console.log('[UserService] Status color for', status, ':', color);
    return color;
  }

  // Cleanup method to be called when service is destroyed
  destroy(): void {
    if (this.socket) {
      // console.log('[UserService] Cleaning up socket connection');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}