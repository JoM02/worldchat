import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiKey = 'API_KEY';
  private apiUrl = 'https://newsapi.org/v2/top-headlines';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('[NewsService] Initialized, isBrowser:', this.isBrowser);
  }

  getTopHeadlines(country: string): Observable<any> {
    if (!this.isBrowser) {
      console.log('[NewsService] Running on server, returning empty response');
      return of({ articles: [] });
    }

    console.log('[NewsService] Fetching top headlines for country:', country);
    return this.http.get<any>(`${this.apiUrl}?country=${country}&apiKey=${this.apiKey}`).pipe(
      tap(response => console.log('[NewsService] Headlines received:', response)),
      catchError(error => {
        console.error('[NewsService] Error fetching headlines:', error);
        return of({ articles: [] });
      })
    );
  }
}