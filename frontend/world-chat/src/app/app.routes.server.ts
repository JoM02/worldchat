import { RenderMode, ServerRoute } from '@angular/ssr';
import { Routes } from '@angular/router';
import { routes } from './app.routes';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
