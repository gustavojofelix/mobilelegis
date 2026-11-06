import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { BoService } from './bo.service';
import { RadarService } from './radar.service';

/** Carrega os dados do back office antes de entrar. */
const boInit: CanActivateFn = async () => {
  const bo = inject(BoService), radar = inject(RadarService);
  await Promise.all([bo.init(), radar.init()]);
  return true;
};
const boAuth: CanActivateFn = () => inject(BoService).admin() ? true : inject(Router).createUrlTree(['/backoffice/login']);
const boGuest: CanActivateFn = () => inject(BoService).admin() ? inject(Router).createUrlTree(['/backoffice']) : true;

export const BO_ROUTES: Routes = [
  {
    path: '', canActivate: [boInit], loadComponent: () => import('./bo-root').then(m => m.BoRoot),
    children: [
      { path: 'login', canActivate: [boGuest], loadComponent: () => import('./bo-login').then(m => m.BoLogin) },
      {
        path: '', canActivate: [boAuth], loadComponent: () => import('./bo-shell').then(m => m.BoShell),
        children: [
          { path: '', loadComponent: () => import('./bo-dashboard').then(m => m.BoDashboard) },
          { path: 'dossier/laci047', loadComponent: () => import('./bo-dossier').then(m => m.BoDossier) },
          { path: 'radar', loadComponent: () => import('./bo-radar').then(m => m.BoRadar) },
          { path: 'diplomas', loadComponent: () => import('./bo-diplomas').then(m => m.BoDiplomas) },
          { path: 'utilizadores', loadComponent: () => import('./bo-users').then(m => m.BoUsers) },
        ],
      },
    ],
  },
];
