import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface User {
  id: string;
  username: string;
  status: string;
  type: string;
  avatarColor?: string;
  ip?: string;
  languages: string;
}

interface Message {
  id: string;
  conversationId: string;
  message: string;
  username: string;
  userId: string;
  timestamp: Date;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket | null = null;
  private messagesSubject = new Subject<any>();
  public messages$ = this.messagesSubject.asObservable();
  
  private userListSubject = new BehaviorSubject<string[]>([]);
  public userList$ = this.userListSubject.asObservable();
  
  private typingUsersSubject = new BehaviorSubject<Set<string>>(new Set());
  public typingUsers$ = this.typingUsersSubject.asObservable();

  private username: string = '';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object, private http: HttpClient) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('[ChatService] Initialized, isBrowser:', this.isBrowser);

    if (this.isBrowser) {
      this.socket = io('http://localhost:3000');
      console.log('[ChatService] Socket connection initialized');

      this.socket.on('connect', () => {
        console.log('[ChatService] Connected to the server');
      });

      this.socket.on('disconnect', () => {
        console.log('[ChatService] Disconnected from the server');
      });

      this.listenForMessages();
      this.listenForUserUpdates();
    }
  }

  setUsername(username: string) {
    console.log('[ChatService] Setting username:', username);
    this.username = username;
  }

  joinRoom(conversationId: string) {
    if (!this.isBrowser || !this.socket) return;
    console.log('[ChatService] Joining room:', conversationId);
    this.socket.emit('join', { conversationId, username: this.username });
  }

  leaveRoom(conversationId: string) {
    if (!this.isBrowser || !this.socket) return;
    console.log('[ChatService] Leaving room:', conversationId);
    this.socket.emit('leave', { conversationId, username: this.username });
  }

  sendMessage(conversationId: string, message: string, images?: any[]) {
    if (!this.isBrowser || !this.socket) return;
    const userId = localStorage.getItem('id');
    console.log('[ChatService] Sending message in room:', conversationId);
    this.socket.emit('message', { 
      conversationId, 
      message, 
      username: this.username,
      userId,
      images
    });
  }

  updateMessage(conversationId: string, messageId: string, content: string): Observable<any> {
    if (!this.isBrowser || !this.socket) {
      return new Observable(observer => {
        observer.error(new Error('Browser or socket not available'));
      });
    }

    // First update via HTTP
    const url = `http://localhost:3000/api/messages/${messageId}`;
    return new Observable(observer => {
      this.http.put(url, { content }).subscribe({
        next: (response) => {
          // After HTTP success, emit socket event
          this.socket!.emit('message_update', {
            conversationId,
            messageId,
            content,
            userId: localStorage.getItem('id')
          });

          // Listen for socket confirmation
          this.socket!.once('message_updated', (updatedMessage: any) => {
            observer.next(updatedMessage);
            observer.complete();
          });

          this.socket!.once('message_update_error', (error: any) => {
            observer.error(error);
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });

      // Cleanup
      return () => {
        this.socket!.off('message_updated');
        this.socket!.off('message_update_error');
      };
    });
  }

  deleteMessage(conversationId: string, messageId: string): Observable<any> {
    if (!this.isBrowser || !this.socket) {
      return new Observable(observer => {
        observer.error(new Error('Browser or socket not available'));
      });
    }

    // First delete via HTTP
    const url = `http://localhost:3000/api/messages/${messageId}`;
    return new Observable(observer => {
      this.http.delete(url).subscribe({
        next: (response) => {
          // After HTTP success, emit socket event
          this.socket!.emit('message_delete', {
            conversationId,
            messageId,
            userId: localStorage.getItem('id')
          });

          // Listen for socket confirmation
          this.socket!.once('message_deleted', (result: any) => {
            observer.next(result);
            observer.complete();
          });

          this.socket!.once('message_delete_error', (error: any) => {
            observer.error(error);
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });

      // Cleanup
      return () => {
        this.socket!.off('message_deleted');
        this.socket!.off('message_delete_error');
      };
    });
  }

  sendTypingStatus(conversationId: string, isTyping: boolean) {
    if (!this.isBrowser || !this.socket || !this.username) return;
    
    console.log('[ChatService] Sending typing status:', { conversationId, username: this.username, isTyping });
    this.socket.emit('typing', {
      conversationId,
      username: this.username,
      isTyping
    });
  }

  private listenForMessages() {
    if (!this.isBrowser || !this.socket) return;

    this.socket.on('message', (data) => {
      if (!data || !data.timestamp || !data.sender) {
        console.error('[ChatService] Malformed message received:', data);
        return;
      }
      console.log('[ChatService] Message received:', data);
      this.messagesSubject.next({
        ...data,
        timestamp: new Date(data.timestamp),
      });
    });

    this.socket.on('message_updated', (updatedMessage: any) => {
      this.messagesSubject.next({
        type: 'update',
        message: updatedMessage
      });
    });

    this.socket.on('message_deleted', (deletedMessage: any) => {
      this.messagesSubject.next({
        type: 'delete',
        messageId: deletedMessage.id
      });
    });

    this.socket.on('userJoined', (data) => {
      console.log('[ChatService] User joined:', data);
      this.messagesSubject.next({
        ...data,
        timestamp: new Date(data.timestamp)
      });
    });

    this.socket.on('userLeft', (data) => {
      console.log('[ChatService] User left:', data);
      this.messagesSubject.next({
        ...data, 
        timestamp: new Date(data.timestamp)
      });
    });
  }

  private listenForUserUpdates() {
    if (!this.socket) return;

    this.socket.on('userList', (userList: string[]) => {
      console.log('[ChatService] User list received:', userList);
      this.userListSubject.next(userList);
    });

    this.socket.on('userListUpdate', (userList: string[]) => {
      console.log('[ChatService] User list updated:', userList);
      this.userListSubject.next(userList);
    });

    this.socket.on('userTyping', ({ username, isTyping }) => {
      console.log('[ChatService] User typing status:', { username, isTyping });
      const currentTypingUsers = new Set(this.typingUsersSubject.value);
      if (isTyping) {
        currentTypingUsers.add(username);
      } else {
        currentTypingUsers.delete(username);
      }
      this.typingUsersSubject.next(currentTypingUsers);
    });
  }

  private handleError(error: any) {
    console.error('[ChatService] An error occurred:', error);
  }

  cleanup() {
    if (!this.isBrowser) return;
    
    console.log('[ChatService] Cleaning up service');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.typingUsersSubject.next(new Set());
    this.userListSubject.next([]);
  }

  getUserInfo(userId: string): Observable<User> {
    return this.http.get<User>(`http://localhost:3000/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  }
}