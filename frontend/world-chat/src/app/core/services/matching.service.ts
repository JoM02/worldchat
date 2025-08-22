import { Injectable } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class MatchingService {
  private socket: Socket;
  private matchFound = new Subject<any>();
  private matchError = new Subject<any>();

  constructor() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: false
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('match-found', (data: any) => {
      this.matchFound.next(data);
    });

    this.socket.on('matching-error', (error: any) => {
      this.matchError.next(error);
    });
  }

  startChatWithTimeout(payload: {
    userId: string;
    language: string;
    userType: string;
  }): Observable<any> {
    // Connect socket if not connected
    if (!this.socket.connected) {
      this.socket.connect();
    }

    // Start matching process
    this.socket.emit('start-matching', payload);

    return new Observable(observer => {
      const matchSub = this.matchFound.subscribe(
        data => {
          observer.next(data);
          observer.complete();
          this.stopMatching(payload);
        }
      );

      const errorSub = this.matchError.subscribe(
        error => {
          if (error.existingConversation) {
            // If there's an existing conversation, pass it along with the error
            observer.error({ 
              message: error.message,
              existingConversation: error.existingConversation 
            });
          } else {
            observer.error(new Error(error.message));
          }
          this.stopMatching(payload);
        }
      );

      // Set timeout for matching
      const timeoutId = setTimeout(() => {
        observer.error(new Error('No available match found. Please try again later.'));
        this.stopMatching(payload);
      }, 35000);

      // Cleanup function
      return () => {
        matchSub.unsubscribe();
        errorSub.unsubscribe();
        clearTimeout(timeoutId);
        this.stopMatching(payload);
      };
    });
  }

  private stopMatching(payload: { userId: string; language: string }) {
    this.socket.emit('stop-matching', {
      userId: payload.userId,
      language: payload.language
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}