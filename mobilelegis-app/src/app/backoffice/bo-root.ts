import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Raiz do back office: carrega a folha de estilos própria (só quando se entra no back office). */
@Component({
  selector: 'bo-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styleUrl: './bo.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BoRoot {}
