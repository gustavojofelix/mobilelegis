import { Component, computed, inject } from '@angular/core';
import { DataService } from '../core/data.service';
import { I18N_PIPES } from '../core/pipes';
import { User } from '../core/models';

@Component({
  selector: 'bo-users',
  imports: [...I18N_PIPES],
  template: `
    <div class="bo-page-head">
      <div><h1>{{ 'bo.nav.users' | t }}</h1><p class="muted">{{ 'bo.users.subtitle' | t }}</p></div>
    </div>
    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>{{ 'personal.name' | t }}</th><th>{{ 'login.email' | t }}</th><th>{{ 'personal.plan' | t }}</th><th class="num">{{ 'bo.users.purchases' | t }}</th><th>{{ 'bo.users.created' | t }}</th></tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td><b>{{ u.name }}</b><br /><span class="small muted">{{ u.profession }} · {{ u.city }}</span></td>
                <td class="small">{{ u.email }}</td>
                <td>{{ plan(u) | t: { n: u.trialAreas.length } }}</td>
                <td class="num">{{ u.purchases.length }}</td>
                <td class="small">{{ u.createdAt | dt }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class BoUsers {
  private data = inject(DataService);
  protected users = computed<User[]>(() => {
    let local: User[] = [];
    try { local = JSON.parse(localStorage.getItem('ml.users.v2') ?? '[]'); } catch { /* ignore */ }
    return local.length ? local : this.data.seedUsers();
  });
  plan(u: User) { return u.subscription ? (u.subscription.plan === 'basic' ? 'plans.basic' : 'plans.unlimited') : 'bo.users.trial'; }
}
