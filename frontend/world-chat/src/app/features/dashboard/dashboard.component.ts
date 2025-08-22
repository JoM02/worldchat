import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ConversationService } from '../../core/services/conversation.service';
import { UserService } from '../../core/services/user.service';
import { MatchingService } from '../../core/services/matching.service';
import { finalize, Subject, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CookieService } from 'ngx-cookie-service';

interface Language {
  code: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  type: string;
  languages?: string;
  status?: string;
  avatarColor?: string;
}

interface Conversation {
  id: string;
  student_id: string;
  teacher_id: string;
  language: string;
  status: string;
  student?: User;
  teacher?: User;
  lastMessage?: { timestamp: number };
  lastMessageTime?: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(10px)' }),
          stagger('50ms', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  loading = true;
  chatStarting = false;
  waiting = false;
  error: string | null = null;
  selectedLanguage = '';
  currentUserId: string | null = null;
  currentUsername: string | null = null;
  currentUserType: string | null = null;
  languages: Language[] = [];
  userAvatarColor: string;
  private destroy$ = new Subject<void>();
  matchingStatus: string = '';
  matchingProgress: number = 0;
  private progressInterval: any;
  activeTab: 'random' | 'private' = 'random';

  constructor(
    private router: Router,
    private conversationService: ConversationService,
    private userService: UserService,
    private matchingService: MatchingService,
    private cookieService: CookieService
  ) {
    this.userAvatarColor = '';
  }

  ngOnInit(): void {
    this.initializeUser();
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopMatchingProgress();
    this.matchingService.disconnect();
  }

  private initializeUser(): void {
    this.currentUserId = localStorage.getItem('id');
    this.currentUsername = localStorage.getItem('username');
    this.currentUserType = localStorage.getItem('type');

    if (!this.currentUserId || !this.currentUserType) {
      this.error = 'Session expired. Please log in again.';
      this.router.navigate(['/auth/login']);
      return;
    }

    // Get the color that was set during authentication
    // const storedColor = localStorage.getItem(`avatar_color_${this.currentUserId}`);
    // if (!storedColor) {
    //   console.error('Avatar color not found for user');
    //   this.error = 'User color not found. Please log in again.';
    //   return;
    // }
    const storedColor = this.cookieService.get('userColor');
    this.userAvatarColor = storedColor || '#43B581'; // Défaut à "#43B581" si le cookie est manquant
    console.log('[HeaderComponent] User avatar color:', this.userAvatarColor);

    this.loadUserLanguages();
  }

  private loadUserLanguages(): void {
    if (!this.currentUserId) return;

    this.userService.getUserById(this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          if (user?.languages) {
            this.languages = user.languages.split(',').map((lang: string) => ({
              code: lang,
              name: this.getLanguageName(lang)
            }));
          }
        },
        error: (error: Error) => {
          console.error('Error loading languages:', error);
          this.error = 'Failed to load language preferences';
        }
      });
  }

  loadConversations(): void {
    if (!this.currentUserId) return;

    this.conversationService.getAllConversationsByUserId(this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations: Conversation[]) => {
          this.conversations = conversations.map(conv => {
            const studentColor = conv.student_id === this.currentUserId
              ? localStorage.getItem(`avatar_color_${conv.student_id}`) || this.generateRandomColor()
              : this.generateRandomColor();
            const teacherColor = conv.teacher_id === this.currentUserId
              ? localStorage.getItem(`avatar_color_${conv.teacher_id}`) || this.generateRandomColor()
              : this.generateRandomColor();

            return {
              ...conv,
              student: conv.student ? { ...conv.student, avatarColor: studentColor } : undefined,
              teacher: conv.teacher ? { ...conv.teacher, avatarColor: teacherColor } : undefined
            };
          });
          this.loading = false;
        },
        error: (error: Error) => {
          console.error('Error loading conversations:', error);
          this.error = 'Failed to load conversations';
          this.loading = false;
        }
      });
  }

  startNewChat(): void {
    if (!this.selectedLanguage || this.chatStarting || !this.currentUserId || !this.currentUserType) {
      return;
    }

    this.chatStarting = true;
    this.waiting = true;
    this.error = null;
    this.startMatchingProgress();

    const payload = {
      userId: this.currentUserId,
      language: this.selectedLanguage,
      userType: this.currentUserType
    };

    this.matchingService.startChatWithTimeout(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.chatStarting = false;
          this.waiting = false;
          this.stopMatchingProgress();
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response?.conversation?.id) {
            this.loadConversations();
            this.router.navigate(['/chat', response.conversation.id]);
          } else {
            this.error = 'Invalid server response';
          }
        },
        error: (error: any) => {
          console.error('Error starting chat:', error);
          if (error.existingConversation) {
            // If there's an existing conversation, navigate to it
            this.router.navigate(['/chat', error.existingConversation.id]);
          } else {
            this.error = typeof error === 'string' ? error : error?.message || 'Failed to start chat';
          }
        }
      });
  }

  getOtherUser(conversation: Conversation): User | undefined {
    if (!this.currentUserId) return undefined;
    return conversation.student_id === this.currentUserId
      ? conversation.teacher
      : conversation.student;
  }

  getInitials(username: string): string {
    if (!username) return '';
    return username
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  private generateRandomColor(): string {
    const colors = [
      '#7289DA', // Discord Blurple
      '#43B581', // Discord Green
      '#FAA61A', // Discord Yellow
      '#F04747', // Discord Red
      '#593695', // Discord Purple
      '#747F8D', // Discord Grey
      '#2C2F33', // Discord Dark
      '#99AAB5', // Discord Light
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getLanguageName(code: string): string {
    const languageMap: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean'
    };
    return languageMap[code] || code;
  }

  getLanguageIcon(code: string): string {
    const iconMap: Record<string, string> = {
      en: 'assets/flags/gb.svg',
      fr: 'assets/flags/fr.svg',
      es: 'assets/flags/es.svg',
      de: 'assets/flags/de.svg',
      it: 'assets/flags/it.svg',
      pt: 'assets/flags/pt.svg',
      ru: 'assets/flags/ru.svg',
      zh: 'assets/flags/cn.svg',
      ja: 'assets/flags/jp.svg',
      ko: 'assets/flags/kr.svg'
    };
    return iconMap[code] || 'assets/flags/default.svg';
  }

  deleteConversation(conversationId: string): void {
    this.conversationService.deleteConversation(conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove the conversation from the local list
          this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
          this.error = null;
        },
        error: (error: Error) => {
          console.error('Error deleting conversation:', error);
          this.error = 'Failed to delete conversation';
        }
      });
  }

  private startMatchingProgress(): void {
    this.matchingProgress = 0;
    this.matchingStatus = 'Initiating connection...';

    this.progressInterval = setInterval(() => {
      if (this.matchingProgress < 90) {
        this.matchingProgress += 2;

        if (this.matchingProgress < 30) {
          this.matchingStatus = 'Searching for available partners...';
        } else if (this.matchingProgress < 60) {
          this.matchingStatus = 'Looking for the best match...';
        } else {
          this.matchingStatus = 'Almost there...';
        }
      }
    }, 500);
  }

  private stopMatchingProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.matchingProgress = 0;
    this.matchingStatus = '';
  }

  getStatusColor(status: string | undefined): string {
    if (!status) return '#747f8d'; // Default gray for undefined status
    return this.userService.getStatusColor(status as 'online' | 'offline' | 'busy' | 'away');
  }

  getLastMessageTime(conversation: Conversation): string {
    if (!conversation.lastMessage?.timestamp) return '';
    return new Date(conversation.lastMessage.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  getTotalChatsCount(): number {
    return this.conversations.length;
  }

  getRandomChatsCount(): number {
    return this.getRandomChatsList().length;
  }

  getPrivateChatsCount(): number {
    return this.getPrivateChatsList().length;
  }

  getRandomChatsList(): Conversation[] {
    return this.conversations.filter(conv => conv.status === 'random');
  }

  getPrivateChatsList(): Conversation[] {
    return this.conversations.filter(conv => conv.status === 'private');
  }

  getTopLanguages(): { code: string; name: string; count: number; percentage: number }[] {
    // Count conversations per language
    const langCount = this.conversations.reduce((acc, conv) => {
      acc[conv.language] = (acc[conv.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort
    const sortedLangs = Object.entries(langCount)
      .map(([code, count]) => ({
        code,
        name: this.getLanguageName(code),
        count,
        percentage: (count / this.conversations.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 languages

    return sortedLangs;
  }

  goToContacts(): void {
    this.router.navigate(['/contacts'], {
      state: {
        userId: this.currentUserId,
        username: this.currentUsername,
        userType: this.currentUserType
      }
    });
  }
}