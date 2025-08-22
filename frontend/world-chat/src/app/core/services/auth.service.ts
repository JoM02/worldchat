import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { UserService } from './user.service';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:80/api/auth';
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private router: Router,
    private userService: UserService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('[AuthService] Initialized, isBrowser:', this.isBrowser);
    this.isLoggedInSubject.next(this.hasToken());
  }

  private generateRandomColor(): string {
    const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    console.log('[AuthService] Generated random color:', color);
    return color;
  }

  login(credentials: { email: string; password: string; ip: string }): Observable<any> {
    console.log('[AuthService] Attempting login for email:', credentials.email);
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      map((response: any) => {
        console.log('[AuthService] Login response:', response);
        
        if (this.isBrowser) {
          console.log('[AuthService] Storing user data in localStorage');
          localStorage.setItem('token', response.token.token);
          localStorage.setItem('userid', response.token.user.id);
          localStorage.setItem('username', response.token.user.username);
          localStorage.setItem('email', response.token.user.email);
          localStorage.setItem('type', response.token.user.type);
          localStorage.setItem('id', response.token.user.id);
           
          const userColor = response.token.user.color || this.generateRandomColor();
          this.cookieService.set('userColor', userColor, undefined, '/', undefined, true, 'Strict');
          console.log('[AuthService] Cookie userColor set:', userColor);

        }

        this.isLoggedInSubject.next(true);
        console.log('[AuthService] Updated login state to true');

        // Set user status to online
        console.log('[AuthService] Setting user status to online for ID:', response.token.user.id);
        this.userService.updateUserStatus(response.token.user.id, 'online');
        return response;
      })
    );
  }

  logout(): void {
    console.log('[AuthService] Starting logout process');
    
    if (this.isBrowser) {
      const userId = localStorage.getItem('id');
      
      if (userId) {
        console.log('[AuthService] Setting user status to offline for ID:', userId);
        this.userService.updateUserStatus(userId, 'offline');
      }

      console.log('[AuthService] Clearing localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('userid');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('type');
      localStorage.removeItem('id');
      localStorage.removeItem('userColor');
    }

    this.isLoggedInSubject.next(false);
    console.log('[AuthService] Updated login state to false');
    console.log('[AuthService] Navigating to login page');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }

  private hasToken(): boolean {
    if (!this.isBrowser) {
      console.log('[AuthService] Not in browser environment, returning false for hasToken');
      return false;
    }
    const hasToken = !!localStorage.getItem('token');
    console.log('[AuthService] Checking for token:', hasToken);
    return hasToken;
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      console.log('[AuthService] Not in browser environment, returning null for getToken');
      return null;
    }
    const token = localStorage.getItem('token');
    console.log('[AuthService] Getting token:', token ? 'Token exists' : 'No token');
    return token;
  }
}
