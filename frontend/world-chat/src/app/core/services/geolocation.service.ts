import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GeolocationService {
    private apiUrl = 'https://api.ipgeolocation.io/ipgeo?apiKey=6ea68d579ba648438c43b1c59f6264b2';

    constructor(private http: HttpClient) { }

    getGeolocation(): Observable<any> {
        return this.http.get<any>(this.apiUrl);
    }

    getCountry(): Observable<any> {
        return this.http.get<any>(this.apiUrl + "&fields=country_name");
    }

    getCountryForUser(ip: String): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}&ip=${ip}&fields=country_name`);
    }
}