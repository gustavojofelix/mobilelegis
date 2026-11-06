import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { I18N_PIPES } from '../core/pipes';
import { PageTitle } from '../shared/page-title';

@Component({
  selector: 'app-access-data',
  imports: [FormsModule, PageTitle, ...I18N_PIPES],
  template: `
    <app-page-title [title]="'access.title' | t" icon="user" />
    <div class="container narrow">
      <form class="form-grid" (ngSubmit)="save()">
        <label class="field"><span>{{ 'access.password' | t }}</span><input class="form-control" type="password" name="pw" [(ngModel)]="pw" autocomplete="new-password" /></label>
        <label class="field"><span>{{ 'access.confirm' | t }}</span><input class="form-control" type="password" name="pw2" [(ngModel)]="pw2" autocomplete="new-password" /></label>
        @if (msg()) { <p class="span-2" [class.form-ok]="ok()" [class.form-error]="!ok()">{{ msg() | t }}</p> }
        <div class="span-2 form-actions"><span></span><button type="submit" class="btn btn-yellow btn-wide">{{ 'common.save' | t }}</button></div>
      </form>
    </div>
  `,
})
export class AccessData {
  private auth = inject(AuthService);
  protected pw = ''; protected pw2 = '';
  protected msg = signal(''); protected ok = signal(false);

  save() {
    this.ok.set(false);
    if (this.pw.length < 4) { this.msg.set('access.tooShort'); return; }
    if (this.pw !== this.pw2) { this.msg.set('access.mismatch'); return; }
    this.auth.changePassword(this.pw);
    this.pw = this.pw2 = '';
    this.ok.set(true);
    this.msg.set('access.changed');
  }
}
