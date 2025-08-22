import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { Subject, takeUntil, debounceTime, take } from 'rxjs';
import { MessageService } from '../../core/services/message.service';
import { ConversationService } from '../../core/services/conversation.service';
import { UserService, UserStatus } from '../../core/services/user.service';
import { ChatService } from '../../core/services/chat.service';
import { NewsService } from '../../core/services/news.service';
import { ContactService, Contact } from '../../core/services/contact.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { CookieService } from 'ngx-cookie-service';
import { ImageService } from '../../core/services/image.service';

interface BaseMessage {
  timestamp: Date | string;
  type: 'system' | 'message';
  id: string;
}

interface SystemMessage extends BaseMessage {
  type: 'system';
  message: string;
  username: 'System';
}

interface ChatMessage extends BaseMessage {
  type: 'message';
  conversationId?: string;
  senderId: string;
  content?: string;
  datetime?: string;
  status?: string;
  sender?: {
    id: string;
    username: string;
    email?: string;
    type?: string;
    status?: string;
    avatarColor?: string;
  };
  text?: string;
  username?: string;
  isRealtime?: boolean;
  has_image?: boolean;
  images?: Array<{
    id: string;
    path: string;
    filename: string;
  }>;
}

interface Message {
  id?: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  datetime: string;
  status: string;
  has_image?: boolean;
  images?: Array<{
    id: string;
    path: string;
    filename: string;
  }>;
  sender?: {
    id: string;
    username: string;
    email?: string;
    type?: string;
    status?: string;
    avatarColor?: string;
  };
}

interface User {
  id: string;
  username: string;
  email?: string;
  type: string;
  status: string;
  languages: string;
  ip?: string;
  creation_date?: string;
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
}

type MessageC = SystemMessage | ChatMessage;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  // State Management
  conversation: Conversation | null = null;
  conversationID: string = '';
  messages: Message[] = [];
  allMessages: MessageC[] = [];
  newMessage: string = '';
  otherUser: User | null = null;
  currentUserId: string | null = null;
  currentUsername: string | null = null;
  loading: boolean = true;
  error: string | null = null;
  typingUsers: Set<string> = new Set();
  newsArticles: any[] = [];
  showNewsModal: boolean = false;
  userColors: Map<string, string> = new Map();
  shouldScrollToBottom = true;
  showSidebar = window.innerWidth > 768;
  selectedUser: User | null = null;
  showAddContactModal: boolean = false;
  isNative: boolean = false;
  selectedImage: File | null = null;
  showImageModal = false;
  selectedModalImage: any = null;

  private typingSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private typingTimeout: any;

  // Add emoji maps for different states and actions
  private statusEmojis: { [key: string]: string } = {
    online: '🟢',
    offline: '⚫',
    away: '🟡',
    busy: '🔴',
    typing: '✍️'
  };

  private messageTypeEmojis: { [key: string]: string } = {
    system: '🔔',
    sent: '✓',
    delivered: '✓✓',
    read: '✓✓'
  };

  private languageIcons: Record<string, string> = {
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

  private languageToCountryMap: { [key: string]: string } = {
    en: 'United States',
    fr: 'France',
    es: 'Spain',
    pt: 'Portugal',
    it: 'Italy',
    de: 'Germany',
    ru: 'Russia',
    zh: 'China',
    ja: 'Japan',
    ko: 'South Korea'
  };

  getUserTypeLabel(type: string): string {
    switch (type.toLowerCase()) {
      case 'student':
        return '👨‍🎓 Student';
      case 'teacher':
        return '👨‍🏫 Teacher';
      default:
        return type;
    }
  }

  constructor(
    private route: ActivatedRoute,
    private messageService: MessageService,
    private conversationService: ConversationService,
    private userService: UserService,
    private chatService: ChatService,
    private newsService: NewsService,
    private contactService: ContactService,
    private geolocationService: GeolocationService,
    private cookieService: CookieService,
    public imageService: ImageService
  ) { }

  ngOnInit(): void {
    this.retrieveCurrentUserId();
    this.retrieveCurrentUsername();
    this.setupTypingObservable();

    this.route.params.subscribe(params => {
      const conversationId = params['id'];
      if (conversationId) {
        this.conversationID = conversationId;
        this.chatService.setUsername(this.currentUsername || 'Anonymous');
        this.loadConversation(conversationId);
      } else {
        this.error = 'No conversation ID provided';
        this.loading = false;
      }
    });

    this.showSidebar = window.innerWidth > 768;
  }

  ngOnDestroy(): void {
    if (this.conversation) {
      // Clear typing status when leaving
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.chatService.sendTypingStatus(this.conversation.id, false);
      }
      this.chatService.leaveRoom(this.conversation.id);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private retrieveCurrentUserId(): void {
    const storedId = localStorage.getItem('id');
    this.currentUserId = storedId ? storedId : null;
    if (!this.currentUserId) {
      console.error('User ID not found in localStorage');
      this.error = 'User ID not found. Please log in again.';
      this.loading = false;
    }
    console.log('Retrieved Current User ID:', this.currentUserId);
  }

  private retrieveCurrentUsername(): void {
    this.currentUsername = localStorage.getItem('username');
    if (!this.currentUsername) {
      console.error('Username not found in localStorage');
      this.error = 'Username not found. Please log in again.';
      this.loading = false;
    }
    console.log('Retrieved Current Username:', this.currentUsername);
  }

  private forceRefresh(): void {
    console.log('[ChatComponent] Forcing page refresh');
    this.loading = true;
    this.error = null;
    this.messages = [];
    this.allMessages = [];
    this.typingUsers = new Set();
    this.shouldScrollToBottom = true;
    
    if (this.conversation) {
      this.loadConversation(this.conversation.id);
    }
  }

  private loadConversation(conversationId: string): void {
    this.conversationService.getConversationById(conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversation) => {
          this.conversation = conversation;
          console.log('Conversation loaded:', this.conversation);
          console.log('Current User ID:', this.currentUserId);
          if (this.conversation) {
            console.log('Student ID:', this.conversation.student_id);
            console.log('Teacher ID:', this.conversation.teacher_id);
            this.loadMessages(conversationId);
            this.loadOtherUser();
            this.chatService.joinRoom(conversationId);
          } else {
            this.error = 'Conversation not found';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Failed to load conversation:', error);
          this.error = 'Failed to load conversation. Please try again later.';
          this.loading = false;
        }
      });
  }

  checkIfTeacherIsNative(): void {
    if (this.otherUser?.type === 'teacher') {
      const teacherIp = this.otherUser.ip;

      let conversationLanguage = "";

      this.conversationService.getConversationById(this.conversationID).subscribe((response) => {
        console.log(response)
        conversationLanguage = response.language;
        console.log(conversationLanguage);
      });

      if (teacherIp) {
        this.geolocationService.getCountryForUser(teacherIp).subscribe((response) => {
          const teacherCountry = response.country_name;
          this.isNative = this.languageToCountryMap[conversationLanguage] === teacherCountry;
        });
      } else {
        console.error('Teacher IP is undefined');
      }
    }
  }

  private loadOtherUser(): void {
    if (!this.conversation || !this.currentUserId) {
      console.error('Conversation or currentUserId is not set');
      return;
    }

    const userType = localStorage.getItem('type');
    console.log('Current User Type:', userType);

    let otherUserId: string;
    if (userType === 'student') {
      console.log('Current user is a student');
      otherUserId = this.conversation.teacher_id;
    } else if (userType === 'teacher') {
      console.log('Current user is a teacher');
      otherUserId = this.conversation.student_id;
    } else {
      console.error('Invalid user type:', userType);
      return;
    }

    console.log('Other User ID:', otherUserId);

    // Subscribe to user status updates
    this.userService.userStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statuses => {
        if (this.otherUser) {
          const newStatus = statuses.get(this.otherUser.id) ?? 'offline';
          if (this.otherUser.status !== newStatus) {
            this.otherUser = { ...this.otherUser, status: newStatus };
          }
        }
      });

    // First get the initial status
    this.userService.userStatus$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe((statuses: Map<string, UserStatus>) => {
      // Then load the user with the current status
      this.userService.getUserById(otherUserId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            this.otherUser = {
              ...user,
              avatarColor: this.getUserColor(user.id),
              status: statuses.get(user.id) ?? 'offline',
              languages: user.languages
            };
            console.log('Other User loaded:', this.otherUser);
            this.checkIfTeacherIsNative();
          },
          error: (error) => {
            console.error('Failed to load other user:', error);
            this.error = 'Failed to load other user information';
          },
          complete: () => {
            console.log('Other User loaded');
          }
        });
    });
  }

  private loadMessages(conversationId: string): void {
    this.messageService.getAllMessagesByConversationId(conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages: Message[]) => {
          this.messages = messages;
          const senderIds = new Set(messages.map(msg => msg.sender_id));
          this.loadMessageSenders(Array.from(senderIds));
          this.updateAllMessages();
          this.setupRealtimeChat(conversationId);
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load messages:', error);
          this.error = 'Failed to load messages. Please try again later.';
          this.loading = false;
        }
      });
  }

  private loadMessageSenders(senderIds: string[]): void {
    senderIds.forEach(senderId => {
      // For current user, use the stored color from auth
      if (senderId === this.currentUserId) {
        const storedColor = localStorage.getItem(`avatar_color_${senderId}`);
        if (storedColor) {
          this.userColors.set(senderId, storedColor);
        }
      } else if (!this.userColors.has(senderId)) {
        // For other users, generate a color if not already set
        const color = this.generateRandomColor(senderId);
        this.userColors.set(senderId, color);
      }

      this.userService.getUserById(senderId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            this.messages = this.messages.map(msg => {
              if (msg.sender_id === user.id) {
                return {
                  ...msg,
                  sender: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    type: user.type,
                    status: user.status,
                    avatarColor: this.userColors.get(user.id)
                  }
                };
              }
              return msg;
            });
            this.updateAllMessages();
          },
          error: (error) => {
            console.error(`Failed to load user ${senderId}:`, error);
          }
        });
    });
  }

  private setupRealtimeChat(conversationId: string): void {
    this.chatService.joinRoom(conversationId);

    // Listen for messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('Received websocket message:', data);
        if (!this.allMessages.some(msg => msg.id === data.id)) {
          if (data.type === 'system') {
            const systemMessage: SystemMessage = {
              type: 'system',
              id: data.id || `system-${Date.now()}`,
              message: data.message,
              username: 'System',
              timestamp: data.timestamp || new Date()
            };
            this.allMessages = [...this.allMessages, systemMessage];
          } else {
            // For chat messages, use the user service to get user info
            const senderId = data.sender;
            if (senderId && senderId !== 'unknown') {
              // Get user info from user service
              this.userService.getUserById(senderId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (user) => {
                    const chatMessage = this.convertToChatMessage({
                      id: data.id || `msg-${Date.now()}`,
                      conversation_id: this.conversationID,
                      sender_id: senderId,
                      content: data.text,
                      datetime: data.timestamp || new Date().toISOString(),
                      status: 'sent',
                      has_image: data.images?.length > 0,
                      images: data.images?.map((img: any) => ({
                        id: img.id || `img-${Date.now()}`,
                        path: img.path,
                        filename: img.filename || 'image.jpg'
                      })) || [],
                      sender: {
                        ...user,
                        avatarColor: this.getUserColor(senderId)
                      }
                    });
                    chatMessage.isRealtime = true; // Mark as realtime message
                    console.log('Converted websocket message:', chatMessage);
                    this.allMessages = [...this.allMessages, chatMessage];
                    this.shouldScrollToBottom = true;
                  },
                  error: (error) => {
                    console.error('Failed to fetch user info for message:', error);
                    // Fallback to basic message if user fetch fails
                    const chatMessage = this.convertToChatMessage({
                      id: data.id || `msg-${Date.now()}`,
                      conversation_id: this.conversationID,
                      sender_id: senderId,
                      content: data.text,
                      datetime: data.timestamp || new Date().toISOString(),
                      status: 'sent',
                      has_image: data.images?.length > 0,
                      images: data.images?.map((img: any) => ({
                        id: img.id || `img-${Date.now()}`,
                        path: img.path,
                        filename: img.filename || 'image.jpg'
                      })) || [],
                      sender: {
                        id: senderId,
                        username: data.username || 'Unknown',
                        avatarColor: this.getUserColor(senderId)
                      }
                    });
                    chatMessage.isRealtime = true; // Mark as realtime message
                    console.log('Converted websocket message (fallback):', chatMessage);
                    this.allMessages = [...this.allMessages, chatMessage];
                    this.shouldScrollToBottom = true;
                  }
                });
            } else {
              // Fallback for unknown sender
              const chatMessage = this.convertToChatMessage({
                id: data.id || `msg-${Date.now()}`,
                conversation_id: this.conversationID,
                sender_id: senderId || 'unknown',
                content: data.text,
                datetime: data.timestamp || new Date().toISOString(),
                status: 'sent',
                has_image: data.images?.length > 0,
                images: data.images?.map((img: any) => ({
                  id: img.id || `img-${Date.now()}`,
                  path: img.path,
                  filename: img.filename || 'image.jpg'
                })) || [],
                sender: {
                  id: senderId || 'unknown',
                  username: data.username || 'Unknown',
                  avatarColor: this.getUserColor(senderId)
                }
              });
              chatMessage.isRealtime = true; // Mark as realtime message
              console.log('Converted websocket message (unknown sender):', chatMessage);
              this.allMessages = [...this.allMessages, chatMessage];
            }
          }
          this.shouldScrollToBottom = true;
        }
      });

    // Listen for typing status
    this.chatService.typingUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((typingUsers) => {
        this.typingUsers = typingUsers;
      });
  }

  onTyping(event?: Event): void {
    if (!this.conversation) return;

    // Clear any existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Send typing status only if not already typing
    if (!this.typingUsers.has(this.currentUsername || '')) {
      this.chatService.sendTypingStatus(this.conversation.id, true);
    }

    // Set a timeout to clear the typing status after 2 seconds of no typing
    this.typingTimeout = setTimeout(() => {
      if (this.conversation) {  
        this.chatService.sendTypingStatus(this.conversation.id, false);
      }
    }, 2000);

    // Adjust textarea height if event is present (meaning it was triggered by input)
    if (event) {
      this.adjustTextareaHeight();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];
    }
  }

  sendMessage(): void {
    if ((!this.newMessage.trim() && !this.selectedImage) || !this.conversation || !this.currentUserId) return;

    // Clear typing status when sending a message
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.chatService.sendTypingStatus(this.conversation.id, false);
    }

    const messageData = {
      conversation_id: this.conversation.id,
      sender_id: this.currentUserId,
      content: this.newMessage.trim(),
      datetime: new Date().toISOString(),
      status: 'sent',
      has_image: !!this.selectedImage,
      sender: {
        id: this.currentUserId,
        username: this.currentUsername || 'Unknown',
        avatarColor: this.userColors.get(this.currentUserId)
      }
    };

    this.messageService.createMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (message) => {
          // Upload image if present
          if (this.selectedImage && message.id) {
            try {
              const imageResult = await this.imageService.uploadImage(this.selectedImage, message.id).toPromise();
              message.images = [imageResult];
              message.has_image = true;
            } catch (error) {
              console.error('Failed to upload image:', error);
              this.error = 'Failed to upload image. Please try again.';
            }
          }

          // Emit the message through socket
          this.chatService.sendMessage(
            this.conversation!.id,
            this.newMessage.trim(),
            message.images
          );

          this.newMessage = '';
          this.selectedImage = null;
          if (this.messageInput) {
            this.messageInput.nativeElement.style.height = 'auto';
          }
        },
        error: (error) => {
          console.error('Failed to send message:', error);
          this.error = 'Failed to send message. Please try again.';
        }
      });
  }

  private setupTypingObservable(): void {
    this.typingSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => {
      if (this.conversation) {
        this.chatService.sendTypingStatus(this.conversation.id, true);
      }
    });
  }

  private adjustTextareaHeight(): void {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  private updateAllMessages(): void {
    this.allMessages = this.messages.map(msg => this.convertToChatMessage(msg));
    this.shouldScrollToBottom = true;
  }

  private convertToChatMessage(message: Message): ChatMessage {
    const avatarColor = this.getUserColor(message.sender?.id || message.sender_id);
    return {
      type: 'message',
      id: message.id || `msg-${Date.now()}`,
      senderId: message.sender_id,
      content: message.content,
      datetime: message.datetime,
      timestamp: new Date(message.datetime),
      status: message.status,
      sender: {
        id: message.sender?.id || message.sender_id,
        username: message.sender?.username || 'Unknown User',
        status: message.sender?.status,
        avatarColor: avatarColor
      },
      username: message.sender?.username || 'Unknown User',
      isRealtime: false,
      has_image: message.has_image || false,
      images: message.images || []
    };
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  getTypingUsersText(): string {
    const typingUsersArray = Array.from(this.typingUsers);
    if (typingUsersArray.length === 0) return '';
    if (typingUsersArray.length === 1) return typingUsersArray[0];
    if (typingUsersArray.length === 2) return `${typingUsersArray[0]} and ${typingUsersArray[1]}`;
    return `${typingUsersArray[0]}, ${typingUsersArray[1]}, and ${typingUsersArray.length - 2} others`;
  }

  trackByFn(index: number, message: MessageC): string {
    return message.id;
  }

  getInitials(name: string = ''): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private generateRandomColor(seed: string | number | undefined): string {
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

    if (!seed) return colors[0];

    // Convert seed to string if it's a number
    const seedStr = seed.toString();

    // Use the seed to generate a consistent index
    const total = seedStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[total % colors.length];
  }

  getUserColor(userId: string | undefined): string {
    if (!userId) return this.generateRandomColor('default');

    // For current user, return the stored color from auth
    if (userId === this.currentUserId) {
      const storedColor = this.cookieService.get('userColor');
      if (storedColor) return storedColor;
    }

    // For other users, use or generate a color
    if (!this.userColors.has(userId)) {
      const color = this.generateRandomColor(userId);
      this.userColors.set(userId, color);
    }
    return this.userColors.get(userId) || this.generateRandomColor('default');
  }

  openNewsModal(): void {
    if (!this.conversation?.language) {
      console.error('Conversation language is undefined');
      return;
    }

    const country = 'us'; // Limited to US news due to API restrictions
    this.newsService.getTopHeadlines(country)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.newsArticles = data.articles || [];
          this.showNewsModal = true;
        },
        error: (error) => {
          console.error('Failed to fetch news:', error);
          this.error = 'Failed to load conversation topics';
        },
      });
  }

  closeNewsModal(): void {
    this.showNewsModal = false;
  }

  onModalClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal')) {
      this.closeNewsModal();
    }
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  onUserClick(user: any): void {
    // Don't show modal for self-clicks
    if (user.id === this.currentUserId || user.username === this.currentUsername) {
      return;
    }

    // Get the user type from the conversation if available
    let userType = user.type;
    if (this.conversation && !userType) {
      if (user.id === this.conversation.student_id) {
        userType = 'student';
      } else if (user.id === this.conversation.teacher_id) {
        userType = 'teacher';
      }
    }

    this.selectedUser = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      status: user.status || 'offline',
      type: userType || localStorage.getItem('type') || 'student',
      avatarColor: user.avatarColor || this.getUserColor(user.id),
      languages: user.languages || ''
    };
  }

  closeUserModal(): void {
    this.selectedUser = null;
  }

  addContact(user: User): void {
    console.log('[ChatComponent] Adding contact:', user);
    if (!user || !user.id) {
      console.error('[ChatComponent] Invalid user data for adding contact');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[ChatComponent] No authentication token found');
      return;
    }

    const contactData = { 
      user_id_1: this.currentUserId!, 
      user_id_2: user.id,
      token: token
    };

    this.contactService.createContact(contactData).subscribe({
      next: (contact: Contact) => {
        console.log('[ChatComponent] Contact added successfully:', contact);
        this.closeUserModal();
        this.closeAddContactModal();
      },
      error: (error: { status?: number }) => {
        console.error('[ChatComponent] Error adding contact:', error);
        if (error.status === 401) {
          console.error('[ChatComponent] Unauthorized - please log in again');
        }
      }
    });
  }

  blockUser(user: User): void {
    console.log('Blocking user:', user);
    // TODO: Implement user blocking functionality
    this.closeUserModal();
  }

  reportUser(user: User): void {
    console.log('Reporting user:', user);
    // TODO: Implement user reporting functionality
    this.closeUserModal();
  }

  getMemberSince(user: User): string {
    // This is a placeholder - you should get the actual member since date from your user data
    return new Date().toLocaleDateString();
  }

  isDuplicateSystemMessage(message: any, index: number): boolean {
    if (message.type !== 'system' || index === 0) return false;

    const previousMessage = this.allMessages[index - 1];
    return (
      previousMessage.type === 'system' &&
      previousMessage.message === message.message &&
      Math.abs(new Date(previousMessage.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
    );
  }

  onSidebarStateChange(isOpen: boolean): void {
    this.showSidebar = isOpen;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.showSidebar = true;
    }
  }

  getStatusColor(status: string): string {
    return this.userService.getStatusColor(status as 'online' | 'offline' | 'busy' | 'away');
  }

  getStatusText(status: string): string {
    // Convert first letter to uppercase and handle special cases
    switch (status?.toLowerCase()) {
      case 'busy':
      case 'Busy':
        return 'In Conversation';
      case 'active':
      case 'Active':
        return 'Online';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  openAddContactModal(otherUser: User | null): void {
    console.log('[ChatComponent] Opening add contact modal for user:', otherUser);
    if (otherUser) {
      this.selectedUser = otherUser;
      this.showAddContactModal = true;
    }
  }

  closeAddContactModal(): void {
    console.log('[ChatComponent] Closing add contact modal');
    this.showAddContactModal = false;
    this.selectedUser = null;
  }

  openImageModal(image: any): void {
    if (image && image.path) {
      this.selectedModalImage = {
        ...image,
        displayUrl: this.imageService.getImageUrl(image.path)
      };
      this.showImageModal = true;
    }
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedModalImage = null;
  }

  getStatusEmoji(status: string): string {
    return this.statusEmojis[status.toLowerCase()] || '⚫';
  }

  getMessageTypeEmoji(type: string): string {
    return this.messageTypeEmojis[type.toLowerCase()] || '';
  }

  getLanguageIcon(code: string): string {
    return this.languageIcons[code] || 'assets/flags/default.svg';
  }
}
