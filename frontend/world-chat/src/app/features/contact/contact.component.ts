import { Component, OnInit } from '@angular/core';
import { ContactService } from '../../core/services/contact.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { Router } from '@angular/router';
import { ConversationService } from '../../core/services/conversation.service';

interface ExtendedUser {
  id: string;
  username: string;
  email?: string;
  type: string;
  status: string;
  user_id_1?: string;
  user_id_2?: string;
  conversation_id?: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  contacts: any[] = [];
  contactUsers: ExtendedUser[] = [];
  errorMessage: string | null = null;

  constructor(
    private contactService: ContactService, 
    private userService: UserService,
    private router: Router,
    private conversationService: ConversationService
  ) {}

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.contactService.getAllContacts().subscribe({
      next: (data) => {
        console.log('Contacts loaded:', data);
        this.contacts = data;
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des contacts';
        console.error(err);
      }
    });
  }

  loadUsers(): void {
    const userId = localStorage.getItem('userid');
    if (typeof userId !== 'string') {
      console.error('Utilisateur non connecté');
      return;
    }

    console.log('Current user ID:', userId);
    console.log('All contacts:', this.contacts);

    this.contactUsers = []; // Clear existing contacts before loading

    this.contacts.forEach((contact) => {
      console.log('Processing contact:', contact);
      // Convert IDs to strings for comparison
      const contactUser1 = String(contact.user_id_1);
      const contactUser2 = String(contact.user_id_2);
      
      if (contactUser1 === userId) {
        console.log('Current user is sender, loading receiver:', contactUser2);
        this.userService.getUserById(contactUser2).subscribe(
          (response) => {
            console.log('Loaded receiver:', response);
            this.contactUsers.push({
              id: response.id,
              username: response.username,
              email: response.email,
              type: response.type,
              status: contact.status,
              user_id_1: contactUser1,
              user_id_2: contactUser2,
              conversation_id: contact.conversation_id
            });
            console.log('Updated contactUsers:', this.contactUsers);
          },
          (error) => {
            console.error('Erreur lors du chargement des users', error);
          }
        );
      } else if (contactUser2 === userId) {
        console.log('Current user is receiver, loading sender:', contactUser1);
        this.userService.getUserById(contactUser1).subscribe(
          (response) => {
            console.log('Loaded sender:', response);
            this.contactUsers.push({
              id: response.id,
              username: response.username,
              email: response.email,
              type: response.type,
              status: contact.status,
              user_id_1: contactUser1,
              user_id_2: contactUser2,
              conversation_id: contact.conversation_id
            });
            console.log('Updated contactUsers:', this.contactUsers);
          },
          (error) => {
            console.error('Erreur lors du chargement des users', error);
          }
        );
      } else {
        console.log('Contact does not involve current user:', contact);
      }
    });
  }

  onDeleteContact(userId: string): void {
    const meId = localStorage.getItem('userid');
    if (typeof meId !== 'string') {
      console.error('Utilisateur non connecté');
      return;
    }

    this.contactService.deleteContact(meId, userId).subscribe(
      (response) => {
        console.log('Relation supprimée avec succès :', response);
        this.contactUsers = this.contactUsers.filter(user => user.id !== userId);
      },
      (error) => {
        console.warn('Échec de la suppression dans le premier sens, tentative dans l\'autre sens');
        this.contactService.deleteContact(userId, meId).subscribe(
          (response) => {
            console.log('Relation supprimée avec succès dans le second sens :', response);
            this.contactUsers = this.contactUsers.filter(user => user.id !== userId);
          },
          (secondError) => {
            console.error('Erreur lors de la suppression du contact dans les deux sens', secondError);
          }
        );
      }
    );
  }

  onPrivateMessage(userId: string): void {
    console.log(`Starting private message with user ID: ${userId}`);
    const currentUser = localStorage.getItem('userid');
    
    if (!currentUser) {
      console.error('No current user found');
      this.errorMessage = 'Please log in to send messages';
      return;
    }

    // Find the contact to check its status and get the conversation ID
    const contact = this.contactUsers.find(user => user.id === userId);
    if (!contact || contact.status !== 'Accepted') {
      console.error('Cannot message: Contact not found or not accepted');
      this.errorMessage = 'You can only message accepted contacts';
      return;
    }

    if (!contact.conversation_id) {
      console.error('No conversation ID found for this contact');
      this.errorMessage = 'Unable to start conversation. Please try again.';
      return;
    }

    // Navigate to the chat component with the existing MP conversation ID
    this.router.navigate(['/chat', contact.conversation_id]);
  }

  getUserTypeLabel(type: string): string {
    switch(type) {
      case 'student':
        return 'Étudiant';
      case 'teacher':
        return 'Enseignant';
      default:
        return type;
    }
  }

  onAcceptContact(userId: string): void {
    const currentUser = localStorage.getItem('userid');
    if (typeof currentUser !== 'string') {
      console.error('Utilisateur non connecté');
      return;
    }

    this.contactService.modifyContactStatus(currentUser, userId, 'Accepted')
      .subscribe(
        (response) => {
          console.log(`Contact ${userId} accepté`, response);
          const contact = this.contactUsers.find(user => user.id === userId);
          if (contact) {
            contact.status = 'Accepted';
            contact.conversation_id = response.conversation_id;
          }
        },
        (error) => {
          console.error('Erreur lors de l\'acceptation du contact :', error);
        }
      );
  }

  isSender(user: ExtendedUser): boolean {
    const currentUserId = localStorage.getItem('userid');
    return user.user_id_1 === currentUserId;
  }
}