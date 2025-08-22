import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders  } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Keep the existing behavior but add type safety
export type ContactStatus = 'Pending' | 'Accepted' | 'Blocked';

export interface Contact {
  user_id_1: string;
  user_id_2: string;
  status: ContactStatus;
  conversation_id?: string;  // Add optional conversation_id for MP
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = 'http://localhost:3000/api/contacts';

  constructor(private http: HttpClient) { }

  private handleError(error: HttpErrorResponse) {
    console.error('Contact Service Error:', error);
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // set le token de session
    console.log('Token utilisé pour l\'authentification :', token);
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  createContact(contactData: { user_id_1: string; user_id_2: string }): Observable<Contact> {
    return this.http.post<Contact>(`${this.apiUrl}`, contactData, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAllContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getContactByUserIds(userId1: string, userId2: string): Observable<Contact | null> {
    return this.http.get<Contact>(`${this.apiUrl}/${userId1}/${userId2}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteContact(userId1: string, userId2: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${userId1}/${userId2}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  modifyContactStatus(userId1: string, userId2: string, status: ContactStatus): Observable<Contact> {
    return this.http.put<Contact>(`${this.apiUrl}/${userId1}/${userId2}/${status}`, {}, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
}
