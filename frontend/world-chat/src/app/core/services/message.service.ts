import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'http://localhost:80/api/messages';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('[MessageService] Initialized, isBrowser:', this.isBrowser);
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  createMessage(messageData: any): Observable<any> {
    console.log('[MessageService] Creating message:', messageData);
    return this.http.post<any>(`${this.apiUrl}`, messageData, this.getHeaders()).pipe(
      tap(response => console.log('[MessageService] Message created:', response))
    );
  }

  getAllMessagesByConversationId(conversationId: string): Observable<any> {
    console.log('[MessageService] Fetching messages for conversation:', conversationId);
    return this.http.get<any>(`${this.apiUrl}/conversation/${conversationId}`, this.getHeaders()).pipe(
      tap(response => console.log('[MessageService] Messages received:', response))
    );
  }

  getMessageById(id: string): Observable<any> {
    console.log('[MessageService] Fetching message by ID:', id);
    return this.http.get<any>(`${this.apiUrl}/${id}`, this.getHeaders()).pipe(
      tap(response => console.log('[MessageService] Message received:', response))
    );
  }

  updateMessage(id: string, messageData: any): Observable<any> {
    console.log('[MessageService] Updating message:', id, messageData);
    return this.http.put<any>(`${this.apiUrl}/${id}`, messageData, this.getHeaders()).pipe(
      tap(response => console.log('[MessageService] Message updated:', response))
    );
  }

  deleteMessage(id: string): Observable<any> {
    console.log('[MessageService] Deleting message:', id);
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.getHeaders()).pipe(
      tap(response => console.log('[MessageService] Message deleted:', response))
    );
  }
}