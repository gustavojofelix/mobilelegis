import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Shell } from './shell';

const authGuard: CanActivateFn = () =>
  inject(AuthService).user() ? true : inject(Router).createUrlTree(['/login']);

const guestGuard: CanActivateFn = () =>
  inject(AuthService).user() ? inject(Router).createUrlTree(['/']) : true;

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/login').then(m => m.Login) },
  { path: 'registo', canActivate: [guestGuard], loadComponent: () => import('./pages/register').then(m => m.Register) },
  { path: 'recuperar', canActivate: [guestGuard], loadComponent: () => import('./pages/recover').then(m => m.Recover) },
  { path: 'backoffice', loadChildren: () => import('./backoffice/bo.routes').then(m => m.BO_ROUTES) },
  {
    path: '', component: Shell, canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/home').then(m => m.Home) },
      { path: 'area/:id', loadComponent: () => import('./pages/area').then(m => m.AreaView) },
      { path: 'consultor', loadComponent: () => import('./pages/consultant').then(m => m.Consultant) },
      { path: 'jurisprudencia', loadComponent: () => import('./pages/jurisprudence').then(m => m.Jurisprudence) },
      { path: 'jurisprudencia/:id', loadComponent: () => import('./pages/jurisprudence').then(m => m.CaseView) },
      { path: 'minutas', loadComponent: () => import('./pages/templates').then(m => m.Templates) },
      { path: 'minutas/:id', loadComponent: () => import('./pages/templates').then(m => m.TemplateView) },
      { path: 'novidades', loadComponent: () => import('./pages/news').then(m => m.News) },
      { path: 'pesquisa', loadComponent: () => import('./pages/search').then(m => m.Search) },
      { path: 'diploma/:id', loadComponent: () => import('./pages/diploma').then(m => m.DiplomaView) },
      { path: 'subscricoes', loadComponent: () => import('./pages/plans').then(m => m.Plans) },
      { path: 'carrinho', loadComponent: () => import('./pages/cart').then(m => m.Cart) },
      { path: 'favoritos', loadComponent: () => import('./pages/favorites').then(m => m.Favorites) },
      { path: 'dados-pessoais', loadComponent: () => import('./pages/personal-data').then(m => m.PersonalData) },
      { path: 'dados-acesso', loadComponent: () => import('./pages/access-data').then(m => m.AccessData) },
      { path: 'info/:page', loadComponent: () => import('./pages/info').then(m => m.Info) },
    ],
  },
  { path: '**', redirectTo: '' },
];
