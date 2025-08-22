import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private apiUrl = 'http://localhost:80/api/conversations';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('[ConversationService] Initialized, isBrowser:', this.isBrowser);
  }

  createConversation(conversationData: any): Observable<any> {
    console.log('[ConversationService] Creating conversation:', conversationData);
    return this.http.post<any>(`${this.apiUrl}`, conversationData);
  }

  getAllConversations(): Observable<any> {
    console.log('[ConversationService] Fetching all conversations');
    return this.http.get<any>(`${this.apiUrl}`);
  }

  getConversationById(id: string): Observable<any> {
    console.log('[ConversationService] Fetching conversation by ID:', id);
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  deleteConversation(id: string): Observable<any> {
    console.log('[ConversationService] Deleting conversation:', id);
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getAllConversationsByUserId(userId: string): Observable<any> {
    console.log('[ConversationService] Fetching conversations for userId:', userId);
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`);
  }
}