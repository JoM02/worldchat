import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  uploadImage(file: File, messageId: string): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('messageId', messageId);
    return this.http.post(`${this.apiUrl}/api/images/upload`, formData, this.getHeaders());
  }

  getImagesByMessageId(messageId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/images/message/${messageId}`, this.getHeaders());
  }

  getImage(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/images/${id}`, this.getHeaders());
  }

  deleteImage(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/images/${id}`, this.getHeaders());
  }

  getImageUrl(path: string): string {
    if (!path) return '';
    // If path already starts with http, return as is
    if (path.startsWith('http')) return path;
    // Otherwise, prepend the API URL
    return `${this.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
