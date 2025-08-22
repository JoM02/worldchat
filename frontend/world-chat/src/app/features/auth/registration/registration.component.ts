import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, startWith } from 'rxjs';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, AsyncPipe]
})
export class RegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  private currentStepSubject = new BehaviorSubject<number>(1);
  currentStep$: Observable<number> = this.currentStepSubject.asObservable();

  languages = [
    { code: 'en', name: 'English', icon: 'assets/flags/gb.svg' },
    { code: 'fr', name: 'French', icon: 'assets/flags/fr.svg' },
    { code: 'es', name: 'Spanish', icon: 'assets/flags/es.svg' },
    { code: 'de', name: 'German', icon: 'assets/flags/de.svg' },
    { code: 'it', name: 'Italian', icon: 'assets/flags/it.svg' },
    { code: 'pt', name: 'Portuguese', icon: 'assets/flags/pt.svg' },
    { code: 'ru', name: 'Russian', icon: 'assets/flags/ru.svg' },
    { code: 'zh', name: 'Chinese', icon: 'assets/flags/cn.svg' },
    { code: 'ja', name: 'Japanese', icon: 'assets/flags/jp.svg' },
    { code: 'ko', name: 'Korean', icon: 'assets/flags/kr.svg' }
  ];

  userTypes = [
    { value: 'student', label: 'Student', emoji: '👨‍🎓' },
    { value: 'teacher', label: 'Teacher', emoji: '👨‍🏫' }
  ];

  stepEmojis = ['👤', '🌍', '🔐'];

  constructor(private fb: FormBuilder, private router: Router, private userService: UserService) {
    this.registrationForm = this.fb.group({
      languages: [[], [Validators.required, Validators.minLength(1)]],
      userType: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      username: ['', Validators.required]
    });
  }

  ngOnInit(): void { }

  onSubmit() {
    if (this.registrationForm.valid) {
      const userData = this.registrationForm.value;
      console.log(userData);
      this.userService.registerUser(userData).subscribe(
        (response) => {
          // Inscription réussie, redirection vers la page de connexion
          console.log('creation réussie');
          this.router.navigate(['/login']);
        },
        (error) => {
          // Gérer les erreurs ici
          alert("Erreur lors de l'inscription.")
          console.error('Erreur lors de l\'inscription', error);
        }
      );
    }
  }

  nextStep() {
    this.currentStepSubject.next(this.currentStepSubject.value + 1);
  }

  prevStep() {
    this.currentStepSubject.next(this.currentStepSubject.value - 1);
  }

  toggleLanguage(langCode: string) {
    const languages = this.registrationForm.get('languages')!.value as string[];
    const index = languages.indexOf(langCode);
    if (index > -1) {
      languages.splice(index, 1);
    } else {
      languages.push(langCode);
    }
    this.registrationForm.patchValue({ languages });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  canProceed(step: number): Observable<boolean> {
    return this.registrationForm.valueChanges.pipe(
      startWith(null),
      map(() => {
        switch (step) {
          case 1:
            return this.registrationForm.get('languages')!.value.length > 0;
          case 2:
            return !!this.registrationForm.get('userType')!.value;
          case 3:
            return this.registrationForm.valid;
          default:
            return false;
        }
      })
    );
  }

  getStepEmoji(step: number): string {
    return this.stepEmojis[step - 1] || '📝';
  }

  getUserTypeEmoji(type: string): string {
    const userType = this.userTypes.find(t => t.value === type);
    return userType ? userType.emoji : '👤';
  }
}
