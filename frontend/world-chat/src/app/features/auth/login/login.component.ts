import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false; // Indicateur de chargement
  errorMessage = ''; // Message d'erreur

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService, private geolocationService: GeolocationService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void { }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.isLoading = true;
      this.errorMessage = '';

      this.geolocationService.getCountry().subscribe({
        next: (ipResponse) => {
          const ip = ipResponse.ip;
          this.authService.login({ email, password, ip }).subscribe({
            next: (response) => {
              console.log('Login successful');
              this.router.navigate(['/dashboard']);
            },
            error: (error) => {
              console.error('Login error:', error);
              this.errorMessage = error.error?.message || 'An error occurred during login';
              this.isLoading = false;
            },
            complete: () => {
              this.isLoading = false;
            }
          });
        },
        error: (error) => {
          console.error('Error getting IP:', error);
          this.errorMessage = 'Unable to retrieve IP address';
          this.isLoading = false;
        }
      });
    }
  }

  goToRegistration() {
    this.router.navigate(['/register']);
  }








}
