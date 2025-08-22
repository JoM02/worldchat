import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegistrationComponent } from './features/auth/registration/registration.component';
import { ChatComponent } from './features/chat/chat.component';
import { AuthGuard } from './core/guards/auth-guard.guard'; // Import AuthGuard for route protection
import { ContactComponent } from './features/contact/contact.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegistrationComponent },
  { path: 'chat/:id', component: ChatComponent, canActivate: [AuthGuard] },
  //{ path: 'chat', component: ChatComponent, canActivate: [AuthGuard] }, // Protected route
  { path: 'contacts', component: ContactComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
