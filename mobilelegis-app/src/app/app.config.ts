import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { DataService } from './core/data.service';
import { I18nService } from './core/i18n.service';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    // Carrega dados fictícios, línguas e traduções antes de arrancar a aplicação
    provideAppInitializer(async () => {
      inject(ThemeService); // aplica o tema antes do primeiro ecrã
      const data = inject(DataService), i18n = inject(I18nService), auth = inject(AuthService);
      await Promise.all([data.init(), i18n.init()]);
      auth.init();
    }),
  ],
};
